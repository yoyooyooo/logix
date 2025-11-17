/**
 * @scenario EffectOp Middleware · 基本用法
 *
 * 演示如何直接使用 EffectOp + MiddlewareStack：
 * - 通过 EffectOp.make 包装一段 Effect；
 * - 组合 TimingMiddleware + DebugLogger 中间件；
 * - 使用 EffectOp.run 按组合顺序执行，并在控制台观察日志。
 */

import { Effect } from 'effect'
import { fileURLToPath } from 'node:url'
import * as EffectOp from '@logix/core/EffectOp'
import * as Middleware from '@logix/core/Middleware'

// 一个简单的计时中间件：在 Effect 执行前后打印耗时
const timingMiddleware: Middleware.Middleware = (op) =>
  Effect.gen(function* () {
    const start = Date.now()
    // eslint-disable-next-line no-console
    console.log('[Timing] start', `kind=${op.kind}`, `name=${op.name}`)

    const result = yield* op.effect

    const duration = Date.now() - start
    // eslint-disable-next-line no-console
    console.log('[Timing] done', `kind=${op.kind}`, `name=${op.name}`, `(${duration}ms)`)

    return result
  })

// 使用内置调试组合：在现有 stack 上追加 DebugLogger + DebugObserver 预设。
const stack: Middleware.MiddlewareStack = Middleware.withDebug([timingMiddleware], {
  logger: (op) => {
    // eslint-disable-next-line no-console
    console.log('[DebugLogger]', `kind=${op.kind}`, `name=${op.name}`, `module=${op.meta?.moduleId ?? '-'}`)
  },
  // 这里可以按需控制 observer 行为，示例中使用默认配置。
  observer: {},
})

export const main = Effect.gen(function* () {
  const baseEffect = Effect.gen(function* () {
    // eslint-disable-next-line no-console
    console.log('[Effect] running body...')
    yield* Effect.sleep('20 millis')
    return 'OK'
  })

  const op = EffectOp.make<string, never, never>({
    kind: 'service',
    name: 'demo/op',
    effect: baseEffect,
    meta: {
      moduleId: 'MiddlewareDemo',
      resourceId: 'demo/service',
      key: { id: 'u1' },
    },
  })

  const result = yield* EffectOp.run(op, stack)

  // eslint-disable-next-line no-console
  console.log('[Result]', result)
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}
