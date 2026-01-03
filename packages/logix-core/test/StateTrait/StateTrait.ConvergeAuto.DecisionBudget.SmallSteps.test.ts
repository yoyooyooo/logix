import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeSmallStepsFixture = (options: {
  readonly moduleId: string
  readonly steps: number
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const shape: Record<string, Schema.Schema<any>> = {
    a: Schema.Number,
  }

  for (let i = 0; i < options.steps; i++) {
    shape[`in${i}`] = Schema.Number
    shape[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(shape) as unknown as Schema.Schema<S>
  const Actions = { noop: Schema.Void, bump: Schema.String }

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
      noop: (s: any) => s,
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

  const ring = Debug.makeRingBufferSink(512)
  const layer = Layer.mergeAll(
    Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
    Debug.diagnosticsLevel(options.diagnosticsLevel),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: options.stateTransaction,
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

describe('StateTrait converge auto decision budget (small steps)', () => {
  it.scoped('small steps should not be forced into long-term full fallback', () =>
    Effect.gen(function* () {
      const originalNow = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const perf = (globalThis as any).performance
          if (perf && typeof perf.now === 'function') {
            const original = perf.now
            perf.now = () => 0
            return { kind: 'performance', original } as const
          }

          const original = Date.now
          Date.now = () => 0
          return { kind: 'date', original } as const
        }),
        (saved) =>
          Effect.sync(() => {
            if (saved.kind === 'performance') {
              ;(globalThis.performance as any).now = saved.original
              return
            }
            Date.now = saved.original
          }),
      )

      // Keep eslint/ts happy: the finalizer restores now; the value itself is unused.
      void originalNow

      const steps = 10
      const { M, runtime, ring } = makeSmallStepsFixture({
        moduleId: 'StateTraitConvergeAuto_DecisionBudget_SmallSteps',
        steps,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeDecisionBudgetMs: 2,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag
        for (let i = 0; i < 20; i++) {
          const input = `in${i % steps}`
          yield* rt.dispatch({ _tag: 'bump', payload: input } as any)
        }
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBe(20)

      expect(decisions[0]?.executedMode).toBe('full')
      expect(decisions[0]?.reasons).toContain('cold_start')

      for (const d of decisions.slice(1)) {
        expect(d?.executedMode).toBe('dirty')
        expect(d?.reasons).toEqual(expect.not.arrayContaining(['budget_cutoff']))
      }
    }),
  )
})
