import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

const makePlanCacheFixture = (options: { readonly moduleId: string; readonly steps: number }) => {
  const shape: Record<string, Schema.Schema<any>> = {
    a: Schema.Number,
  }

  for (let i = 0; i < options.steps; i++) {
    shape[`in${i}`] = Schema.Number
    shape[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(shape) as unknown as Schema.Schema<S>
  const Actions = { bump: Schema.String }

  const traits: Record<string, any> = {}
  for (let i = 0; i < options.steps; i++) {
    const input = `in${i}`
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [input],
      get: (value: any) => (value as number) + 1,
    })
  }

  const M = Logix.Module.make(options.moduleId, {
    state: State,
    actions: Actions,
    reducers: {
      bump: Logix.Module.Reducer.mutate((draft, key: string) => {
        draft[key] = (draft[key] ?? 0) + 1
      }),
    },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = { a: 0 }
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
    Debug.diagnosticsLevel('light'),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      traitConvergeMode: 'auto',
      traitConvergeBudgetMs: 100_000,
      traitConvergeDecisionBudgetMs: 100_000,
    },
    layer,
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

describe('StateTrait converge auto plan cache protection', () => {
  it.scoped('enforces capacity/eviction and triggers low-hit-rate self-protection', () =>
    Effect.gen(function* () {
      const steps = 200
      const { M, runtime, ring } = makePlanCacheFixture({
        moduleId: 'StateTraitConvergeAuto_PlanCacheProtection',
        steps,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag
        for (let i = 0; i < steps; i++) {
          const input = `in${i}`
          yield* rt.dispatch({ _tag: 'bump', payload: input } as any)
        }
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBe(steps)

      const last = decisions[decisions.length - 1]!
      expect(last.cache).toBeDefined()
      expect(typeof last.cache.capacity).toBe('number')
      expect(typeof last.cache.size).toBe('number')
      expect(last.cache.size).toBeLessThanOrEqual(last.cache.capacity)
      expect(last.cache.evicts).toBeGreaterThan(0)

      expect(last.cache.disabled).toBe(true)
      expect(last.cache.disableReason).toBe('low_hit_rate')
    }),
  )
})
