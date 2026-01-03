import { Cause, Effect, FiberRef, Option, Scope } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { AnyModuleShape, ModuleImpl } from '../module.js'
import { make as makeBoundApi } from '../BoundApiRuntime.js'
import * as TaskRunner from '../TaskRunner.js'
import { closeProgramScope } from './ProgramRunner.closeScope.js'
import { BootError, MainError, type ProgramIdentity } from './ProgramRunner.errors.js'
import { reportErrorIfEnabled, setExitCodeIfEnabled, setFailureExitCodeIfEnabled } from './ProgramRunner.exitCode.js'
import { installGracefulShutdownHandlers } from './ProgramRunner.signals.js'
import type { ProgramRunContext } from './ProgramRunner.context.js'
import { makeProgramRunnerKernel } from './ProgramRunner.kernel.js'
import { resolveProgramRunnerOptions } from './ProgramRunner.options.js'

export type RuntimeFactory = (
  rootImpl: ModuleImpl<any, AnyModuleShape, any>,
  options?: unknown,
) => ManagedRuntime.ManagedRuntime<any, never>

export const openProgram = <Sh extends AnyModuleShape>(
  makeRuntime: RuntimeFactory,
  rootImpl: ModuleImpl<any, Sh, any>,
  options?: unknown,
): Effect.Effect<ProgramRunContext<Sh>, unknown, Scope.Scope> =>
  Effect.gen(function* () {
    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn) {
      return yield* Effect.dieMessage(
        '[Logix] Runtime.openProgram/runProgram is not allowed inside a synchronous StateTransaction body',
      )
    }

    const runnerOptions = resolveProgramRunnerOptions(options)
    const kernel = yield* makeProgramRunnerKernel(makeRuntime, rootImpl, options)

    // Bind ctx.scope disposal to the outer scope (openProgram is scope-bound).
    yield* Effect.addFinalizer(() =>
      kernel.close({
        timeoutMs: runnerOptions.closeScopeTimeout,
        onError: (options as any)?.onError,
      }),
    )

    // Node-only: signals trigger graceful shutdown (closing ctx.scope).
    yield* kernel.installSignals(runnerOptions.handleSignals)

    // boot: touch the program module tag to ensure instantiation and logics/processes start.
    const moduleRuntime = yield* Effect.tryPromise({
      try: () => kernel.runtime.runPromise(rootImpl.module as any),
      catch: (error) => new BootError(kernel.identity, error),
    })

    kernel.setInstanceId((moduleRuntime as any).instanceId)
    return kernel.toContext(moduleRuntime)
  })

export const runProgram = async <Sh extends AnyModuleShape, Args, A, E, R>(
  makeRuntime: RuntimeFactory,
  rootImpl: ModuleImpl<any, Sh, any>,
  main: (ctx: ProgramRunContext<Sh>, args: Args) => Effect.Effect<A, E, R>,
  options?: unknown,
): Promise<A> => {
  if (TaskRunner.isInSyncTransaction()) {
    throw new Error('[Logix] Runtime.openProgram/runProgram is not allowed inside a synchronous StateTransaction body')
  }

  const runnerOptions = resolveProgramRunnerOptions<Args>(options)
  const identity: ProgramIdentity = {
    moduleId: String(rootImpl.module.id),
    instanceId: 'unknown',
  }

  const scope = Effect.runSync(Scope.make())
  const runtime = makeRuntime(rootImpl as unknown as ModuleImpl<any, AnyModuleShape, any>, options)

  let ctx:
    | (ProgramRunContext<Sh> & {
        readonly module: { readonly instanceId: string }
      })
    | undefined
  let mainError: unknown | undefined
  let closeError: unknown | undefined
  let result:
    | { readonly _tag: 'success'; readonly value: A }
    | { readonly _tag: 'failure'; readonly error: unknown }
    | undefined

  try {
    // Runtime resource disposal: bind runtime.dispose to ctx.scope.
    Effect.runSync(Scope.addFinalizer(scope, Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)))

    // Node-only: signals trigger graceful shutdown (closing ctx.scope).
    if (runnerOptions.handleSignals) {
      Effect.runSync(
        installGracefulShutdownHandlers({
          scope,
          enabled: true,
        }),
      )
    }

    // boot: touch the program module tag to ensure instantiation and logics/processes start.
    let moduleRuntime: any
    try {
      moduleRuntime = await runtime.runPromise(rootImpl.module as any)
    } catch (error) {
      setFailureExitCodeIfEnabled(runnerOptions.exitCode)
      reportErrorIfEnabled(runnerOptions.exitCode && runnerOptions.reportError, error)
      result = {
        _tag: 'failure',
        error: new BootError(identity, error),
      }
    }

    if (result?._tag !== 'failure') {
      identity.instanceId = String(moduleRuntime.instanceId ?? 'unknown')

      ctx = {
        scope,
        runtime,
        module: moduleRuntime,
        $: makeBoundApi(rootImpl.module.shape as any, moduleRuntime as any) as any,
      } satisfies ProgramRunContext<Sh> as any
    }

    if (ctx) {
      try {
        const value = (await ctx.runtime.runPromise(main(ctx, runnerOptions.args as Args) as any)) as A
        setExitCodeIfEnabled(runnerOptions.exitCode, value)
        result = { _tag: 'success', value }
      } catch (error) {
        mainError = error
        setFailureExitCodeIfEnabled(runnerOptions.exitCode)
        reportErrorIfEnabled(runnerOptions.exitCode && runnerOptions.reportError, error)
        result = { _tag: 'failure', error: new MainError(identity, error) }
      }
    }
  } finally {
    const exit = await Effect.runPromiseExit(
      closeProgramScope({
        scope,
        timeoutMs: runnerOptions.closeScopeTimeout,
        identity,
        onError: (options as any)?.onError,
      }),
    )

    if (exit._tag === 'Failure') {
      const failureOpt = Cause.failureOption(exit.cause)
      if (Option.isSome(failureOpt)) {
        const error: any = failureOpt.value
        if (mainError !== undefined && error && typeof error === 'object') {
          error.mainError = mainError
        }
        closeError = error
      } else {
        const defectOpt = Cause.dieOption(exit.cause)
        if (Option.isSome(defectOpt) && defectOpt.value instanceof Error) {
          const error: any = defectOpt.value
          if (mainError !== undefined && error && typeof error === 'object') {
            error.mainError = mainError
          }
          closeError = error
        } else {
          closeError = new Error(String(exit.cause))
        }
      }
    }
  }

  if (closeError !== undefined) {
    setFailureExitCodeIfEnabled(runnerOptions.exitCode)
    reportErrorIfEnabled(runnerOptions.exitCode && runnerOptions.reportError, closeError)
    throw closeError
  }

  if (!result) {
    setFailureExitCodeIfEnabled(runnerOptions.exitCode)
    throw new Error('[Logix] ProgramRunner.runProgram: missing result')
  }

  if (result._tag === 'failure') {
    throw result.error
  }

  return result.value
}
