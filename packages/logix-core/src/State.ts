import type { Context, Layer as EffectLayer } from "effect"

/**
 * State 命名空间（模块版）：
 * - 提供 State.Tag<S>：用于在 Env 中标记某类 State；
 * - 提供 State.Layer<S>：用于构造只携带 State.Tag<S> 的 Layer。
 *
 * 仅在类型层面使用，不引入额外运行时依赖。
 */
export type Tag<S> = Context.Tag<any, S>
export type Layer<S> = EffectLayer.Layer<Tag<S>, never, never>
