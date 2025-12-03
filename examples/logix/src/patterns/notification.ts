/**
 * @pattern 通用通知模式 (Notification Pattern)
 * @description
 *   仅定义 NotificationService 契约与基于它的简单 Pattern，完全不提供实现，
 *   由消费方在场景中通过 Effect.provideService / Layer 提供具体实现。
 */

import { Context, Effect } from 'effect'

// ---------------------------------------------------------------------------
// Service 契约：NotificationServiceTag 只描述接口，不内置实现
// ---------------------------------------------------------------------------

export interface NotificationService {
  info: (message: string) => Effect.Effect<void>
  error: (message: string) => Effect.Effect<void>
}

export class NotificationServiceTag extends Context.Tag('@svc/Notification')<
  NotificationServiceTag,
  NotificationService
>() {}

// ---------------------------------------------------------------------------
// Pattern：根据结果类型发送对应通知
// ---------------------------------------------------------------------------

export interface NotifyOnResultPatternInput {
  kind: 'success' | 'failure'
  message: string
}

/**
 * runNotifyOnResultPattern
 *
 * - 根据 kind = success/failure 调用 NotificationService.info / error；
 * - 不关心实现细节，只依赖 NotificationServiceTag。
 */
export const runNotifyOnResultPattern = (
  input: NotifyOnResultPatternInput,
): Effect.Effect<void, never, NotificationServiceTag> =>
  Effect.gen(function* () {
    const svc = yield* NotificationServiceTag

    if (input.kind === 'success') {
      yield* svc.info(input.message)
    } else {
      yield* svc.error(input.message)
    }
  })

