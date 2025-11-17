import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, PubSub, Queue } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

const findPressureEvent = (events: ReadonlyArray<Debug.Event>): Debug.Event | undefined =>
  events.find((e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure')

const waitForPressureEvent = (ring: Debug.RingBufferSink, deadlineMs: number): Effect.Effect<Debug.Event, Error> =>
  Effect.gen(function* () {
    const existing = findPressureEvent(ring.getSnapshot())
    if (existing) {
      return existing
    }
    if (Date.now() >= deadlineMs) {
      return yield* Effect.fail(new Error('timeout waiting for concurrency::pressure'))
    }
    yield* Effect.sleep('10 millis')
    return yield* waitForPressureEvent(ring, deadlineMs)
  })

describe('ConcurrencyPolicy (US1): pressure warning', () => {
  it('should emit concurrency::pressure within 1s under overload', async () => {
    const ring = Debug.makeRingBufferSink(256)

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const ready = yield* Deferred.make<void>()
          const actionHub = yield* PubSub.bounded<any>(2)
          const runtime = yield* ModuleRuntime.make(
            { count: 0 } as any,
            {
              moduleId: 'PressureWarning',
              createActionHub: Effect.succeed(actionHub),
            } as any,
          )

          // Slow consumption: make publish/backpressure a visible "continuous saturation".
          const consumerFiber = yield* Effect.fork(
            Effect.gen(function* () {
              const subscription = yield* PubSub.subscribe(actionHub)
              yield* Deferred.succeed(ready, undefined)
              for (let i = 0; i < 12; i++) {
                yield* Queue.take(subscription)
                yield* Effect.sleep('50 millis')
              }
            }),
          )
          yield* Deferred.await(ready)

          const actions = Array.from({ length: 12 }, () => ({
            _tag: 'inc',
            payload: undefined,
          }))

          const dispatchFiber = yield* Effect.fork(
            Effect.forEach(actions, (a) => runtime.dispatch(a as any), { concurrency: 'unbounded' }),
          )

          const event = yield* waitForPressureEvent(ring, Date.now() + 1000)
          const details = (event as any)?.trigger?.details

          expect(details?.configScope).toBe('runtime_default')
          expect(details?.limit).toBe(16)

          yield* Fiber.join(dispatchFiber)
          yield* Fiber.join(consumerFiber)
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            concurrencyLimit: 16,
            // Tiny capacity + very low threshold to reproduce within 1s.
            losslessBackpressureCapacity: 2,
            pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
            warningCooldownMs: 1000,
          }),
        ),
      ),
    )

    await Effect.runPromise(program as any)
  })
})
