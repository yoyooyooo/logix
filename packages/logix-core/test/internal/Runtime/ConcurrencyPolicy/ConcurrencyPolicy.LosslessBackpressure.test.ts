import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Fiber, Ref, Stream } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'
import * as Debug from '../../../../src/Debug.js'

describe('ConcurrencyPolicy (US1): lossless backpressure', () => {
  it('dispatch should become slower under overload (lossless, no drop)', async () => {
    const N = 48
    const ring = Debug.makeRingBufferSink(128)

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make({ count: 0 } as any, { moduleId: 'LosslessBackpressure' } as any)

          const processedRef = yield* Ref.make(0)

          const consumer = Stream.take(runtime.actions$, N).pipe(
            Stream.runForEach(() =>
              Effect.sleep('10 millis').pipe(Effect.zipRight(Ref.update(processedRef, (n) => n + 1)), Effect.asVoid),
            ),
          )
          const consumerFiber = yield* Effect.fork(consumer)

          const actions = Array.from({ length: N }, () => ({
            _tag: 'inc',
            payload: undefined,
          }))

          const t0 = Date.now()
          yield* Effect.forEach(actions, (a) => runtime.dispatch(a as any), { concurrency: 'unbounded' })
          const dispatchElapsedMs = Date.now() - t0

          yield* Fiber.join(consumerFiber)
          const processed = yield* Ref.get(processedRef)
          expect(processed).toBe(N)

          const asyncEscape = ring
            .getSnapshot()
            .some((e) => e.type === 'diagnostic' && e.code === 'state_transaction::async_escape')
          expect(asyncEscape).toBe(false)

          return dispatchElapsedMs
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            losslessBackpressureCapacity: 4,
          }),
        ),
      ),
    )

    const dispatchElapsedMs = await Effect.runPromise(program as any)
    // 背压应让入口变慢（否则会把积压转移为无限缓冲/无限 fiber）。
    expect(dispatchElapsedMs).toBeGreaterThanOrEqual(250)
  })
})
