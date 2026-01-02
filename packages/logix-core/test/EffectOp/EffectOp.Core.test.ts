import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOp from '../../src/EffectOp.js'

describe('EffectOp core', () => {
  it('composeMiddleware should apply middlewares in stack order', async () => {
    const events: Array<string> = []

    const mw1: EffectOp.Middleware = (op) =>
      Effect.gen(function* () {
        events.push('mw1:before')
        const result = yield* op.effect
        events.push('mw1:after')
        return result
      })

    const mw2: EffectOp.Middleware = (op) =>
      Effect.gen(function* () {
        events.push('mw2:before')
        const result = yield* op.effect
        events.push('mw2:after')
        return result
      })

    const stack: EffectOp.MiddlewareStack = [mw1, mw2]

    const op = EffectOp.make({
      kind: 'state',
      name: 'test',
      effect: Effect.succeed(1),
    })

    const composed = EffectOp.composeMiddleware(stack)
    const result = await Effect.runPromise(composed(op) as Effect.Effect<number, never, never>)

    expect(result).toBe(1)
    // Wrapped in stack order: mw1 -> mw2
    expect(events).toEqual(['mw1:before', 'mw2:before', 'mw2:after', 'mw1:after'])
  })

  it('run should delegate to composeMiddleware and preserve errors', async () => {
    const errors: Array<unknown> = []

    const mw: EffectOp.Middleware = (op) =>
      op.effect.pipe(
        Effect.tapError((err) =>
          Effect.sync(() => {
            errors.push(err)
          }),
        ),
      )

    const stack: EffectOp.MiddlewareStack = [mw]

    const op = EffectOp.make({
      kind: 'service',
      name: 'failing-service',
      effect: Effect.fail('boom'),
    })

    const program = EffectOp.run(op, stack).pipe(Effect.catchAll((err) => Effect.succeed(err)))

    const result = await Effect.runPromise(program as Effect.Effect<unknown, never, never>)

    expect(result).toBe('boom')
    expect(errors).toEqual(['boom'])
  })
})
