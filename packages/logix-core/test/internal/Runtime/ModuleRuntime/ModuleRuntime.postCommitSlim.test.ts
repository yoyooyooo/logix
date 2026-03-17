import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../../src/internal/runtime/core/env.js'
import { makeModuleInstanceKey } from '../../../../src/internal/runtime/core/RuntimeStore.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../../testkit/hostSchedulerTestKit.js'

describe('ModuleRuntime post-commit slim path', () => {
  it('skips tick scheduling when diagnostics=off and there are no post-commit observers', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
      const hostScheduler = makeTestHostScheduler()

      const Counter = Logix.Module.make('ModuleRuntime.PostCommitSlim.NoObservers', {
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
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
              const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)

              yield* rt.dispatch({ _tag: 'bump' })
              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ count: 1 })
              expect(scheduler.getTickSeq()).toBe(0)
              expect(store.getTickSeq()).toBe(0)
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
      }),
    )
  })

  it('still schedules tick when the module topic has subscribers', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
      const hostScheduler = makeTestHostScheduler()

      const Counter = Logix.Module.make('ModuleRuntime.PostCommitSlim.WithModuleSubscriber', {
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
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
              const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)

              const moduleInstanceKey = makeModuleInstanceKey(rt.moduleId, rt.instanceId)
              let listenerCalls = 0
              const unsubscribe = store.subscribeTopic(moduleInstanceKey, () => {
                listenerCalls += 1
              })

              try {
                yield* rt.dispatch({ _tag: 'bump' })
                yield* flushAllHostScheduler(hostScheduler)

                expect(yield* rt.getState).toEqual({ count: 1 })
                expect(scheduler.getTickSeq()).toBe(1)
                expect(store.getTickSeq()).toBe(1)
                expect(listenerCalls).toBe(1)
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
