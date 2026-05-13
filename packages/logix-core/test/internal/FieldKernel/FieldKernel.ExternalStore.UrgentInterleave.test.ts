import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

const waitForScheduledMacrotask = (hostScheduler: ReturnType<typeof makeTestHostScheduler>): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (let i = 0; i < 32; i += 1) {
      yield* Effect.yieldNow
      yield* Effect.sync(() => hostScheduler.flushMicrotasks())
      if (hostScheduler.getQueueSize().macrotasks > 0) return
    }
    return yield* Effect.die(new Error('externalStore delayed flush was not scheduled'))
  })

describe('FieldKernel externalStore urgent interleave', () => {
  it.effect('low-priority delayed externalStore writeback does not block urgent dispatch commit', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const State = Schema.Struct({
        slow: Schema.Number,
        urgent: Schema.Number,
      })
      const Actions = { incUrgent: Schema.Void }

      let slowCurrent = 0
      const listeners = new Set<() => void>()
      const slowStore = {
        getSnapshot: () => slowCurrent,
        subscribe: (listener: () => void) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('FieldKernelExternalStoreUrgentInterleave', {
          state: State,
          actions: Actions,
          reducers: {
            incUrgent: Logix.Module.Reducer.mutate((draft) => {
              draft.urgent += 1
            }),
          },
        }),
        FieldContracts.fieldFrom(State)({
          slow: FieldContracts.fieldExternalStore({
            store: slowStore,
            coalesceWindowMs: 10,
            priority: 'nonUrgent',
          }),
        }),
      )

      const runtime = Logix.Runtime.make(
        Logix.Program.make(M, {
          initial: { slow: 0, urgent: 0 },
          logics: [],
        }),
        {
          layer: testHostSchedulerLayer(hostScheduler),
        },
      )

      const rt: any = yield* Effect.promise(() => runtime.runPromise(Effect.service(M.tag).pipe(Effect.orDie)))
      yield* flushAllHostScheduler(hostScheduler)
      expect(listeners.size).toBeGreaterThan(0)

      slowCurrent = 1
      for (const listener of listeners) listener()
      yield* waitForScheduledMacrotask(hostScheduler)
      expect(hostScheduler.getQueueSize().macrotasks).toBeGreaterThan(0)

      yield* Effect.promise(() => runtime.runPromise(rt.dispatch({ _tag: 'incUrgent', payload: undefined } as any)))

      const beforeSlowFlush = yield* Effect.promise(() => runtime.runPromise(rt.getState))
      expect(beforeSlowFlush).toEqual({ slow: 0, urgent: 1 })

      yield* flushAllHostScheduler(hostScheduler)
      const after = yield* Effect.promise(() => runtime.runPromise(rt.getState))
      expect(after).toEqual({ slow: 1, urgent: 1 })

      yield* Effect.promise(() => runtime.dispose())
    })
  })
})
