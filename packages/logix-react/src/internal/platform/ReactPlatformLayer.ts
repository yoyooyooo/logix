import { Effect, Layer, Ref } from 'effect'
import { Platform } from '@logixjs/core'

/**
 * ReactPlatformLayer
 *
 * Provides a Logic.Platform implementation for browser/React environments:
 * - lifecycle.onSuspend/onResume/onReset only registers callback Effects (subscriptions).
 * - The actual "trigger" (e.g. page suspend/resume) is driven by the host via extra emit* methods,
 *   allowing different integration layers (React, Node, etc.) to wire event sources as needed.
 */

class ReactPlatformImpl implements Platform.Service {
  constructor(
    private readonly suspendRef: Ref.Ref<ReadonlyArray<Effect.Effect<void, never, any>>>,
    private readonly resumeRef: Ref.Ref<ReadonlyArray<Effect.Effect<void, never, any>>>,
    private readonly resetRef: Ref.Ref<ReadonlyArray<Effect.Effect<void, never, any>>>,
  ) {}

  readonly lifecycle: Platform.Service['lifecycle'] = {
    onSuspend: (eff) => Ref.update(this.suspendRef, (list) => [...list, eff]).pipe(Effect.asVoid),
    onResume: (eff) => Ref.update(this.resumeRef, (list) => [...list, eff]).pipe(Effect.asVoid),
    onReset: (eff) => Ref.update(this.resetRef, (list) => [...list, eff]).pipe(Effect.asVoid),
  }

  // The emit* methods are not part of the official Logic.Platform interface; they are for host/test use only.
  // After retrieving the instance via `Effect.service(Logic.Platform)`, call them via `any`.

  readonly emitSuspend = (): Effect.Effect<void, never, any> =>
    Ref.get(this.suspendRef).pipe(Effect.flatMap((effects) => Effect.forEach(effects, (eff) => eff, { discard: true })))

  readonly emitResume = (): Effect.Effect<void, never, any> =>
    Ref.get(this.resumeRef).pipe(Effect.flatMap((effects) => Effect.forEach(effects, (eff) => eff, { discard: true })))

  readonly emitReset = (): Effect.Effect<void, never, any> =>
    Ref.get(this.resetRef).pipe(Effect.flatMap((effects) => Effect.forEach(effects, (eff) => eff, { discard: true })))
}

const makeReactPlatform: Effect.Effect<Platform.Service, never, never> = Effect.gen(function* () {
  const suspendRef = yield* Ref.make<ReadonlyArray<Effect.Effect<void, never, any>>>([])
  const resumeRef = yield* Ref.make<ReadonlyArray<Effect.Effect<void, never, any>>>([])
  const resetRef = yield* Ref.make<ReadonlyArray<Effect.Effect<void, never, any>>>([])

  return new ReactPlatformImpl(suspendRef, resumeRef, resetRef)
})

export const ReactPlatformLayer: Layer.Layer<Platform.Service, never, never> = Layer.scoped(
  Platform.tag,
  makeReactPlatform,
)
