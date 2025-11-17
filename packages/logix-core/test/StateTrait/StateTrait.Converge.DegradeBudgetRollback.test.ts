import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const patchNowToTick = () =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const perf = (globalThis as any).performance as { now?: () => number } | undefined
      if (perf && typeof perf.now === 'function') {
        const original = perf.now
        let t = 0
        perf.now = () => {
          t += 1
          return t
        }
        return { kind: 'performance', original } as const
      }

      const original = Date.now
      let t = 0
      Date.now = () => {
        t += 1
        return t
      }
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

describe('StateTrait converge degrade (budget rollback)', () => {
  it.scoped('execution budget exceeded should rollback derived writes (no partial commit)', () =>
    Effect.gen(function* () {
      const originalNow = yield* patchNowToTick()
      void originalNow

      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const steps = 40
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`d${i}`] = Schema.Number
      }
      shape.in0 = Schema.Number

      const State = Schema.Struct(shape)
      type S = Schema.Schema.Type<typeof State>

      const Actions = { noop: Schema.Void }

      const traits: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
          deps: ['in0'],
          get: (in0: number) => in0 + 1,
        })
      }

      const M = Logix.Module.make('StateTraitConverge_DegradeBudgetRollback', {
        state: State as any,
        actions: Actions,
        reducers: { noop: (s: any) => s },
        traits: Logix.StateTrait.from(State as any)(traits as any),
      })

      const initial: Record<string, number> = { in0: 0 }
      for (let i = 0; i < steps; i++) {
        initial[`d${i}`] = 1
      }

      const impl = M.implement({
        initial: initial as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'full',
          traitConvergeBudgetMs: 0.5,
        },
        layer: Logix.Debug.replace([sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'budget' }, () =>
          Effect.gen(function* () {
            const prev: S = yield* rt.getState
            yield* rt.setState({ ...prev, in0: prev.in0 + 1 })
            Logix.InternalContracts.recordStatePatch(rt, 'in0', 'unknown')
          }),
        )

        const state: any = yield* rt.getState
        expect(state.in0).toBe(1)
        // converge 超预算：所有派生写回必须回滚到 base（不允许部分 commit）
        expect(state.d0).toBe(1)
        expect(state.d10).toBe(1)
        expect(state.d31).toBe(1)

        const degraded = events.find(
          (e) => e.type === 'diagnostic' && e.code === 'trait::budget_exceeded' && e.severity === 'warning',
        )
        expect(degraded).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
