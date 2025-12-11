import type { Context, Layer as EffectLayer, Stream, Effect } from "effect"

/**
 * Actions 命名空间（模块版）：
 * - 提供 Actions.Tag<A>：Env 中的 Action 通道（dispatch + actions$）；
 * - 提供 Actions.Layer<A>：只携带该 Action 通道的 Layer 形状。
 *
 * 仅在类型层面使用，不引入额外运行时依赖。
 */
export type Tag<A> = Context.Tag<
  any,
  {
    dispatch: (a: A) => Effect.Effect<void>
    actions$: Stream.Stream<A>
  }
>

export type Layer<A> = EffectLayer.Layer<Tag<A>, never, never>
