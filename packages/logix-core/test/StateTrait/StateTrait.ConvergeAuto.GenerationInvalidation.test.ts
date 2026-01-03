import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeGenerationFixture = (options: {
  readonly moduleId: string
  readonly steps: number
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const shape: Record<string, Schema.Schema<any>> = {
    a: Schema.Number,
    inExtra: Schema.Number,
    dExtra: Schema.Number,
  }

  for (let i = 0; i < options.steps; i++) {
    shape[`in${i}`] = Schema.Number
    shape[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(shape) as unknown as Schema.Schema<S>
  const Actions = { bump: Schema.String }

  const baseTraits: Record<string, any> = {}
  for (let i = 0; i < options.steps; i++) {
    const input = `in${i}`
    baseTraits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [input],
      get: (value: any) => (value as number) + 1,
    })
  }

  const baseSpec = Logix.StateTrait.from(State as any)(baseTraits as any)

  const M = Logix.Module.make(options.moduleId, {
    state: State,
    actions: Actions,
    reducers: {
      bump: Logix.Module.Reducer.mutate((draft, key: string) => {
        draft[key] = (draft[key] ?? 0) + 1
      }),
    },
    traits: baseSpec,
  })

  const initial: Record<string, number> = { a: 0, inExtra: 0, dExtra: 0 }
  for (let i = 0; i < options.steps; i++) {
    initial[`in${i}`] = 0
    initial[`d${i}`] = 1
  }

  const impl = M.implement({
    initial,
    logics: [],
  })

  const ring = Debug.makeRingBufferSink(1024)
  const layer = Layer.mergeAll(
    Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
    Debug.diagnosticsLevel(options.diagnosticsLevel),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: options.stateTransaction,
    layer,
  })

  return { M, runtime, ring, State, baseSpec }
}

const pickDecisionSummaries = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'trace:trait:converge' }> => e.type === 'trace:trait:converge',
    )
    .map((e) => (e as any).data)

describe('StateTrait converge auto generation invalidation', () => {
  it.scoped('generation bump strictly invalidates cache (missReason=generation_bumped)', () =>
    Effect.gen(function* () {
      const steps = 10
      const { M, runtime, ring, State, baseSpec } = makeGenerationFixture({
        moduleId: 'StateTraitConvergeAuto_GenerationInvalidation',
        steps,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        const runTxn = (_name: string, input: string) => rt.dispatch({ _tag: 'bump', payload: input } as any)

        yield* runTxn('t1', 'in0')
        yield* runTxn('t2', 'in0')
        yield* runTxn('t3', 'in0')

        const nextSpec = Logix.StateTrait.from(State as any)({
          ...(baseSpec as any),
          dExtra: Logix.StateTrait.computed<any, any, any>({
            deps: ['inExtra'],
            get: (inExtra: any) => (inExtra as number) + 1,
          }),
        })

        const nextProgram = Logix.StateTrait.build(State as any, nextSpec as any)
        Logix.InternalContracts.registerStateTraitProgram(rt, nextProgram)

        yield* runTxn('t4', 'in0')
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBe(4)

      const second = decisions[1]!
      expect(second.cache.hit).toBe(false)

      const third = decisions[2]!
      expect(third.cache.hit).toBe(true)

      const fourth = decisions[3]!
      expect(fourth.cache.hit).toBe(false)
      expect(fourth.cache.missReason).toBe('generation_bumped')
      expect(fourth.generation.generationBumpCount).toBeGreaterThanOrEqual(1)
      expect(fourth.generation.lastBumpReason).toBe('writers_changed')
    }),
  )

  it.scoped('generation thrash triggers cache self-protection (disableReason=generation_thrash)', () =>
    Effect.gen(function* () {
      const steps = 10
      const { M, runtime, ring, State, baseSpec } = makeGenerationFixture({
        moduleId: 'StateTraitConvergeAuto_GenerationThrash',
        steps,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        const runTxn = (_name: string, input: string) => rt.dispatch({ _tag: 'bump', payload: input } as any)

        yield* runTxn('t1', 'in0')
        yield* runTxn('t2', 'in0')

        const stableProgram = Logix.StateTrait.build(State as any, baseSpec as any)

        Logix.InternalContracts.registerStateTraitProgram(rt, stableProgram, {
          bumpReason: 'imports_changed',
        })
        Logix.InternalContracts.registerStateTraitProgram(rt, stableProgram, {
          bumpReason: 'imports_changed',
        })
        Logix.InternalContracts.registerStateTraitProgram(rt, stableProgram, {
          bumpReason: 'imports_changed',
        })

        yield* runTxn('t3', 'in0')
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBe(3)

      const last = decisions[2]!
      expect(last.cache.disabled).toBe(true)
      expect(last.cache.disableReason).toBe('generation_thrash')
    }),
  )
})
