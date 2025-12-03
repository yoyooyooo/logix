/**
 * @scenario Confirm Pattern · 简单运行示例
 * @description
 *   演示 Tag-only Confirm Pattern (`runConfirmAndThenPattern`) 如何在单文件中：
 *   - 提供 ConfirmService 的实现；
 *   - 组装一个需要确认的 Effect；
 *   - 运行完整链路。
 */

import { Effect } from 'effect'
import {
  ConfirmServiceTag,
  type ConfirmService,
  runConfirmAndThenPattern,
} from '../patterns/confirm.js'

// 场景内提供一个最简单的 ConfirmService 实现：
// 为了方便演示，这里用 console + 固定返回 true/false。
const makeConsoleConfirmService = (answer: boolean): ConfirmService => ({
  confirm: (message) =>
    Effect.gen(function* () {
      console.log('[Confirm][show]', message, '=>', answer ? 'yes' : 'no')
      return answer
    }),
})

// 需要被保护的业务 Effect（这里只是 log）
const dangerousEffect = Effect.sync(() => {
  console.log('[DangerousEffect] 正在执行危险操作...')
})

// 1) 确认通过时执行
const programYes = runConfirmAndThenPattern({
  message: '是否执行危险操作（YES 示例）？',
  effect: dangerousEffect,
}).pipe(Effect.provideService(ConfirmServiceTag, makeConsoleConfirmService(true)))

// 2) 确认拒绝时不执行
const programNo = runConfirmAndThenPattern({
  message: '是否执行危险操作（NO 示例）？',
  effect: dangerousEffect,
}).pipe(Effect.provideService(ConfirmServiceTag, makeConsoleConfirmService(false)))

// 单文件运行入口：依次跑两次，观察差异
const main = Effect.gen(function* () {
  console.log('--- Confirm YES ---')
  yield* programYes

  console.log('--- Confirm NO ---')
  yield* programNo
})

void Effect.runPromise(main)
