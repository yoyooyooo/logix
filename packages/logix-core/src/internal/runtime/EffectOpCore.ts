// EffectOp 核心模型与 Middleware 组合逻辑。
// 更高层的 Runtime / Devtools 对接见：
// specs/001-module-traits-runtime/references/effectop-and-middleware.md

import { Context, Effect, FiberRef } from "effect"

/**
 * currentLinkId：
 * - 以 FiberRef 形式承载当前操作链路 id（linkId）；
 * - 用于将同一链路下的多步边界操作关联起来（跨模块也可复用同一 FiberRef）。
 */
export const currentLinkId = FiberRef.unsafeMake<string | undefined>(undefined)

/**
 * OperationPolicy：
 * - 局部策略标注（仅表达意图，不携带规则逻辑）。
 *
 * 约束（由 Runtime/middleware 共同保证）：
 * - 只能关闭纯观测类能力（Observer）；不得关闭全局守卫。
 */
export interface OperationPolicy {
  readonly disableObservers?: boolean
}

/**
 * OperationRejected：
 * - 守卫拒绝执行时的统一失败结果；
 * - 语义：显式失败 + 无业务副作用（拒绝必须发生在用户程序执行前）。
 */
export interface OperationRejected {
  readonly _tag: "OperationRejected"
  readonly message: string
  readonly kind?: EffectOp["kind"]
  readonly name?: string
  readonly linkId?: string
  readonly details?: unknown
}

/**
 * OperationError：
 * - 任何通过 EffectOp 总线执行的边界操作，都可能被 Guard middleware 显式拒绝；
 * - 因此 middleware 的错误通道必须允许叠加 OperationRejected。
 */
export type OperationError<E> = E | OperationRejected

export const makeOperationRejected = (params: {
  readonly message: string
  readonly kind?: EffectOp["kind"]
  readonly name?: string
  readonly linkId?: string
  readonly details?: unknown
}): OperationRejected => ({
  _tag: "OperationRejected",
  message: params.message,
  kind: params.kind,
  name: params.name,
  linkId: params.linkId,
  details: params.details,
})

/**
 * EffectOp：统一表示一次“可观测边界”的 Effect 执行。
 *
 * - Out / Err / Env 为内部 Effect 的泛型参数；
 * - meta 用于承载 Devtools / Middleware 所需的结构化上下文信息。
 */
export interface EffectOp<Out = unknown, Err = unknown, Env = unknown> {
  readonly id: string
  readonly kind:
    | "action"
    | "flow"
    | "state"
    | "service"
    | "lifecycle"
    | "trait-computed"
    | "trait-link"
    | "trait-source"
    | "devtools"
  readonly name: string
  readonly payload?: unknown
  readonly meta?: {
    /**
     * linkId：
     * - 操作链路 id：同一链路下的多步边界操作必须共享；
     * - Runtime 保证在所有边界操作上都会补齐该字段。
     */
    linkId?: string
    moduleId?: string
    runtimeId?: string
    runtimeLabel?: string
    txnId?: string
    fieldPath?: string
    deps?: ReadonlyArray<string>
    from?: string
    to?: string
    traitNodeId?: string
    stepId?: string
    resourceId?: string
    key?: unknown
    trace?: ReadonlyArray<string>
    tags?: ReadonlyArray<string>
    policy?: OperationPolicy
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
) => Effect.Effect<A, OperationError<E>, R>

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
  return <A, E, R>(op: EffectOp<A, E, R>): Effect.Effect<A, OperationError<E>, R> =>
    stack.reduceRight<Effect.Effect<A, OperationError<E>, R>>(
      (eff, mw) => mw({ ...op, effect: eff } as any) as any,
      op.effect as Effect.Effect<A, OperationError<E>, R>,
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
  const makeLinkId = (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  return Effect.gen(function* () {
    const existing = yield* FiberRef.get(currentLinkId)
    const linkId = (op.meta as any)?.linkId ?? existing ?? makeLinkId()

    const nextOp: EffectOp<A, E, R> = {
      ...op,
      meta: {
        ...(op.meta ?? {}),
        linkId,
      },
    }

    const program = stack.length ? composeMiddleware(stack)(nextOp) : nextOp.effect

    // linkId：边界起点创建，嵌套复用（同一 FiberRef 为全局单一事实源）。
    // NOTE: middleware 允许以 OperationRejected 显式拒绝。
    return yield* Effect.locally(currentLinkId, linkId)(program as any)
  }) as Effect.Effect<A, E, R>
}
