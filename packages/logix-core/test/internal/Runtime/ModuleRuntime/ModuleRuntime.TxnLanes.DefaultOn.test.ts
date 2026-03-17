import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'

const computeValue = (a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < 2000; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow
    }
  })

const makeDeferredModule = (args: { readonly deferred: number }) => {
  const fields: Record<string, Schema.Top> = {
    a: Schema.Number,
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

  const M = Logix.Module.make('ModuleRuntime_TxnLanes_DefaultOn', {
    state: State as any,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = { a: 0 }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

describe('ModuleRuntime TxnLanes (062 default-on)', () => {
  it.effect('enables txn lanes by default (nonUrgent evidence)', () =>
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

            const expectedLast = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[`d${DEFERRED - 1}`] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const nonUrgent = laneEvents.find((e) => e.data?.evidence?.lane === 'nonUrgent')
      expect(nonUrgent).toBeDefined()

      const evidence = nonUrgent?.data?.evidence
      expect(evidence?.policy?.effective?.enabled).toBe(true)
      expect(evidence?.policy?.effective?.tier).toBe('interactive')
      expect(evidence?.policy?.effective?.queueMode).toBe('lanes')
      expect(evidence?.policy?.explain?.scope).toBe('builtin')
      expect(evidence?.policy?.explain?.resolvedBy?.tier).toBe('builtin')
      expect(evidence?.policy?.explain?.resolvedBy?.enabled).toBe('builtin')
      expect(evidence?.policy?.explain?.resolvedBy?.queueMode).toBe('builtin')
    }),
  )

  it.effect('legacy runtime_default txnLanes throughput inference keeps tier source explainable', () =>
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
          txnLanes: { enabled: true, budgetMs: 8, debounceMs: 0, maxLagMs: 60, allowCoalesce: true },
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

            const expectedLast = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[`d${DEFERRED - 1}`] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const nonUrgent = laneEvents.find((e) => e.data?.evidence?.lane === 'nonUrgent')
      expect(nonUrgent).toBeDefined()

      const evidence = nonUrgent?.data?.evidence
      expect(evidence?.policy?.effective?.tier).toBe('throughput')
      expect(evidence?.policy?.effective?.budgetMs).toBe(8)
      expect(evidence?.policy?.effective?.maxLagMs).toBe(60)
      expect(evidence?.policy?.explain?.scope).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.budgetMs).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.tier).toBe('runtime_default')
    }),
  )

  it.effect('overrideMode=forced_off disables lanes (runtime_default) and emits forced_off evidence', () =>
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

      const DEFERRED = 32
      const { M, impl } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanePolicy: { tier: 'off' },
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

            const expectedLast = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[`d${DEFERRED - 1}`] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const forcedOff = laneEvents.find(
        (e) => Array.isArray(e.data?.evidence?.reasons) && e.data.evidence.reasons.includes('forced_off'),
      )
      expect(forcedOff).toBeDefined()

      const evidence = forcedOff?.data?.evidence
      expect(evidence?.lane).toBe('urgent')
      expect(evidence?.policy?.effective?.enabled).toBe(false)
      expect(evidence?.policy?.effective?.tier).toBe('off')
      expect(evidence?.policy?.effective?.overrideMode).toBe('forced_off')
      expect(evidence?.policy?.effective?.queueMode).toBe('fifo')
      expect(evidence?.policy?.explain?.scope).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.tier).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.overrideMode).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.queueMode).toBe('runtime_default')
    }),
  )

  it.effect('overrideMode=forced_sync disables lanes (runtime_default) and emits forced_sync evidence', () =>
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

      const DEFERRED = 32
      const { M, impl } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanePolicy: { tier: 'sync' },
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

            const expectedLast = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[`d${DEFERRED - 1}`] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const forcedSync = laneEvents.find(
        (e) => Array.isArray(e.data?.evidence?.reasons) && e.data.evidence.reasons.includes('forced_sync'),
      )
      expect(forcedSync).toBeDefined()

      const evidence = forcedSync?.data?.evidence
      expect(evidence?.lane).toBe('urgent')
      expect(evidence?.policy?.effective?.enabled).toBe(false)
      expect(evidence?.policy?.effective?.tier).toBe('sync')
      expect(evidence?.policy?.effective?.overrideMode).toBe('forced_sync')
      expect(evidence?.policy?.effective?.queueMode).toBe('fifo')
      expect(evidence?.policy?.explain?.scope).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.tier).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.overrideMode).toBe('runtime_default')
      expect(evidence?.policy?.explain?.resolvedBy?.queueMode).toBe('runtime_default')
    }),
  )

  it.effect('runtime_module tier-first override keeps explicit tier in diagnostics', () =>
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
      const moduleId = 'ModuleRuntime_TxnLanes_DefaultOn'

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanesOverridesByModuleId: {
            [moduleId]: { enabled: true, budgetMs: 9, debounceMs: 0, maxLagMs: 200, allowCoalesce: true },
          },
          txnLanePolicyOverridesByModuleId: {
            [moduleId]: {
              tier: 'throughput',
              tuning: { budgetMs: 1, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
            },
          },
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

            const expectedLast = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[`d${DEFERRED - 1}`] === expectedLast)))
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      const nonUrgent = laneEvents.find((e) => e.data?.evidence?.lane === 'nonUrgent')
      expect(nonUrgent).toBeDefined()

      const evidence = nonUrgent?.data?.evidence
      expect(evidence?.policy?.effective?.tier).toBe('throughput')
      expect(evidence?.policy?.effective?.budgetMs).toBe(1)
      expect(evidence?.policy?.effective?.maxLagMs).toBe(50)
      expect(evidence?.policy?.explain?.scope).toBe('runtime_module')
      expect(evidence?.policy?.explain?.resolvedBy?.tier).toBe('runtime_module')
      expect(evidence?.policy?.explain?.resolvedBy?.budgetMs).toBe('runtime_module')
      expect(evidence?.policy?.explain?.resolvedBy?.maxLagMs).toBe('runtime_module')
    }),
  )
})
