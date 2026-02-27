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

const waitUntil = (cond: Effect.Effect<boolean>, maxIterations = 100_000): Effect.Effect<void> =>
  Effect.gen(function* () {
    let iterations = 0
    while (!(yield* cond)) {
      if (iterations >= maxIterations) {
        throw new Error(`waitUntil timed out after ${maxIterations} iterations`)
      }
      iterations += 1
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
    traits[`d${i}`] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('ModuleRuntime_TxnLanePolicy', {
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

const makeRuntime = (args: { readonly impl: unknown; readonly layer: Layer.Layer<any, never, never> }) =>
  Logix.Runtime.make(args.impl as any, {
    layer: args.layer,
    stateTransaction: {
      traitConvergeMode: 'dirty',
      traitConvergeBudgetMs: 100_000,
      traitConvergeDecisionBudgetMs: 100_000,
      traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
      txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
    },
  })

type TxnLanePolicyResolvedDetails = {
  readonly cacheHit: boolean
  readonly captureSeq: number
  readonly reason: string
  readonly recaptureRequired: boolean
  readonly configScope: string
  readonly queueMode: string
}

const collectResolvedDetails = (events: ReadonlyArray<Logix.Debug.Event>): Array<TxnLanePolicyResolvedDetails> =>
  events
    .filter(
      (event): event is Extract<Logix.Debug.Event, { readonly type: 'diagnostic' }> =>
        event.type === 'diagnostic' && (event as any).code === 'txn_lane_policy::resolved',
    )
    .map((event: any) => event.trigger?.details)
    .filter(
      (details): details is TxnLanePolicyResolvedDetails =>
        details != null &&
        typeof details.cacheHit === 'boolean' &&
        typeof details.captureSeq === 'number' &&
        typeof details.reason === 'string' &&
        typeof details.recaptureRequired === 'boolean' &&
        typeof details.configScope === 'string' &&
        typeof details.queueMode === 'string',
    )

describe('ModuleRuntime txn lane policy capture cache (O-024)', () => {
  it.scoped('runtime override injection does not apply immediately; re-capture is required', () =>
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
      const runtime = makeRuntime({ impl, layer })

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

            yield* waitUntil(
              rt.getState.pipe(Effect.map((s: any) => s.d0 === expectedD0 && s[lastKey] !== expectedLast1)),
            )

            // No re-capture: provider override is injected on this fiber only, current cache must stay unchanged.
            yield* Effect.yieldNow().pipe(Effect.provideService(StateTransactionOverridesTag, forcedOff))

            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[lastKey] === expectedLast1)))
            const forcedOffBeforeRecapture = events.some(
              (e: any) =>
                e.type === 'trace:txn-lane' &&
                Array.isArray(e.data?.evidence?.reasons) &&
                e.data.evidence.reasons.includes('forced_off'),
            )
            expect(forcedOffBeforeRecapture).toBe(false)

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

      const forcedOffAfterRecapture = events.some(
        (e: any) =>
          e.type === 'trace:txn-lane' &&
          Array.isArray(e.data?.evidence?.reasons) &&
          e.data.evidence.reasons.includes('forced_off'),
      )
      expect(forcedOffAfterRecapture).toBe(true)
    }),
  )

  it.scoped('captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2', () =>
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
      const runtime = makeRuntime({ impl, layer })

      const forcedOff: StateTransactionOverrides = {
        txnLanes: { overrideMode: 'forced_off' },
      }

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
            const lastKey = `d${DEFERRED - 1}`

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'seq-1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const expectedD0 = computeValue(1, 0)
            const expectedLast1 = computeValue(1, DEFERRED - 1)
            yield* waitUntil(
              rt.getState.pipe(Effect.map((s: any) => s.d0 === expectedD0 && s[lastKey] !== expectedLast1)),
            )

            // Timing constraint:
            // while seq-1 backlog is still draining from its captured policy cache,
            // inject a new override and force seq-2 re-capture.
            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'seq-2' }, () =>
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

      const detailsList = collectResolvedDetails(events)
      expect(detailsList.length).toBeGreaterThan(0)

      const seq1 = detailsList.filter((details) => details.captureSeq === 1)
      const seq2 = detailsList.filter((details) => details.captureSeq === 2)

      expect(seq1.length).toBeGreaterThan(0)
      expect(seq2.length).toBeGreaterThan(0)

      // seq-1 is a previously captured policy snapshot and must stay lane-enabled.
      expect(seq1.every((details) => details.cacheHit && details.reason === 'cache_hit')).toBe(true)
      expect(seq1.every((details) => details.queueMode === 'lanes')).toBe(true)
      expect(seq1.every((details) => details.configScope !== 'provider')).toBe(true)
      expect(seq1.every((details) => details.recaptureRequired === false)).toBe(true)

      // seq-2 should reflect provider override after explicit re-capture.
      expect(seq2.some((details) => details.configScope === 'provider')).toBe(true)
      expect(seq2.some((details) => details.queueMode === 'fifo')).toBe(true)
      expect(seq2.every((details) => details.cacheHit && details.reason === 'cache_hit')).toBe(true)
      expect(seq2.every((details) => details.recaptureRequired === false)).toBe(true)
    }),
  )

  it.scoped('txn_lane_policy::resolved includes cacheHit/captureSeq/reason and increments on re-capture', () =>
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

      const DEFERRED = 128
      const { M, impl } = makeDeferredModule({ deferred: DEFERRED })
      const runtime = makeRuntime({ impl, layer })

      const forcedSync: StateTransactionOverrides = {
        txnLanes: { overrideMode: 'forced_sync' },
      }

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
            const lastKey = `d${DEFERRED - 1}`

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'capture-1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const expectedLast1 = computeValue(1, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[lastKey] === expectedLast1)))

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'capture-2' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 2 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            ).pipe(Effect.provideService(StateTransactionOverridesTag, forcedSync))

            const expectedLast2 = computeValue(2, DEFERRED - 1)
            yield* waitUntil(rt.getState.pipe(Effect.map((s: any) => s[lastKey] === expectedLast2)))
          }),
        ),
      )

      const detailsList = collectResolvedDetails(events)

      expect(detailsList.length).toBeGreaterThan(0)
      expect(() => JSON.stringify(detailsList)).not.toThrow()

      for (const details of detailsList) {
        expect(typeof details.cacheHit).toBe('boolean')
        expect(typeof details.captureSeq).toBe('number')
        expect(typeof details.reason).toBe('string')
        expect(typeof details.recaptureRequired).toBe('boolean')
        expect(['provider', 'runtime_module', 'runtime_default', 'builtin']).toContain(details.configScope)
        expect(['fifo', 'lanes']).toContain(details.queueMode)
      }

      const cacheHitDetails = detailsList.filter((details) => details.cacheHit && details.reason === 'cache_hit')
      expect(cacheHitDetails.length).toBeGreaterThan(0)

      const captureSeqSet = new Set(cacheHitDetails.map((details) => details.captureSeq))
      expect(captureSeqSet.has(1)).toBe(true)
      expect(captureSeqSet.has(2)).toBe(true)

      const configScopeSet = new Set(detailsList.map((details) => details.configScope))
      expect(configScopeSet.has('provider')).toBe(true)

      const queueModeSet = new Set(detailsList.map((details) => details.queueMode))
      expect(queueModeSet.has('fifo')).toBe(true)
      expect(queueModeSet.has('lanes')).toBe(true)

      const hasCacheMissRecompute = detailsList.some(
        (details) => details.reason === 'cache_miss_recompute' && details.recaptureRequired,
      )
      expect(hasCacheMissRecompute).toBe(false)

      const cacheHitRecaptureRequired = detailsList.some(
        (details) => details.reason === 'cache_hit' && details.recaptureRequired,
      )
      expect(cacheHitRecaptureRequired).toBe(false)
    }),
  )
})
