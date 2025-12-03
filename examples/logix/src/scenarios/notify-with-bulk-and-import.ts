/**
 * @scenario Notification Pattern · 结合业务 Pattern 的复用示例
 * @description
 *   演示在单个场景中复用 Tag-only notification Pattern，并串联两段“业务子流程”
 *   的结果，最终统一走 runNotifyOnResultPattern。
 */

import { Effect } from 'effect'
import {
  NotificationServiceTag,
  type NotificationService,
  runNotifyOnResultPattern,
} from '../patterns/notification.js'

// 场景内提供 NotificationService 实现（console 版）
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

// 组合运行逻辑（简化版“批量 + 导入”）：
// 1) 模拟一次“批量操作”结果；
// 2) 模拟一次“文件上传 + 导入任务”结果；
// 3) 最后根据结果统一发送通知。
const program = Effect.gen(function* () {
  // 这里用纯 Effect 模拟业务结果，真实项目中可替换为其它 Pattern 或 Service 调用
  const bulkCount = yield* Effect.succeed(2)
  const taskId = yield* Effect.succeed('task-notify-demo')

  const success = bulkCount > 0 && !!taskId

  yield* runNotifyOnResultPattern({
    kind: success ? 'success' : 'failure',
    message: success
      ? `批量操作成功（${bulkCount} 条），导入任务 ${taskId} 已启动`
      : '批量操作或导入任务失败',
  })
}).pipe(Effect.provideService(NotificationServiceTag, ConsoleNotificationService))

// 单文件可运行入口
void Effect.runPromise(program)
