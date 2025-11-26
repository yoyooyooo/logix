/**
 * @pattern 通用确认模式 (Confirm Pattern)
 * @description
 *   定义一个 Tag-only 的 ConfirmService 契约，并提供基于它的通用确认 Pattern：
 *   - runConfirmAndThenPattern：先执行确认，再决定是否继续执行后续 Effect。
 *
 *   Pattern 本身不提供 ConfirmService 的实现，由消费方在场景中通过
 *   Effect.provideService / Layer 提供。
 */

import { Context, Effect } from 'effect'

// ---------------------------------------------------------------------------
// Service 契约：ConfirmServiceTag 只描述接口，不内置实现
// ---------------------------------------------------------------------------

export interface ConfirmService {
  /**
   * 显示一个确认交互（如 Modal / Dialog），返回用户是否确认。
   */
  confirm: (message: string) => Effect.Effect<boolean>
}

export class ConfirmServiceTag extends Context.Tag('@svc/Confirm')<
  ConfirmServiceTag,
  ConfirmService
>() {}

// ---------------------------------------------------------------------------
// Pattern：带确认的 Effect 组合
// ---------------------------------------------------------------------------

export interface ConfirmAndThenPatternInput<R, E, A> {
  message: string
  /**
   * 用户确认后的实际 Effect。
   */
  effect: Effect.Effect<A, E, R>
}

/**
 * runConfirmAndThenPattern
 *
 * - 先调用 ConfirmService.confirm(message)；
 * - 确认通过时执行 input.effect；
 * - 否则直接返回，不执行后续 effect。
 *
 * 说明：
 * - 环境类型为 R & ConfirmServiceTag，错误类型与业务 effect 一致；
 * - Pattern 本身不关心 effect 内容，适合作为危险操作 / 离开前确认等 Guard 的基础积木。
 */
export const runConfirmAndThenPattern = <R, E, A>(
  input: ConfirmAndThenPatternInput<R, E, A>,
): Effect.Effect<void | A, E, ConfirmServiceTag | R> =>
  Effect.gen(function* () {
    const svc = yield* ConfirmServiceTag
    const ok = yield* svc.confirm(input.message)

    if (!ok) {
      return undefined
    }

    return yield* input.effect
  })
