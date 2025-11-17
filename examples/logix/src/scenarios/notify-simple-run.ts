/**
 * @scenario Notification Pattern · 简单运行示例
 * @description
 *   演示仅依赖 Tag 契约的 Pattern (`runNotifyOnResultPattern`) 如何在场景内通过
 *   Effect.provideService 提供实现，并在单文件内完整运行。
 */

import { Effect } from 'effect'
import { NotificationServiceTag, type NotificationService, runNotifyOnResultPattern } from '../patterns/notification.js'

// 场景内提供一个最简单的 NotificationService 实现（console 版）
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

// run 逻辑：依次触发一次 success 和一次 failure 通知
const program = Effect.gen(function* () {
  yield* runNotifyOnResultPattern({
    kind: 'success',
    message: '操作成功（来自 notify-simple-run.ts）',
  })

  yield* runNotifyOnResultPattern({
    kind: 'failure',
    message: '操作失败（来自 notify-simple-run.ts）',
  })
}).pipe(Effect.provideService(NotificationServiceTag, ConsoleNotificationService))

// 单文件可运行入口（PoC 环境下可选执行）
void Effect.runPromise(program)
