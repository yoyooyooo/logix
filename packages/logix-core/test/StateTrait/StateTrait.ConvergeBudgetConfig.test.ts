import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from './StateTrait.ConvergeAuto.fixtures.js'

const lastConvergeData = (ring: Debug.RingBufferSink): any => {
  const events = pickConvergeTraceEvents(ring.getSnapshot())
  return events.length > 0 ? (events[events.length - 1] as any).data : undefined
}

const makeTxnProgram = (M: any, name: string) =>
  Effect.gen(function* () {
    const rt = yield* M.tag
    yield* Logix.InternalContracts.runWithStateTransaction(rt as any, { kind: 'test', name }, () =>
      Effect.gen(function* () {
        const prev = yield* rt.getState
        yield* rt.setState({ ...prev, a: prev.a + 1 })
      }),
    )
  })

const runTxn = (M: any, runtime: ReturnType<typeof Logix.Runtime.make>, name: string) =>
  Effect.promise(() => runtime.runPromise(makeTxnProgram(M, name)))

describe('StateTrait converge budget config', () => {
  it.scoped('uses Runtime.stateTransaction.traitConvergeBudgetMs as budgetMs', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        base: Schema.Number,
        derived: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = Logix.Module.make('StateTraitConvergeBudgetConfig', {
        state: State,
        actions: Actions,
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.base += 1
          }),
        },
        traits: Logix.StateTrait.from(State)({
          derived: Logix.StateTrait.computed({
            deps: ['base'],
            get: (base) => base + 1,
          }),
        }),
      })

      const impl = M.implement({
        initial: { base: 0, derived: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(32)

      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: { traitConvergeBudgetMs: 123 },
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>

        expect(updates.length).toBeGreaterThan(0)

        const last = updates[updates.length - 1]
        expect(last?.traitSummary?.converge?.executionBudgetMs).toBe(123)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  describe('priority: provider > runtime_module > runtime_default > builtin', () => {
    it.scoped('defaults to executionBudgetMs=200 (builtin)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
        })

        yield* runTxn(M, runtime, 'default-builtin-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('builtin')
        expect(data.executionBudgetMs).toBe(200)
      }),
    )

    it.scoped('defaults to decisionBudgetMs=0.5 (builtin)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
        })

        yield* runTxn(M, runtime, 'default-builtin-decision-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('builtin')
        expect(data.decisionBudgetMs).toBe(0.5)
      }),
    )

    it.scoped('runtime default beats builtin (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
          stateTransaction: { traitConvergeBudgetMs: 111 },
        })

        yield* runTxn(M, runtime, 'runtime-default-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_default')
        expect(data.executionBudgetMs).toBe(111)
      }),
    )

    it.scoped('runtime moduleId override beats runtime default (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeBudgetConfig_ModuleOverride'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            traitConvergeBudgetMs: 111,
            traitConvergeOverridesByModuleId: {
              [moduleId]: { traitConvergeBudgetMs: 222 },
            },
          },
        })

        yield* runTxn(M, runtime, 'runtime-module-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_module')
        expect(data.executionBudgetMs).toBe(222)
      }),
    )

    it.scoped('provider override beats runtime moduleId override (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeBudgetConfig_ProviderOverride'
        const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
          traitConvergeOverridesByModuleId: {
            [moduleId]: { traitConvergeBudgetMs: 333 },
          },
        })

        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            traitConvergeBudgetMs: 111,
            traitConvergeOverridesByModuleId: {
              [moduleId]: { traitConvergeBudgetMs: 222 },
            },
          },
        })

        yield* Effect.promise(() =>
          runtime.runPromise(
            makeTxnProgram(M, 'provider-budget').pipe(
              Effect.provide(providerOverride as Layer.Layer<any, never, never>),
            ),
          ),
        )

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('provider')
        expect(data.executionBudgetMs).toBe(333)
      }),
    )

    it.scoped('runtime moduleId override can hot switch (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeBudgetConfig_ModuleHotSwitch'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: { traitConvergeBudgetMs: 111 },
        })

        Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, { traitConvergeBudgetMs: 222 })
        yield* runTxn(M, runtime, 't1')
        const t1 = lastConvergeData(ring)
        expect(t1).toBeDefined()
        expect(t1.configScope).toBe('runtime_module')
        expect(t1.executionBudgetMs).toBe(222)

        Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, { traitConvergeBudgetMs: 333 })
        yield* runTxn(M, runtime, 't2')
        const t2 = lastConvergeData(ring)
        expect(t2).toBeDefined()
        expect(t2.configScope).toBe('runtime_module')
        expect(t2.executionBudgetMs).toBe(333)

        Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, undefined)
        yield* runTxn(M, runtime, 't3')
        const t3 = lastConvergeData(ring)
        expect(t3).toBeDefined()
        expect(t3.configScope).toBe('runtime_default')
        expect(t3.executionBudgetMs).toBe(111)
      }),
    )

    it.scoped('runtime default beats builtin (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
          stateTransaction: { traitConvergeDecisionBudgetMs: 1.25 },
        })

        yield* runTxn(M, runtime, 'runtime-default-decision-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_default')
        expect(data.decisionBudgetMs).toBe(1.25)
      }),
    )

    it.scoped('runtime moduleId override beats runtime default (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeBudgetConfig_Decision_ModuleOverride'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            traitConvergeDecisionBudgetMs: 1.25,
            traitConvergeOverridesByModuleId: {
              [moduleId]: { traitConvergeDecisionBudgetMs: 2.25 },
            },
          },
        })

        yield* runTxn(M, runtime, 'runtime-module-decision-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_module')
        expect(data.decisionBudgetMs).toBe(2.25)
      }),
    )

    it.scoped('provider override beats runtime moduleId override (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeBudgetConfig_Decision_ProviderOverride'
        const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
          traitConvergeOverridesByModuleId: {
            [moduleId]: { traitConvergeDecisionBudgetMs: 3.25 },
          },
        })

        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            traitConvergeDecisionBudgetMs: 1.25,
            traitConvergeOverridesByModuleId: {
              [moduleId]: { traitConvergeDecisionBudgetMs: 2.25 },
            },
          },
        })

        yield* Effect.promise(() =>
          runtime.runPromise(
            makeTxnProgram(M, 'provider-decision-budget').pipe(
              Effect.provide(providerOverride as Layer.Layer<any, never, never>),
            ),
          ),
        )

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('provider')
        expect(data.decisionBudgetMs).toBe(3.25)
      }),
    )
  })
})
