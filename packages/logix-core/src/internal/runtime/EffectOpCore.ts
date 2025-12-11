// EffectOp 核心模型与 Middleware 组合逻辑。
// 更高层的 Runtime / Devtools 对接见：
// specs/001-module-traits-runtime/references/effectop-and-middleware.md

import { Context, Effect } from "effect"

/**
 * EffectOp：统一表示一次边界 Effect 执行（Action / Flow / State / Service / Lifecycle）。
 *
 * - Out / Err / Env 为内部 Effect 的泛型参数；
 * - meta 用于承载 Devtools / Middleware 所需的结构化上下文信息。
 */
export interface EffectOp<Out = unknown, Err = unknown, Env = unknown> {
  readonly id: string
  readonly kind: "action" | "flow" | "state" | "service" | "lifecycle"
  readonly name: string
  readonly payload?: unknown
  readonly meta?: {
    moduleId?: string
    fieldPath?: string
    resourceId?: string
    key?: unknown
    trace?: ReadonlyArray<string>
    // 预留扩展位，供中间件与 Devtools 挂载额外信息。
    readonly [k: string]: unknown
  }
  readonly effect: Effect.Effect<Out, Err, Env>
}

/**
 * Middleware：对 EffectOp 进行观察 / 包装 / 守卫的通用中间件模型。
 */
export type Middleware = <A, E, R>(
  op: EffectOp<A, E, R>,
) => Effect.Effect<A, E, R>

export type MiddlewareStack = ReadonlyArray<Middleware>

/**
 * EffectOpMiddlewareEnv：
 * - 作为 Effect Env 中的一项 Service，承载当前 Runtime 的 MiddlewareStack；
 * - 由 Runtime.ts 在构造 ManagedRuntime 时注入；
 * - StateTrait.install 等运行时代码通过该 Service 决定实际使用的 MiddlewareStack。
 */
export interface EffectOpMiddlewareEnv {
  readonly stack: MiddlewareStack
}

export class EffectOpMiddlewareTag extends Context.Tag(
  "Logix/EffectOpMiddleware",
)<EffectOpMiddlewareTag, EffectOpMiddlewareEnv>() {}

/**
 * composeMiddleware：
 * - 按「声明顺序从外到内」组合 Middleware：
 *   - stack = [mw1, mw2] => 实际执行顺序：mw1 -> mw2 -> effect -> mw2 -> mw1；
 * - 与 reference 文档中的 reduceRight 示例保持一致。
 */
export const composeMiddleware = (stack: MiddlewareStack): Middleware => {
  return (op) =>
    stack.reduceRight(
      (eff, mw) => mw({ ...op, effect: eff }),
      op.effect,
    )
}

/**
 * runWithMiddleware：
 * - 给定一条 EffectOp 与 MiddlewareStack，按组合规则执行；
 * - 若 stack 为空，则直接返回 op.effect。
 */
export const runWithMiddleware = <A, E, R>(
  op: EffectOp<A, E, R>,
  stack: MiddlewareStack,
): Effect.Effect<A, E, R> => {
  if (!stack.length) {
    return op.effect
  }
  const composed = composeMiddleware(stack)
  return composed(op)
}
