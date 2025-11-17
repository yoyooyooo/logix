import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'

const computeValue = (a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < 4000; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow()
    }
  })

describe('ModuleRuntime time-slicing (lanes enabled)', () => {
  it.scoped('deferred flush should not block an urgent transaction when txnLanes is enabled', () =>
    Effect.gen(function* () {
      const DEFERRED = 512

      const fields: Record<string, Schema.Schema.Any> = {
        a: Schema.Number,
        b: Schema.Number,
      }
      for (let i = 0; i < DEFERRED; i++) {
        fields[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(fields) as any
      const Actions = { noop: Schema.Void }

      const traits: Record<string, any> = {}
      for (let i = 0; i < DEFERRED; i++) {
        const key = `d${i}`
        traits[key] = Logix.StateTrait.computed({
          deps: ['a'] as any,
          get: (a: any) => computeValue(a, i),
          scheduling: 'deferred',
        } as any)
      }

      const M = Logix.Module.make('ModuleRuntime_TimeSlicing_Lanes', {
        state: State as any,
        actions: Actions,
        reducers: { noop: (s: any) => s },
        traits: Logix.StateTrait.from(State as any)(traits as any),
      })

      const initial: Record<string, number> = {
        a: 0,
        b: 0,
      }
      for (let i = 0; i < DEFERRED; i++) {
        initial[`d${i}`] = computeValue(0, i)
      }

      const impl = M.implement({
        initial: initial as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Logix.Debug.noopLayer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: {
            enabled: true,
            budgetMs: 0,
            debounceMs: 0,
            maxLagMs: 50,
            allowCoalesce: true,
          },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const expectedD0 = computeValue(1, 0)
            const expectedLast = computeValue(1, DEFERRED - 1)

            yield* waitUntil(
              rt.getState.pipe(
                Effect.map((s: any) => {
                  return s.d0 === expectedD0 && s[`d${DEFERRED - 1}`] !== expectedLast
                }),
              ),
            )

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'urgent' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, b: 1 })
                // Intentionally skip recordStatePatch to avoid triggering a second deferred flush run.
              }),
            )

            const mid = (yield* rt.getState) as any
            expect(mid.b).toBe(1)
            expect(mid.d0).toBe(expectedD0)
            expect(mid[`d${DEFERRED - 1}`]).not.toBe(expectedLast)

            yield* waitUntil(
              rt.getState.pipe(
                Effect.map((s: any) => {
                  return s[`d${DEFERRED - 1}`] === expectedLast
                }),
              ),
            )
          }),
        ),
      )
    }),
  )
})
