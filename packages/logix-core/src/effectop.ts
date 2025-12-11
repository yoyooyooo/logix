// Public EffectOp API。
// - 对外暴露 EffectOp 接口与 Middleware 类型别名；
// - 提供 make / withMeta / run 等辅助函数；
// - 具体运行时接线由 internal/runtime/EffectOpCore 承担。

import { Effect } from "effect"
import * as Core from "./internal/runtime/EffectOpCore.js"

export type EffectOp<Out = unknown, Err = unknown, Env = unknown> =
  Core.EffectOp<Out, Err, Env>

export type Middleware = Core.Middleware

export type MiddlewareStack = Core.MiddlewareStack

export const composeMiddleware = Core.composeMiddleware

/**
 * 生成随机 id，用于标识一次 EffectOp。
 * - 仅用于日志 / 调试，不要求强随机性。
 */
const makeId = (): string => Math.random().toString(36).slice(2)

/**
 * EffectOp.make：
 * - 创建一条带基本 meta 的 EffectOp；
 * - 默认生成随机 id，调用方可在外层覆写。
 */
export const make = <A, E, R>(params: {
  readonly kind: EffectOp["kind"]
  readonly name: string
  readonly effect: Effect.Effect<A, E, R>
  readonly payload?: unknown
  readonly meta?: EffectOp["meta"]
  readonly id?: string
}): EffectOp<A, E, R> => ({
  id: params.id ?? makeId(),
  kind: params.kind,
  name: params.name,
  payload: params.payload,
  meta: params.meta,
  effect: params.effect,
})

/**
 * EffectOp.withMeta：
 * - 在现有 EffectOp 上追加或覆盖 meta 字段；
 * - 不改变 effect 本身。
 */
export const withMeta = <A, E, R>(
  op: EffectOp<A, E, R>,
  meta: Partial<NonNullable<EffectOp["meta"]>>,
): EffectOp<A, E, R> => ({
  ...op,
  meta: { ...(op.meta ?? {}), ...meta },
})

/**
 * EffectOp.run：
 * - 使用给定 MiddlewareStack 执行一条 EffectOp；
 * - 若 stack 为空，则直接返回 op.effect。
 */
export const run = <A, E, R>(
  op: EffectOp<A, E, R>,
  stack: MiddlewareStack,
): Effect.Effect<A, E, R> => Core.runWithMiddleware(op, stack)

