/**
 * @scenario Confirm Pattern + Notification Pattern 组合示例
 * @description
 *   演示在单个场景中组合两个 Tag-only Pattern：
 *   - 确认 Pattern：runConfirmAndThenPattern；
 *   - 通知 Pattern：runNotifyOnResultPattern；
 *   并在文件内提供 ConfirmService / NotificationService 的实现与运行入口。
 */

import { Effect } from 'effect'
import {
  ConfirmServiceTag,
  type ConfirmService,
  runConfirmAndThenPattern,
} from '../patterns/confirm.js'
import {
  NotificationServiceTag,
  type NotificationService,
  runNotifyOnResultPattern,
} from '../patterns/notification.js'

// ---------------------------------------------------------------------------
// 场景内提供两个 Service 的实现（console 版）
// ---------------------------------------------------------------------------

const ConsoleConfirmService: ConfirmService = {
  confirm: (message) =>
    Effect.gen(function* () {
      console.log('[Confirm][show]', message, '=> always YES in demo')
      return true
    }),
}

const ConsoleNotificationService: NotificationService = {
  info: (message) =>
    Effect.sync(() => {
      console.log('[Notification][info]', message)
    }),
  error: (message) =>
    Effect.sync(() => {
      console.error('[Notification][error]', message)
    }),
}

// ---------------------------------------------------------------------------
// 组合运行逻辑：
// 1) 先询问“是否发送成功提示？”；
// 2) 用户确认后调用通知 Pattern；
// 3) 整体链路在本文件中闭合。
// ---------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const notifyEffect = runNotifyOnResultPattern({
    kind: 'success',
    message: '操作已成功完成（来自 confirm-with-notification-run.ts）',
  })

  yield* runConfirmAndThenPattern({
    message: '是否发送成功通知？',
    effect: notifyEffect,
  })
})
  .pipe(Effect.provideService(ConfirmServiceTag, ConsoleConfirmService))
  .pipe(Effect.provideService(NotificationServiceTag, ConsoleNotificationService))

// 单文件可运行入口
void Effect.runPromise(program)
