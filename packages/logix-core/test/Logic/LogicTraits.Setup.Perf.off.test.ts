import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

describe('LogicTraits setup · perf baseline (Diagnostics=off)', () => {
  it.effect('module init + traits merge/install p95 baseline', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 30)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)

      const baseFields: Record<string, Schema.Schema<any>> = {}
      const computedFields: Record<string, Schema.Schema<any>> = {}
      const linkedFields: Record<string, Schema.Schema<any>> = {}

      for (let i = 0; i < 50; i++) {
        baseFields[`v${i}`] = Schema.Number
        computedFields[`d${i}`] = Schema.Number
        linkedFields[`l${i}`] = Schema.Number
      }

      const State = Schema.Struct({
        ...baseFields,
        ...computedFields,
        ...linkedFields,
      })

      const Actions = { noop: Schema.Void }

      type State = Schema.Schema.Type<typeof State>

      const allTraits = Logix.StateTrait.from(State)({
        ...Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [
            `d${i}`,
            Logix.StateTrait.computed({
              deps: [`v${i}`],
              get: (v) => v,
            }),
          ]),
        ),
        ...Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [
            `l${i}`,
            Logix.StateTrait.link({
              from: `d${i}`,
            }),
          ]),
        ),
      })

      const shards: Array<Record<string, unknown>> = [{}, {}, {}, {}]
      const traitEntries = Object.entries(allTraits as any)
      for (let i = 0; i < traitEntries.length; i++) {
        const shard = i % shards.length
        const [k, v] = traitEntries[i]!
        shards[shard]![k] = v
      }

      const M = Logix.Module.make('LogicTraitsPerfOff', {
        state: State,
        actions: Actions,
      })

      const makeLogic = (id: string, traits: Record<string, unknown>) =>
        M.logic(
          ($) => ({
            setup: Effect.sync(() => {
              $.traits.declare(traits)
            }),
            run: Effect.void,
          }),
          { id },
        )

      const L1 = makeLogic('L#1', shards[0]!)
      const L2 = makeLogic('L#2', shards[1]!)
      const L3 = makeLogic('L#3', shards[2]!)
      const L4 = makeLogic('L#4', shards[3]!)

      const initial: any = {}
      for (let i = 0; i < 50; i++) {
        initial[`v${i}`] = i
        initial[`d${i}`] = 0
        initial[`l${i}`] = 0
      }

      const Impl = M.implement({
        initial: initial as State,
        logics: [L1, L2, L3, L4],
      })

      const runOnce = Effect.promise(() => {
        const runtime = Logix.Runtime.make(Impl)
        return runtime
          .runPromise(
            Effect.gen(function* () {
              yield* M.tag
            }) as Effect.Effect<void, never, any>,
          )
          .finally(() => runtime.dispose())
      })

      const samples: number[] = []

      // warmup
      for (let i = 0; i < warmup; i++) {
        const t0 = globalThis.performance.now()
        yield* runOnce
        const dt = globalThis.performance.now() - t0
        samples.push(dt)
      }

      samples.length = 0

      // measure
      for (let i = 0; i < iterations; i++) {
        const t0 = globalThis.performance.now()
        yield* runOnce
        const dt = globalThis.performance.now() - t0
        samples.push(dt)
      }

      const p50 = quantile(samples, 0.5)
      const p95 = quantile(samples, 0.95)

      // Intended for manually filling specs/023-logic-traits-setup/plan.md (Constitution Check: performance budget).
      console.log(
        `[perf] LogicTraits.Setup.off traits=100 contribs=4 iters=${iterations} p50=${p50.toFixed(
          2,
        )}ms p95=${p95.toFixed(2)}ms`,
      )

      expect(samples.length).toBe(iterations)
    }),
  )
})
