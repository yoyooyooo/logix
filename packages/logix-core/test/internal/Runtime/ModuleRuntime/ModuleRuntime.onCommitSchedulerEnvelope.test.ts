import { describe, expect, it } from 'vitest'
import { Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../../src/internal/runtime/core/env.js'
import { makeModuleInstanceKey, makeReadQueryTopicKey } from '../../../../src/internal/runtime/core/RuntimeStore.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../../testkit/hostSchedulerTestKit.js'

describe('ModuleRuntime onCommit scheduler minimal envelope', () => {
  it('keeps readQuery subscriber updates working when diagnostics=off', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const hostScheduler = makeTestHostScheduler()

        const Counter = Logix.Module.make('ModuleRuntime.OnCommitSchedulerEnvelope.ReadQuery', {
          state: Schema.Struct({
            count: Schema.Number,
          }),
          actions: {
            bump: Schema.Void,
          },
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft: { count: number }) => {
              draft.count += 1
            }),
          },
        })

        const runtime = Logix.Runtime.make(
          Counter.implement({
            initial: { count: 0 },
            logics: [],
          }),
          {
            layer: Layer.mergeAll(
              testHostSchedulerLayer(hostScheduler),
              Debug.diagnosticsLevel('off'),
              Debug.traceMode('off'),
              Debug.replace([]),
            ) as Layer.Layer<any, never, never>,
          },
        )

        try {
          yield* Effect.promise(() =>
            runtime.runPromise(
              Effect.gen(function* () {
                const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
                const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
                const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)

                const readQuery = Logix.ReadQuery.make({
                  selectorId: 'count',
                  reads: ['count'],
                  select: (state: { count: number }) => state.count,
                  equalsKind: 'objectIs',
                })

                const fiber = yield* Effect.forkChild(
                  Stream.runCollect(Stream.take(rt.changesReadQueryWithMeta(readQuery), 1)),
                )
                for (let i = 0; i < 32; i += 1) {
                  yield* Effect.yieldNow
                }

                yield* rt.dispatch({ _tag: 'bump' })
                yield* flushAllHostScheduler(hostScheduler)

                const exit = yield* Fiber.await(fiber)
                expect(exit._tag).toBe('Success')
                if (exit._tag === 'Success') {
                  const events = Array.from(exit.value as Iterable<any>)
                  expect(events).toHaveLength(1)
                  expect(events[0]?.value).toBe(1)
                }

                const moduleKey = makeModuleInstanceKey(rt.moduleId, rt.instanceId)
                expect(scheduler.getTickSeq()).toBe(1)
                expect(store.getTickSeq()).toBe(1)
                expect(store.getModuleState(moduleKey)).toEqual({ count: 1 })
              }),
            ),
          )
        } finally {
          yield* Effect.promise(() => runtime.dispose())
        }
      }),
    )
  })

  it('keeps module topic scheduling working when diagnostics=light', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const hostScheduler = makeTestHostScheduler()

        const Counter = Logix.Module.make('ModuleRuntime.OnCommitSchedulerEnvelope.ModuleTopic', {
          state: Schema.Struct({
            count: Schema.Number,
          }),
          actions: {
            bump: Schema.Void,
          },
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft: { count: number }) => {
              draft.count += 1
            }),
          },
        })

        const runtime = Logix.Runtime.make(
          Counter.implement({
            initial: { count: 0 },
            logics: [],
          }),
          {
            layer: Layer.mergeAll(
              testHostSchedulerLayer(hostScheduler),
              Debug.diagnosticsLevel('light'),
              Debug.traceMode('off'),
              Debug.replace([]),
            ) as Layer.Layer<any, never, never>,
          },
        )

        try {
          yield* Effect.promise(() =>
            runtime.runPromise(
              Effect.gen(function* () {
                const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
                const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
                const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)

                const moduleKey = makeModuleInstanceKey(rt.moduleId, rt.instanceId)
                let listenerCalls = 0
                const unsubscribe = store.subscribeTopic(moduleKey, () => {
                  listenerCalls += 1
                })

                try {
                  yield* rt.dispatch({ _tag: 'bump' })
                  yield* flushAllHostScheduler(hostScheduler)

                  expect(listenerCalls).toBe(1)
                  expect(scheduler.getTickSeq()).toBe(1)
                  expect(store.getTickSeq()).toBe(1)
                  expect(store.getTopicVersion(moduleKey)).toBe(1)
                } finally {
                  unsubscribe()
                }
              }),
            ),
          )
        } finally {
          yield* Effect.promise(() => runtime.dispose())
        }
      }),
    )
  })
})
