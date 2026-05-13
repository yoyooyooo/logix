import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import type { Draft } from '../../src/Logic.js'
import * as Debug from '../../src/internal/debug-api.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from './FieldKernel.ConvergeAuto.fixtures.js'

const lastConvergeData = (ring: Debug.RingBufferSink): any => {
  const events = pickConvergeTraceEvents(ring.getSnapshot())
  return events.length > 0 ? (events[events.length - 1] as any).data : undefined
}

const makeTxnProgram = (M: any, name: string) =>
  Effect.gen(function* () {
    const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
    yield* FieldContracts.runWithStateTransaction(rt as any, { kind: 'test', name }, () =>
      Effect.gen(function* () {
        const prev = yield* rt.getState
        yield* rt.setState({ ...prev, a: prev.a + 1 })
      }),
    )
  })

const runTxn = (M: any, runtime: ReturnType<typeof Logix.Runtime.make>, name: string) =>
  Effect.promise(() => runtime.runPromise(makeTxnProgram(M, name)))

describe('FieldKernel converge budget config', () => {
  it.effect('uses Runtime.stateTransaction.fieldConvergeBudgetMs as budgetMs', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        base: Schema.Number,
        derived: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConvergeBudgetConfig', {
  state: State,
  actions: Actions,
  reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Draft<S>) => {
            draft.base += 1
          }),
        }
}), FieldContracts.fieldFrom(State)({
          derived: FieldContracts.fieldComputed({
            deps: ['base'],
            get: (base) => base + 1,
          }),
        }))

      const programModule = Logix.Program.make(M, {
        initial: { base: 0, derived: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(32)

      const runtime = Logix.Runtime.make(programModule, {
        stateTransaction: { fieldConvergeBudgetMs: 123 },
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const updates = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>

        expect(updates.length).toBeGreaterThan(0)

        const last = updates[updates.length - 1]
        expect(last?.fieldSummary?.converge?.executionBudgetMs).toBe(123)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  describe('priority: provider > runtime_module > runtime_default > builtin', () => {
    it.effect('defaults to executionBudgetMs=200 (builtin)', () =>
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

    it.effect('defaults to decisionBudgetMs=0.5 (builtin)', () =>
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

    it.effect('runtime default beats builtin (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
          stateTransaction: { fieldConvergeBudgetMs: 111 },
        })

        yield* runTxn(M, runtime, 'runtime-default-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_default')
        expect(data.executionBudgetMs).toBe(111)
      }),
    )

    it.effect('runtime moduleId override beats runtime default (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeBudgetConfig_ModuleOverride'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            fieldConvergeBudgetMs: 111,
            fieldConvergeOverridesByModuleId: {
              [moduleId]: { fieldConvergeBudgetMs: 222 },
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

    it.effect('provider override beats runtime moduleId override (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeBudgetConfig_ProviderOverride'
        const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
          fieldConvergeOverridesByModuleId: {
            [moduleId]: { fieldConvergeBudgetMs: 333 },
          },
        })

        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            fieldConvergeBudgetMs: 111,
            fieldConvergeOverridesByModuleId: {
              [moduleId]: { fieldConvergeBudgetMs: 222 },
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

    it.effect('runtime moduleId override can hot switch (executionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeBudgetConfig_ModuleHotSwitch'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: { fieldConvergeBudgetMs: 111 },
        })

        yield* Logix.Runtime.setFieldConvergeOverride(runtime, moduleId, { fieldConvergeBudgetMs: 222 })
        yield* runTxn(M, runtime, 't1')
        const t1 = lastConvergeData(ring)
        expect(t1).toBeDefined()
        expect(t1.configScope).toBe('runtime_module')
        expect(t1.executionBudgetMs).toBe(222)

        yield* Logix.Runtime.setFieldConvergeOverride(runtime, moduleId, { fieldConvergeBudgetMs: 333 })
        yield* runTxn(M, runtime, 't2')
        const t2 = lastConvergeData(ring)
        expect(t2).toBeDefined()
        expect(t2.configScope).toBe('runtime_module')
        expect(t2.executionBudgetMs).toBe(333)

        yield* Logix.Runtime.setFieldConvergeOverride(runtime, moduleId, undefined)
        yield* runTxn(M, runtime, 't3')
        const t3 = lastConvergeData(ring)
        expect(t3).toBeDefined()
        expect(t3.configScope).toBe('runtime_default')
        expect(t3.executionBudgetMs).toBe(111)
      }),
    )

    it.effect('runtime default beats builtin (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const { M, ring, runtime } = makeConvergeAutoFixture({
          diagnosticsLevel: 'light',
          stateTransaction: { fieldConvergeDecisionBudgetMs: 1.25 },
        })

        yield* runTxn(M, runtime, 'runtime-default-decision-budget')

        const data = lastConvergeData(ring)
        expect(data).toBeDefined()
        expect(data.configScope).toBe('runtime_default')
        expect(data.decisionBudgetMs).toBe(1.25)
      }),
    )

    it.effect('runtime moduleId override beats runtime default (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeBudgetConfig_Decision_ModuleOverride'
        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            fieldConvergeDecisionBudgetMs: 1.25,
            fieldConvergeOverridesByModuleId: {
              [moduleId]: { fieldConvergeDecisionBudgetMs: 2.25 },
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

    it.effect('provider override beats runtime moduleId override (decisionBudgetMs)', () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeBudgetConfig_Decision_ProviderOverride'
        const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
          fieldConvergeOverridesByModuleId: {
            [moduleId]: { fieldConvergeDecisionBudgetMs: 3.25 },
          },
        })

        const { M, ring, runtime } = makeConvergeAutoFixture({
          moduleId,
          diagnosticsLevel: 'light',
          stateTransaction: {
            fieldConvergeDecisionBudgetMs: 1.25,
            fieldConvergeOverridesByModuleId: {
              [moduleId]: { fieldConvergeDecisionBudgetMs: 2.25 },
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
