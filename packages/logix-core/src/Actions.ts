import type { Effect, Layer as EffectLayer, ServiceMap, Stream } from 'effect'

/**
 * Actions namespace (module-level):
 * - Provides Actions.Tag<A>: the action channel in Env (dispatch + actions$).
 * - Provides Actions.Layer<A>: a Layer shape that only carries that action channel.
 *
 * Type-level only; no additional runtime dependency.
 */
export type Tag<A> = ServiceMap.Key<
  any,
  {
    dispatch: (a: A) => Effect.Effect<void>
    actions$: Stream.Stream<A>
  }
>

export type Layer<A> = EffectLayer.Layer<Tag<A>, never, never>
