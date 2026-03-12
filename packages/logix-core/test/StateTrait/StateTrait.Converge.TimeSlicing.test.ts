import { describe, expect, it } from '@effect/vitest'
import { Effect, Fiber, Schema, Stream } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait converge time-slicing (043)', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    immediateA: Schema.Number,
    deferredA: Schema.Number,
    deferredFromImmediateA: Schema.Number,
  })

  const Actions = { noop: Schema.Void }

  const M = Logix.Module.make('StateTraitConverge_TimeSlicing', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State)({
      immediateA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      deferredA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 100,
        scheduling: 'deferred',
      }),
      deferredFromImmediateA: Logix.StateTrait.computed({
        deps: ['immediateA'],
        get: (immediateA) => immediateA + 1000,
        scheduling: 'deferred',
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, immediateA: 1, deferredA: 100, deferredFromImmediateA: 1001 },
    logics: [],
  })

  it.effect('skips deferred converge in the current txn, then flushes later', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: false },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            const commitsFiber = yield* Effect.forkChild(
              Stream.runCollect(Stream.take(rt.changesWithMeta((s: any) => s), 2)),
            )
            yield* Effect.promise(
              () =>
                new Promise<void>((resolve) => {
                  setTimeout(resolve, 10)
                }),
            )

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const afterTxn = yield* rt.getState
            expect(afterTxn).toMatchObject({ a: 1, immediateA: 2 })

            yield* Effect.sleep('80 millis')
            const commits = Array.from((yield* Fiber.join(commitsFiber)) as Iterable<any>)
            expect(commits.length).toBe(2)
            expect(commits[0]?.value).toMatchObject({ a: 1, immediateA: 2, deferredA: 100, deferredFromImmediateA: 1001 })
            expect(commits[1]?.value).toMatchObject({ a: 1, immediateA: 2, deferredA: 101, deferredFromImmediateA: 1002 })

            const afterFlush = yield* rt.getState
            expect(afterFlush).toMatchObject({ a: 1, immediateA: 2, deferredA: 101, deferredFromImmediateA: 1002 })
          }),
        ),
      )
    }),
  )

  it.effect('maxLagMs forces a flush even if debounceMs is large', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 200, maxLagMs: 10 },
          txnLanes: { enabled: false },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            yield* Effect.sleep('40 millis')

            const afterFlush = yield* rt.getState
            expect(afterFlush).toMatchObject({ a: 1, immediateA: 2, deferredA: 101 })
          }),
        ),
      )
    }),
  )
})
