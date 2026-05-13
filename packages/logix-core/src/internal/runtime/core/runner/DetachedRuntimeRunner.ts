import { Effect, Fiber, Layer, ManagedRuntime } from 'effect'

type DetachedRuntime = ManagedRuntime.ManagedRuntime<never, never>

export interface DetachedRuntimeRunner {
  readonly executeSync: <A>(effect: Effect.Effect<A, never, never>) => A
  readonly fork: <A, E>(effect: Effect.Effect<A, E, never>) => Fiber.Fiber<A, E>
  readonly interruptAndDispose: (fiber: Fiber.Fiber<void, any> | undefined) => void
}

export const makeDetachedRuntimeRunner = (): DetachedRuntimeRunner => {
  let runtime: DetachedRuntime | undefined

  const ensureRuntime = (): DetachedRuntime => {
    if (!runtime) {
      runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<never, never, never>)
    }
    return runtime
  }

  const executeSync = <A>(effect: Effect.Effect<A, never, never>): A => ensureRuntime().runSync(effect)

  const fork = <A, E>(effect: Effect.Effect<A, E, never>): Fiber.Fiber<A, E> => ensureRuntime().runFork(effect)

  const interruptAndDispose = (fiber: Fiber.Fiber<void, any> | undefined): void => {
    const current = runtime
    runtime = undefined
    if (!current) return
    if (!fiber) {
      void current.dispose()
      return
    }
    current.runCallback(Fiber.interrupt(fiber).pipe(Effect.asVoid), {
      onExit: () => {
        void current.dispose()
      },
    })
  }

  return {
    executeSync,
    fork,
    interruptAndDispose,
  }
}
