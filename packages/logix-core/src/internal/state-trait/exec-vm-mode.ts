import { Effect, FiberRef, Layer } from 'effect'

/**
 * ExecVmMode：
 * - Allows kernel implementations (core-ng) to switch converge hot-path execution form without changing public semantics.
 * - Currently mainly affects typed-array reuse strategy in converge plan computation.
 * - Disabled by default in core (enable explicitly via Layer for perf/comparison runs).
 */
export const currentExecVmMode = FiberRef.unsafeMake<boolean>(false)

export const withExecVmMode = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.locally(currentExecVmMode, true)(effect)

export const execVmModeLayer = (enabled: boolean): Layer.Layer<any, never, never> =>
  Layer.fiberRefLocallyScopedWith(currentExecVmMode, () => enabled) as Layer.Layer<any, never, never>
