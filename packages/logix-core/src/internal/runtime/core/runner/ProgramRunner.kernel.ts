import { Cause, Effect, Exit, Scope } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../module.js'
import { make as makeBoundApi } from '../BoundApiRuntime.js'
import { closeProgramScope } from './ProgramRunner.closeScope.js'
import { DisposeError, DisposeTimeoutError, type ProgramIdentity } from './ProgramRunner.errors.js'
import { installGracefulShutdownHandlers } from './ProgramRunner.signals.js'
import type { ProgramRunContext } from './ProgramRunner.context.js'

export type RuntimeFactory = (
  rootBlueprint: ProgramRuntimeBlueprint<any, AnyModuleShape, any>,
  options?: unknown,
) => ManagedRuntime.ManagedRuntime<any, never>

export interface ProgramRunnerKernel<Sh extends AnyModuleShape> {
  readonly scope: Scope.Closeable
  readonly runtime: ManagedRuntime.ManagedRuntime<any, never>
  readonly identity: ProgramIdentity
  readonly installSignals: (enabled: boolean) => Effect.Effect<void>
  readonly close: (params: {
    readonly timeoutMs: number
    readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void, never, never>
  }) => Effect.Effect<void, never, never>
  readonly setInstanceId: (value: unknown) => void
  readonly toContext: (moduleRuntime: unknown) => ProgramRunContext<Sh>
}

export const makeProgramRunnerKernel = <Sh extends AnyModuleShape>(
  makeRuntime: RuntimeFactory,
  rootBlueprint: ProgramRuntimeBlueprint<any, Sh, any>,
  options?: unknown,
): Effect.Effect<ProgramRunnerKernel<Sh>> =>
  Effect.gen(function* () {
    const identity: ProgramIdentity = {
      moduleId: String(rootBlueprint.module.id),
      instanceId: 'unknown',
    }

    const scope = yield* Scope.make()
    const runtime = makeRuntime(rootBlueprint as unknown as ProgramRuntimeBlueprint<any, AnyModuleShape, any>, options)

    const setInstanceId = (value: unknown) => {
      identity.instanceId = typeof value === 'string' && value.length > 0 ? value : String(value ?? 'unknown')
    }

    const close = (params: {
      readonly timeoutMs: number
      readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void, never, never>
    }) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          closeProgramScope({
            scope,
            timeoutMs: params.timeoutMs,
            identity,
            onError: params.onError,
          }),
        )

        if (Exit.isSuccess(exit)) {
          const disposeResult = yield* Effect.promise<
            | { readonly _tag: 'Success' }
            | { readonly _tag: 'Failure'; readonly error: unknown }
            | { readonly _tag: 'Timeout' }
          >(() =>
            new Promise((resolve) => {
              const timer = setTimeout(() => resolve({ _tag: 'Timeout' as const }), params.timeoutMs)
              void runtime.dispose().then(
                () => {
                  clearTimeout(timer)
                  resolve({ _tag: 'Success' as const })
                },
                (error) => {
                  clearTimeout(timer)
                  resolve({ _tag: 'Failure' as const, error })
                },
              )
            }),
          )

          if (disposeResult._tag === 'Timeout') {
            return yield* Effect.die(
              new DisposeTimeoutError(identity, {
                timeoutMs: params.timeoutMs,
                elapsedMs: params.timeoutMs,
              }),
            )
          }

          if (disposeResult._tag === 'Failure') {
            return yield* Effect.die(new DisposeError(identity, Cause.die(disposeResult.error)))
          }

          return
        }

        void runtime.dispose()
        return yield* Effect.failCause(exit.cause)
      }) as Effect.Effect<void, never, never>

    const installSignals = (enabled: boolean) => installGracefulShutdownHandlers({ scope, enabled })

    const toContext = (moduleRuntime: unknown) =>
      ({
        scope,
        runtime,
        module: moduleRuntime as any,
        $: makeBoundApi(rootBlueprint.module.shape as any, moduleRuntime as any) as any,
      }) satisfies ProgramRunContext<Sh>

    return {
      scope,
      runtime,
      identity,
      installSignals,
      close,
      setInstanceId,
      toContext,
    }
  })
