import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import type { StateTransactionOverrides } from '../../../../src/internal/runtime/core/env.js'
import { StateTransactionOverridesTag } from '../../../../src/internal/runtime/core/env.js'
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

const makeDeferredModule = (args: { readonly deferred: number }) => {
  const fields: Record<string, Schema.Schema.Any> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < args.deferred; i++) {
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields) as any
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < args.deferred; i++) {
    const key = `d${i}`
    traits[key] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('ModuleRuntime_TxnLanes_Overrides', {
    state: State as any,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

describe('ModuleRuntime TxnLanes (runtime overrides)', () => {
  it.scoped('overrideMode=forced_sync emits TxnLaneEvidence even when policy is effectively disabled', () =>
    Effect.gen(function* () {
      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(Logix.Debug.diagnosticsLevel('full'), Logix.Debug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 64
      const { M, impl } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
        },
      })

      const overrides: StateTransactionOverrides = {
        txnLanes: { overrideMode: 'forced_sync' },
      }

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
            ).pipe(Effect.provideService(StateTransactionOverridesTag, overrides))

            const expectedLast = computeValue(1, DEFERRED - 1)
            const lastKey = `d${DEFERRED - 1}`

            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[lastKey] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const forced = laneEvents.find(
        (e) => Array.isArray(e.data?.evidence?.reasons) && e.data.evidence.reasons.includes('forced_sync'),
      )
      expect(forced).toBeDefined()

      const evidence = forced?.data?.evidence
      expect(evidence?.lane).toBe('urgent')
      expect(evidence?.policy?.enabled).toBe(false)
      expect(evidence?.policy?.overrideMode).toBe('forced_sync')
      expect(evidence?.policy?.queueMode).toBe('fifo')
      expect(evidence?.policy?.configScope).toBe('provider')
    }),
  )

  it.scoped('switching to overrideMode=forced_off coalesces backlog and produces forced_off evidence', () =>
    Effect.gen(function* () {
      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(Logix.Debug.diagnosticsLevel('full'), Logix.Debug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 512
      const { M, impl } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
        },
      })

      const forcedOff: StateTransactionOverrides = {
        txnLanes: { overrideMode: 'forced_off' },
      }

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
            const expectedLast1 = computeValue(1, DEFERRED - 1)
            const lastKey = `d${DEFERRED - 1}`

            // Ensure the non-urgent work loop is in progress (partial progress visible).
            yield* waitUntil(
              rt.getState.pipe(Effect.map((s: any) => s.d0 === expectedD0 && s[lastKey] !== expectedLast1)),
            )

            // Switch to forced_off and enqueue new deferred work; this should coalesce/cancel the pending backlog,
            // then flush in urgent mode (fifo) with forced_off evidence.
            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't2' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 2 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            ).pipe(Effect.provideService(StateTransactionOverridesTag, forcedOff))

            const expectedLast2 = computeValue(2, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[lastKey] === expectedLast2)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const canceled = laneEvents.find(
        (e) => Array.isArray(e.data?.evidence?.reasons) && e.data.evidence.reasons.includes('canceled'),
      )
      expect(canceled).toBeDefined()

      const forced = laneEvents.find(
        (e) => Array.isArray(e.data?.evidence?.reasons) && e.data.evidence.reasons.includes('forced_off'),
      )
      expect(forced).toBeDefined()
      expect(forced?.data?.evidence?.policy?.overrideMode).toBe('forced_off')
    }),
  )
})
