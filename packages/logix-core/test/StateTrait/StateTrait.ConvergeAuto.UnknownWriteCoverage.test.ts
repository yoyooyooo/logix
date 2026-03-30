import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const INPUT_COUNT = 64
const BROAD_WRITE_COUNT = 58

type DecisionSummary = {
  readonly requestedMode: string
  readonly executedMode: string
  readonly reasons: ReadonlyArray<string>
  readonly dirty?: {
    readonly dirtyAll?: boolean
    readonly reason?: string
    readonly rootCount?: number
  }
  readonly stepStats?: {
    readonly executedSteps?: number
    readonly skippedSteps?: number
  }
}

const broadKeys = Array.from({ length: BROAD_WRITE_COUNT }, (_, i) => `in${i}`)

const makeFixture = (moduleId: string, stateTransaction?: RuntimeOptions['stateTransaction']) => {
  const shape: Record<string, Schema.Schema<any>> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
    shape[`in${i}`] = Schema.Number
    shape[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(shape) as unknown as Schema.Schema<S>
  const Actions = {
    mutateMany: Schema.Array(Schema.String),
    replaceOne: Schema.String,
  }

  const traits: Record<string, any> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
    const input = `in${i}`
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [input],
      get: (value: any) => (value as number) + 1,
    })
  }

  const M = Logix.Module.make(moduleId, {
    state: State,
    actions: Actions,
    reducers: {
      mutateMany: Logix.Module.Reducer.mutate((draft: Record<string, number>, keys: ReadonlyArray<string>) => {
        for (const key of keys) {
          const prev = draft[key]
          if (typeof prev === 'number') {
            draft[key] = prev + 1
          }
        }
      }),
      replaceOne: (state: Record<string, number>, action: { readonly _tag: 'replaceOne'; readonly payload: string }) => {
        const key = action.payload
        const prev = state[key]
        if (typeof prev !== 'number') return state
        return { ...state, [key]: prev + 1 }
      },
    },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
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
    layer,
    stateTransaction: {
      traitConvergeMode: 'auto',
      traitConvergeBudgetMs: 100_000,
      traitConvergeDecisionBudgetMs: 100_000,
      ...stateTransaction,
    },
  })

  const latestDecision = (): DecisionSummary => {
    const decisions = ring
      .getSnapshot()
      .filter(
        (e): e is Extract<Debug.Event, { readonly type: 'trace:trait:converge' }> => e.type === 'trace:trait:converge',
      )
      .map((e) => (e as any).data as DecisionSummary)
    const latest = decisions.length > 0 ? decisions[decisions.length - 1] : undefined
    expect(latest).toBeDefined()
    return latest!
  }

  return { M, runtime, ring, latestDecision }
}

describe('StateTrait converge auto unknown-write coverage', () => {
  it.effect('setState single-field replace should stop degrading to unknown_write', () =>
    Effect.gen(function* () {
      const { M, runtime, ring, latestDecision } = makeFixture('StateTraitConvergeAuto_UnknownWrite_setState')

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'mutateMany', payload: ['in0'] } as any)
          }),
        ),
      )

      ring.clear()

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'setState_single_field' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, in0: prev.in0 + 1 })
              }),
            )
          }),
        ),
      )

      const latest = latestDecision()
      console.log(
        `[perf] unknown-write-coverage setState ` +
          `executedMode=${latest.executedMode} ` +
          `reasons=${latest.reasons.join('|')} ` +
          `executedSteps=${latest.stepStats?.executedSteps ?? '-'} ` +
          `skippedSteps=${latest.stepStats?.skippedSteps ?? '-'}`,
      )
      expect(latest.requestedMode).toBe('auto')
      expect(latest.executedMode).toBe('dirty')
      expect(latest.reasons).not.toContain('unknown_write')
      expect(latest.dirty?.dirtyAll).not.toBe(true)
      expect((latest.stepStats?.executedSteps ?? INPUT_COUNT)).toBeLessThan(INPUT_COUNT)

      yield* Effect.promise(() => runtime.dispose())
    }),
  )

  it.effect('plain reducer whole-state replace should stop degrading to unknown_write', () =>
    Effect.gen(function* () {
      const { M, runtime, ring, latestDecision } = makeFixture('StateTraitConvergeAuto_UnknownWrite_reducer')

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'mutateMany', payload: ['in0'] } as any)
          }),
        ),
      )

      ring.clear()

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'replaceOne', payload: 'in0' } as any)
          }),
        ),
      )

      const latest = latestDecision()
      console.log(
        `[perf] unknown-write-coverage reducerReplace ` +
          `executedMode=${latest.executedMode} ` +
          `reasons=${latest.reasons.join('|')} ` +
          `executedSteps=${latest.stepStats?.executedSteps ?? '-'} ` +
          `skippedSteps=${latest.stepStats?.skippedSteps ?? '-'}`,
      )
      expect(latest.requestedMode).toBe('auto')
      expect(latest.executedMode).toBe('dirty')
      expect(latest.reasons).not.toContain('unknown_write')
      expect(latest.dirty?.dirtyAll).not.toBe(true)
      expect((latest.stepStats?.executedSteps ?? INPUT_COUNT)).toBeLessThan(INPUT_COUNT)

      yield* Effect.promise(() => runtime.dispose())
    }),
  )

  it.effect('near_full admission should remain intact for broad covered writes', () =>
    Effect.gen(function* () {
      const { M, runtime, ring, latestDecision } = makeFixture('StateTraitConvergeAuto_UnknownWrite_nearFull')

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'mutateMany', payload: ['in0'] } as any)
          }),
        ),
      )

      ring.clear()

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'mutateMany', payload: broadKeys } as any)
          }),
        ),
      )

      const latest = latestDecision()
      console.log(
        `[perf] unknown-write-coverage nearFull ` +
          `executedMode=${latest.executedMode} ` +
          `reasons=${latest.reasons.join('|')} ` +
          `executedSteps=${latest.stepStats?.executedSteps ?? '-'} ` +
          `skippedSteps=${latest.stepStats?.skippedSteps ?? '-'}`,
      )
      expect(latest.requestedMode).toBe('auto')
      expect(latest.executedMode).toBe('full')
      expect(latest.reasons).toContain('near_full')

      yield* Effect.promise(() => runtime.dispose())
    }),
  )
})
