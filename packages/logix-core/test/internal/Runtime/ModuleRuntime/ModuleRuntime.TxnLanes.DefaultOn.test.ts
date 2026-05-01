import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
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

  const fieldDeclarations: Record<string, any> = {}
  for (let i = 0; i < args.deferred; i++) {
    const key = `d${i}`
    fieldDeclarations[key] = FieldContracts.fieldComputed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ModuleRuntime_TxnLanes_DefaultOn', {
  state: State as any,
  actions: Actions,
  reducers: { noop: (s: any) => s }
}), FieldContracts.fieldFrom(State as any)(fieldDeclarations as any))

  const initial: Record<string, number> = { a: 0 }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const programModule = Logix.Program.make(M, {
    initial: initial as any,
    logics: [],
  })

  return { M, programModule }
}

describe('ModuleRuntime TxnLanes (062 default-on)', () => {
  it.effect('enables txn lanes by default (nonUrgent evidence)', () =>
    Effect.gen(function* () {
      const events: Array<CoreDebug.Event> = []
      const sink: CoreDebug.Sink = {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(CoreDebug.diagnosticsLevel('full'), CoreDebug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 64
      const { M, programModule } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(programModule, {
        layer,
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                FieldContracts.recordStatePatch(rt, 'a', 'unknown')
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
      expect(evidence?.policy?.enabled).toBe(true)
      expect(evidence?.policy?.queueMode).toBe('lanes')
      expect(evidence?.policy?.configScope).toBe('builtin')
    }),
  )

  it.effect('overrideMode=forced_off disables lanes (runtime_default) and emits forced_off evidence', () =>
    Effect.gen(function* () {
      const events: Array<CoreDebug.Event> = []
      const sink: CoreDebug.Sink = {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(CoreDebug.diagnosticsLevel('full'), CoreDebug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 32
      const { M, programModule } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(programModule, {
        layer,
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { overrideMode: 'forced_off' },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                FieldContracts.recordStatePatch(rt, 'a', 'unknown')
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
      expect(evidence?.policy?.enabled).toBe(false)
      expect(evidence?.policy?.overrideMode).toBe('forced_off')
      expect(evidence?.policy?.queueMode).toBe('fifo')
      expect(evidence?.policy?.configScope).toBe('runtime_default')
    }),
  )

  it.effect('overrideMode=forced_sync disables lanes (runtime_default) and emits forced_sync evidence', () =>
    Effect.gen(function* () {
      const events: Array<CoreDebug.Event> = []
      const sink: CoreDebug.Sink = {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(CoreDebug.diagnosticsLevel('full'), CoreDebug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 32
      const { M, programModule } = makeDeferredModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(programModule, {
        layer,
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { overrideMode: 'forced_sync' },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                FieldContracts.recordStatePatch(rt, 'a', 'unknown')
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
      expect(evidence?.policy?.enabled).toBe(false)
      expect(evidence?.policy?.overrideMode).toBe('forced_sync')
      expect(evidence?.policy?.queueMode).toBe('fifo')
      expect(evidence?.policy?.configScope).toBe('runtime_default')
    }),
  )
})
