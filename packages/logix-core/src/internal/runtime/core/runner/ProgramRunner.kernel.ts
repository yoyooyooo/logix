import { Effect, Scope } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { AnyModuleShape, ModuleImpl } from '../module.js'
import { make as makeBoundApi } from '../BoundApiRuntime.js'
import { closeProgramScope } from './ProgramRunner.closeScope.js'
import type { ProgramIdentity } from './ProgramRunner.errors.js'
import { installGracefulShutdownHandlers } from './ProgramRunner.signals.js'
import type { ProgramRunContext } from './ProgramRunner.context.js'

export type RuntimeFactory = (
  rootImpl: ModuleImpl<any, AnyModuleShape, any>,
  options?: unknown,
) => ManagedRuntime.ManagedRuntime<any, never>

export interface ProgramRunnerKernel<Sh extends AnyModuleShape> {
  readonly scope: Scope.CloseableScope
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
  rootImpl: ModuleImpl<any, Sh, any>,
  options?: unknown,
): Effect.Effect<ProgramRunnerKernel<Sh>> =>
  Effect.gen(function* () {
    const identity: ProgramIdentity = {
      moduleId: String(rootImpl.module.id),
      instanceId: 'unknown',
    }

    const scope = yield* Scope.make()
    const runtime = makeRuntime(rootImpl as ModuleImpl<any, AnyModuleShape, any>, options)

    yield* Scope.addFinalizer(scope, Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid))

    const setInstanceId = (value: unknown) => {
      identity.instanceId = typeof value === 'string' && value.length > 0 ? value : String(value ?? 'unknown')
    }

    const close = (params: {
      readonly timeoutMs: number
      readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void, never, never>
    }) =>
      closeProgramScope({
        scope,
        timeoutMs: params.timeoutMs,
        identity,
        onError: params.onError,
      })

    const installSignals = (enabled: boolean) => installGracefulShutdownHandlers({ scope, enabled })

    const toContext = (moduleRuntime: unknown) =>
      ({
        scope,
        runtime,
        module: moduleRuntime as any,
        $: makeBoundApi(rootImpl.module.shape as any, moduleRuntime as any) as any,
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
