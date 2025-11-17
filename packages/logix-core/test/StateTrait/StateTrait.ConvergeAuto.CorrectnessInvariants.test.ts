import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeTestRuntime = (options: {
  readonly moduleId: string
  readonly state: Schema.Schema<any>
  readonly traits: any
  readonly initial: Record<string, unknown>
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const Actions = { noop: Schema.Void, bump: Schema.String }

  const M = Logix.Module.make(options.moduleId, {
    state: options.state as any,
    actions: Actions,
    reducers: {
      noop: (s: any) => s,
      bump: Logix.Module.Reducer.mutate((draft, key: string) => {
        const record = draft as Record<string, unknown>
        const prev = record[key]
        if (typeof prev === 'number') {
          record[key] = prev + 1
        }
      }),
    },
    traits: options.traits,
  })

  const impl = M.implement({
    initial: options.initial as any,
    logics: [],
  })

  const ring = Debug.makeRingBufferSink(2048)
  const layer = Layer.mergeAll(
    Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
    Debug.diagnosticsLevel(options.diagnosticsLevel),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(impl, {
    layer,
    stateTransaction: options.stateTransaction,
  })

  return { M, runtime, ring }
}

const pickDecisionSummaries = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'trace:trait:converge' }> => e.type === 'trace:trait:converge',
    )
    .map((e) => (e as any).data)

const pickConfigErrors = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'diagnostic' }> =>
        e.type === 'diagnostic' && e.code === 'state_trait::config_error',
    )

describe('StateTrait converge auto correctness invariants', () => {
  it.scoped('unknown_write should fall back to full even after a cache hit', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const traits: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const spec = Logix.StateTrait.from(State as any)(traits as any)

      const initial: Record<string, unknown> = {}
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'StateTraitConvergeAuto_Correctness_UnknownWrite',
        state: State as any,
        traits: spec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        // Writing state without field-level patches -> dirtyPaths="*" -> unknown_write.
        yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'unknown' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, in0: (prev as any).in0 + 1 })
          }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(4)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const last = decisions[decisions.length - 1]
      expect(last?.executedMode).toBe('full')
      expect(last?.reasons).toContain('unknown_write')
    }),
  )

  it.scoped('multiple writers should hard fail and block commit (not swallowed by cache/self-protection)', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const baseTraits: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        baseTraits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const baseSpec = Logix.StateTrait.from(State as any)(baseTraits as any)

      const initial: Record<string, unknown> = {}
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'StateTraitConvergeAuto_Correctness_MultipleWriters',
        state: State as any,
        traits: baseSpec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        const makeDupWriter = (delta: number) => ({
          ...(Logix.StateTrait.computed<any, any, any>({
            deps: ['in0'],
            get: (in0: any) => (in0 as number) + delta,
          }) as any),
          // Force writing to the same field to conflict with baseSpec's d0 writer.
          fieldPath: 'd0',
        })

        const invalidSpec = Logix.StateTrait.from(State as any)({
          ...(baseSpec as any),
          $root: Logix.StateTrait.node({
            computed: {
              w1: makeDupWriter(1),
              w2: makeDupWriter(2),
            },
          }),
        })

        const invalidProgram = Logix.StateTrait.build(State as any, invalidSpec as any)
        Logix.InternalContracts.registerStateTraitProgram(rt, invalidProgram)

        const before = yield* rt.getState
        const exit = yield* Effect.exit(bump('in0'))
        expect(exit._tag).toBe('Failure')
        const after = yield* rt.getState
        expect(after).toEqual(before)
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(3)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const errors = pickConfigErrors(ring)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]?.kind).toBe('state_trait_config_error:MULTIPLE_WRITERS')
    }),
  )

  it.scoped('computed/link cycle should hard fail and block commit (not swallowed by cache/self-protection)', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = { a: Schema.Number, b: Schema.Number }
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const baseTraits: Record<string, any> = {
        a: Logix.StateTrait.computed<any, any, any>({
          deps: ['in0'],
          get: (in0: any) => (in0 as number) + 1,
        }),
        b: Logix.StateTrait.computed<any, any, any>({
          deps: ['in1'],
          get: (in1: any) => (in1 as number) + 1,
        }),
      }
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        baseTraits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const baseSpec = Logix.StateTrait.from(State as any)(baseTraits as any)

      const initial: Record<string, unknown> = { a: 0, b: 0 }
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'StateTraitConvergeAuto_Correctness_CycleDetected',
        state: State as any,
        traits: baseSpec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        const cycleSpec = Logix.StateTrait.from(State as any)({
          ...(baseSpec as any),
          a: Logix.StateTrait.computed<any, any, any>({
            deps: ['b'],
            get: (b: any) => (b as number) + 1,
          }),
          b: Logix.StateTrait.computed<any, any, any>({
            deps: ['a'],
            get: (a: any) => (a as number) + 1,
          }),
        })

        const cycleProgram = Logix.StateTrait.build(State as any, cycleSpec as any)
        Logix.InternalContracts.registerStateTraitProgram(rt, cycleProgram)

        const before = yield* rt.getState
        const exit = yield* Effect.exit(bump('in0'))
        expect(exit._tag).toBe('Failure')
        const after = yield* rt.getState
        expect(after).toEqual(before)
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(3)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const errors = pickConfigErrors(ring)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]?.kind).toBe('state_trait_config_error:CYCLE_DETECTED')
    }),
  )
})
