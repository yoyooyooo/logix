import type { Context, Layer as EffectLayer } from 'effect'

/**
 * State namespace (module-level):
 * - Provides State.Tag<S>: marks a state type in Env.
 * - Provides State.Layer<S>: builds a Layer that only carries State.Tag<S>.
 *
 * Type-level only; no additional runtime dependency.
 */
export type Tag<S> = Context.Tag<any, S>
export type Layer<S> = EffectLayer.Layer<Tag<S>, never, never>
