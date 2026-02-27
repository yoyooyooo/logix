import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Ref } from 'effect'
import { performance } from 'node:perf_hooks'

type DedupeState = {
  readonly hasPrev: boolean
  readonly prev: number
}

type PerfSummary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly meanMs: number
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): PerfSummary => {
  const n = samples.length
  const meanMs = n > 0 ? samples.reduce((acc, cur) => acc + cur, 0) / n : 0
  return {
    n,
    p50Ms: quantile(samples, 0.5),
    p95Ms: quantile(samples, 0.95),
    meanMs,
  }
}

const makeRng = (seedInput: number): (() => number) => {
  let seed = seedInput >>> 0
  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 0xffffffff
  }
}

const makeDataset = (args: {
  readonly events: number
  readonly duplicateRatio: number
  readonly uniquePool: number
  readonly seed: number
}): {
  readonly values: ReadonlyArray<number>
  readonly duplicateRatio: number
  readonly uniquePool: number
} => {
  const duplicateRatio = Math.min(0.999, Math.max(0, args.duplicateRatio))
  const uniquePool = Math.max(2, Math.floor(args.uniquePool))
  const rng = makeRng(args.seed)
  const values: number[] = []

  let current = Math.floor(rng() * uniquePool)
  values.push(current)
  for (let i = 1; i < args.events; i++) {
    if (rng() >= duplicateRatio) {
      const next = Math.floor(rng() * uniquePool)
      current = next === current ? (next + 1) % uniquePool : next
    }
    values.push(current)
  }

  return {
    values,
    duplicateRatio,
    uniquePool,
  }
}

const countUniqueConsecutive = (values: ReadonlyArray<number>): number => {
  if (values.length === 0) return 0
  let accepted = 1
  let prev = values[0]!
  for (let i = 1; i < values.length; i++) {
    const value = values[i]!
    if (Object.is(prev, value)) {
      continue
    }
    accepted++
    prev = value
  }
  return accepted
}

const runLegacyDedupe = (values: ReadonlyArray<number>): Effect.Effect<number> =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make<DedupeState>({ hasPrev: false, prev: 0 })
    let accepted = 0

    for (const value of values) {
      const state = yield* Ref.get(stateRef)
      if (state.hasPrev && Object.is(state.prev, value)) {
        continue
      }
      yield* Ref.set(stateRef, { hasPrev: true, prev: value })
      accepted++
    }

    return accepted
  })

const runOptimizedDedupe = (values: ReadonlyArray<number>): Effect.Effect<number> =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make<DedupeState>({ hasPrev: false, prev: 0 })
    let accepted = 0

    for (const value of values) {
      const shouldEmit = yield* Ref.modify(stateRef, (state) => {
        if (state.hasPrev && Object.is(state.prev, value)) {
          return [false, state] as const
        }
        return [true, { hasPrev: true, prev: value }] as const
      })
      if (shouldEmit) {
        accepted++
      }
    }

    return accepted
  })

const benchmarkCase = (args: {
  readonly iterations: number
  readonly warmup: number
  readonly values: ReadonlyArray<number>
  readonly run: (values: ReadonlyArray<number>) => Effect.Effect<number>
}): Effect.Effect<{ readonly summary: PerfSummary; readonly acceptedCount: number }> =>
  Effect.gen(function* () {
    const warmup = Math.max(0, args.warmup)
    const iterations = Math.max(1, args.iterations)

    for (let i = 0; i < warmup; i++) {
      yield* args.run(args.values)
    }

    const samples: number[] = []
    let acceptedCount = -1

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now()
      const accepted = yield* args.run(args.values)
      const dt = performance.now() - t0
      samples.push(dt)
      if (acceptedCount === -1) {
        acceptedCount = accepted
      } else {
        expect(accepted).toBe(acceptedCount)
      }
    }

    return {
      summary: summarize(samples),
      acceptedCount,
    }
  })

describe('process: trigger moduleStateChange dedupe perf evidence (Diagnostics=off)', () => {
  it.effect('should keep behavior stable and print legacy/optimized metrics', () =>
    Effect.gen(function* () {
      const events = Number(process.env.LOGIX_PERF_EVENTS ?? 120000)
      const duplicateRatio = Number(process.env.LOGIX_PERF_DUPLICATE_RATIO ?? 0.9)
      const uniquePool = Number(process.env.LOGIX_PERF_UNIQUE_POOL ?? 2048)
      const seed = Number(process.env.LOGIX_PERF_SEED ?? 20260225)
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 30)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)

      const dataset = makeDataset({
        events: Math.max(1, events),
        duplicateRatio,
        uniquePool,
        seed,
      })
      const { values, duplicateRatio: actualDuplicateRatio, uniquePool: actualUniquePool } = dataset

      const expectedAccepted = countUniqueConsecutive(values)
      const legacyAccepted = yield* runLegacyDedupe(values)
      const optimizedAccepted = yield* runOptimizedDedupe(values)

      expect(legacyAccepted).toBe(expectedAccepted)
      expect(optimizedAccepted).toBe(expectedAccepted)

      const legacy = yield* benchmarkCase({
        iterations,
        warmup,
        values,
        run: runLegacyDedupe,
      })
      const optimized = yield* benchmarkCase({
        iterations,
        warmup,
        values,
        run: runOptimizedDedupe,
      })

      expect(legacy.acceptedCount).toBe(expectedAccepted)
      expect(optimized.acceptedCount).toBe(expectedAccepted)
      expect(legacy.summary.n).toBe(Math.max(1, iterations))
      expect(optimized.summary.n).toBe(Math.max(1, iterations))

      const p95Ratio =
        legacy.summary.p95Ms > 0 && Number.isFinite(legacy.summary.p95Ms)
          ? optimized.summary.p95Ms / legacy.summary.p95Ms
          : Number.NaN

      const evidence = {
        scenario: 'process.trigger.moduleStateChange.dedupe.off',
        dataset: {
          events: values.length,
          duplicateRatio: actualDuplicateRatio,
          uniquePool: actualUniquePool,
          seed: seed >>> 0,
        },
        run: {
          iterations: Math.max(1, iterations),
          warmup: Math.max(0, warmup),
        },
        behavior: {
          expectedAccepted,
          legacyAccepted: legacy.acceptedCount,
          optimizedAccepted: optimized.acceptedCount,
        },
        metrics: {
          legacy: legacy.summary,
          optimized: optimized.summary,
          ratio: {
            p95OptimizedOverLegacy: p95Ratio,
          },
        },
      } as const

      console.log(
        `[perf] Process.Trigger.ModuleStateChange.Dedupe.off events=${values.length} duplicateRatio=${actualDuplicateRatio.toFixed(
          3,
        )} iters=${Math.max(1, iterations)} legacy.p50=${legacy.summary.p50Ms.toFixed(
          3,
        )}ms legacy.p95=${legacy.summary.p95Ms.toFixed(3)}ms optimized.p50=${optimized.summary.p50Ms.toFixed(
          3,
        )}ms optimized.p95=${optimized.summary.p95Ms.toFixed(3)}ms p95.ratio=${Number.isFinite(p95Ratio) ? p95Ratio.toFixed(3) : 'NaN'}`,
      )
      console.log(`[perf:evidence] ${JSON.stringify(evidence)}`)
    }),
    15000,
  )
})
