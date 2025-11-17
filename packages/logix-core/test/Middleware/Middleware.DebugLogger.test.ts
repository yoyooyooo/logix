import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOp from '../../src/EffectOp.js'
import * as Middleware from '../../src/Middleware.js'

describe('Middleware.DebugLogger', () => {
  it('applyDebug should append a debug middleware and log EffectOp', async () => {
    const seen: Array<EffectOp.EffectOp<any, any, any>> = []

    const stack = Middleware.applyDebug([], {
      logger: (op) => {
        seen.push(op)
      },
    })

    const op = EffectOp.make({
      kind: 'state',
      name: 'debug-test',
      effect: Effect.succeed(42),
    })

    const result = await Effect.runPromise(EffectOp.run(op, stack) as Effect.Effect<number, never, never>)

    expect(result).toBe(42)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.name).toBe('debug-test')
    expect(seen[0]?.kind).toBe('state')
  })

  it('withDebug should append debug middlewares and preserve Effect result', async () => {
    const seen: Array<EffectOp.EffectOp<any, any, any>> = []

    // 起始 stack 只包含一个占位中间件，用于验证顺序不会被破坏。
    const base: Middleware.MiddlewareStack = [(op) => op.effect as Effect.Effect<any, any, any>]

    const stack = Middleware.withDebug(base, {
      logger: (op) => {
        seen.push(op)
      },
      observer: false, // 测试中无需依赖 DebugSink 行为
    })

    const op = EffectOp.make({
      kind: 'action',
      name: 'with-debug-test',
      effect: Effect.succeed('ok'),
    })

    const result = await Effect.runPromise(EffectOp.run(op, stack) as Effect.Effect<string, never, never>)

    expect(result).toBe('ok')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.name).toBe('with-debug-test')
    expect(seen[0]?.kind).toBe('action')
  })
})
