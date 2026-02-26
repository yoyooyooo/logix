import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, PubSub, Queue, Schema, Stream } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

const findPressureEventMatching = (
  events: ReadonlyArray<Debug.Event>,
  predicate: (event: Debug.Event) => boolean,
): Debug.Event | undefined =>
  events.find((e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure' && predicate(e))

const waitForPressureEventMatching = (
  ring: Debug.RingBufferSink,
  deadlineMs: number,
  predicate: (event: Debug.Event) => boolean,
): Effect.Effect<Debug.Event, Error> =>
  Effect.gen(function* () {
    const existing = findPressureEventMatching(ring.getSnapshot(), predicate)
    if (existing) {
      return existing
    }
    if (Date.now() >= deadlineMs) {
      return yield* Effect.fail(new Error('timeout waiting for matching concurrency::pressure'))
    }
    yield* Effect.sleep('10 millis')
    return yield* waitForPressureEventMatching(ring, deadlineMs, predicate)
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

          const event = yield* waitForPressureEventMatching(
            ring,
            Date.now() + 1000,
            (candidate) => (candidate as any)?.trigger?.kind === 'actionHub',
          )
          const details = (event as any)?.trigger?.details
          const source = details?.source

          expect(details?.configScope).toBe('runtime_default')
          expect(details?.limit).toBe(16)
          expect((event as any)?.trigger?.kind).toBe('actionHub')
          expect(source?.dispatchEntry).toBe('dispatch')
          expect(source?.channel).toBe('main')
          expect(source?.actionTag).toBe('inc')
          expect(source?.batchSize).toBe(1)
          expect(source?.fanoutCount).toBe(0)

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

  it('should annotate pressure source for dispatchBatch on main action bus', async () => {
    const ring = Debug.makeRingBufferSink(256)

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const ready = yield* Deferred.make<void>()
          const actionHub = yield* PubSub.bounded<any>(2)
          const runtime = yield* ModuleRuntime.make(
            { count: 0 } as any,
            {
              moduleId: 'PressureWarningBatch',
              createActionHub: Effect.succeed(actionHub),
            } as any,
          )

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

          const dispatchFiber = yield* Effect.fork(runtime.dispatchBatch(actions as any))

          const event = yield* waitForPressureEventMatching(
            ring,
            Date.now() + 1000,
            (candidate) =>
              (candidate as any)?.trigger?.kind === 'actionHub' &&
              ((candidate as any)?.trigger?.details?.source as any)?.dispatchEntry === 'dispatchBatch',
          )
          const source = (event as any)?.trigger?.details?.source

          expect(source?.dispatchEntry).toBe('dispatchBatch')
          expect(source?.channel).toBe('main')
          expect(source?.actionTag).toBe('inc')
          expect(source?.batchSize).toBe(12)
          expect(source?.fanoutCount).toBe(0)

          yield* Fiber.join(dispatchFiber)
          yield* Fiber.join(consumerFiber)
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            concurrencyLimit: 16,
            losslessBackpressureCapacity: 2,
            pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
            warningCooldownMs: 1000,
          }),
        ),
      ),
    )

    await Effect.runPromise(program as any)
  })

  it('should annotate pressure source when topic fan-out is saturated', async () => {
    const ring = Debug.makeRingBufferSink(256)

    const TopicModule = Logix.Module.make('PressureWarningTopicModule', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {
        inc: Schema.Void,
      },
    })

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const actionHub = yield* PubSub.unbounded<any>()
          const runtime = yield* ModuleRuntime.make(
            { count: 0 } as any,
            {
              moduleId: 'PressureWarningTopic',
              tag: TopicModule.tag,
              createActionHub: Effect.succeed(actionHub),
            } as any,
          )

          if (!runtime.actionsByTag$) {
            return yield* Effect.fail(new Error('expected actionsByTag$ to be available'))
          }

          const consumerFiber = yield* Effect.fork(
            Stream.runForEach(Stream.take(runtime.actionsByTag$('inc' as any), 12), () => Effect.sleep('50 millis')),
          )
          const dispatchFiber = yield* Effect.fork(
            Effect.forever(runtime.dispatch({ _tag: 'inc', payload: undefined } as any)),
          )

          const event = yield* waitForPressureEventMatching(
            ring,
            Date.now() + 1000,
            (candidate) => (candidate as any)?.trigger?.kind === 'actionTopicHub',
          )
          const details = (event as any)?.trigger?.details
          const source = details?.source

          expect((event as any)?.trigger?.kind).toBe('actionTopicHub')
          expect(source?.dispatchEntry).toBe('dispatch')
          expect(source?.channel).toBe('topic')
          expect(source?.topicTag).toBe('inc')
          expect(source?.actionTag).toBe('inc')
          expect(source?.batchSize).toBe(1)
          expect(source?.fanoutCount).toBe(1)

          yield* Fiber.interrupt(dispatchFiber)
          yield* Fiber.interrupt(consumerFiber)
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            concurrencyLimit: 16,
            losslessBackpressureCapacity: 2,
            pressureWarningThreshold: {
              // Block txnQueue-origin warnings to isolate this test to publish/fan-out pressure.
              backlogCount: 10_000,
              backlogDurationMs: 1,
            },
            warningCooldownMs: 1000,
          }),
        ),
      ),
    )

    await Effect.runPromise(program as any)
  })
})
