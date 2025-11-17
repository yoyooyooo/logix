import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, PubSub, Queue, Ref } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

const countPressureByModuleId = (events: ReadonlyArray<Debug.Event>, moduleId: string): number =>
  events.filter(
    (e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure' && (e as any).moduleId === moduleId,
  ).length

describe('ConcurrencyPolicy (US1): multi-module starvation', () => {
  it('two modules under load should both make progress and diagnostics should be distinguishable', async () => {
    const ring = Debug.makeRingBufferSink(512)

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const readyA = yield* Deferred.make<void>()
          const readyB = yield* Deferred.make<void>()

          const hubA = yield* PubSub.bounded<any>(2)
          const hubB = yield* PubSub.bounded<any>(2)

          const runtimeA = yield* ModuleRuntime.make(
            { count: 0 } as any,
            {
              moduleId: 'StarvationA',
              createActionHub: Effect.succeed(hubA),
            } as any,
          )
          const runtimeB = yield* ModuleRuntime.make(
            { count: 0 } as any,
            {
              moduleId: 'StarvationB',
              createActionHub: Effect.succeed(hubB),
            } as any,
          )

          const processedA = yield* Ref.make(0)
          const processedB = yield* Ref.make(0)

          const consumerA = Effect.gen(function* () {
            const sub = yield* PubSub.subscribe(hubA)
            yield* Deferred.succeed(readyA, undefined)
            for (let i = 0; i < 12; i++) {
              yield* Queue.take(sub)
              yield* Effect.sleep('30 millis')
              yield* Ref.update(processedA, (n) => n + 1)
            }
          })

          const consumerB = Effect.gen(function* () {
            const sub = yield* PubSub.subscribe(hubB)
            yield* Deferred.succeed(readyB, undefined)
            for (let i = 0; i < 12; i++) {
              yield* Queue.take(sub)
              yield* Effect.sleep('30 millis')
              yield* Ref.update(processedB, (n) => n + 1)
            }
          })

          const consumerFiberA = yield* Effect.fork(consumerA)
          const consumerFiberB = yield* Effect.fork(consumerB)
          yield* Deferred.await(readyA)
          yield* Deferred.await(readyB)

          const actions = Array.from({ length: 12 }, () => ({
            _tag: 'inc',
            payload: undefined,
          }))

          const dispatchFiber = yield* Effect.fork(
            Effect.all(
              [
                Effect.forEach(actions, (a) => runtimeA.dispatch(a as any), {
                  concurrency: 'unbounded',
                }),
                Effect.forEach(actions, (a) => runtimeB.dispatch(a as any), {
                  concurrency: 'unbounded',
                }),
              ],
              { concurrency: 'unbounded' },
            ),
          )

          yield* Fiber.join(dispatchFiber)
          yield* Fiber.join(consumerFiberA)
          yield* Fiber.join(consumerFiberB)

          expect(yield* Ref.get(processedA)).toBe(12)
          expect(yield* Ref.get(processedB)).toBe(12)

          // If pressure warnings are triggered, they must be distinguishable by moduleId (to keep "multi-module starvation" diagnosable).
          const events = ring.getSnapshot()
          expect(countPressureByModuleId(events, 'StarvationA')).toBeGreaterThan(0)
          expect(countPressureByModuleId(events, 'StarvationB')).toBeGreaterThan(0)
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            losslessBackpressureCapacity: 2,
            pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
            warningCooldownMs: 1,
          }),
        ),
      ),
    )

    await Effect.runPromise(program as any)
  })
})
