import { Effect, Layer, ServiceMap } from 'effect'

/**
 * ExecVmMode：
 * - Allows kernel implementations (core-ng) to switch converge hot-path execution form without changing public semantics.
 * - Currently mainly affects typed-array reuse strategy in converge plan computation.
 * - Disabled by default in core (enable explicitly via Layer for perf/comparison runs).
 */
export const currentExecVmMode = ServiceMap.Reference<boolean>('@logixjs/core/ExecVmMode', {
  defaultValue: () => false,
})

export const withExecVmMode = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.provideService(effect, currentExecVmMode, true)

export const execVmModeLayer = (enabled: boolean): Layer.Layer<any, never, never> =>
  Layer.succeed(currentExecVmMode, enabled) as Layer.Layer<any, never, never>
