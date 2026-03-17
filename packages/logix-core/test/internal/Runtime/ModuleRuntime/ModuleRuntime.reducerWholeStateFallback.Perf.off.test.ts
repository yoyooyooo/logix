import { describe, it, expect } from '@effect/vitest'
import { Effect, SubscriptionRef } from 'effect'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'

type BenchCase = 'single' | 'eight' | 'many' | 'listRoot' | 'mixedUnknown'

type BenchState = Record<string, unknown>

type BenchSummary = {
  readonly p50: number
  readonly p95: number
  readonly avg: number
}

const now = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const makeState = (fieldCount: number, benchCase: BenchCase): BenchState => {
  const next: Record<string, unknown> = {}
  for (let index = 0; index < fieldCount; index += 1) {
    next[`k${index}`] = index
  }
  if (benchCase === 'listRoot') {
    next.items = Array.from({ length: 64 }, (_, index) => index)
  }
  if (benchCase === 'mixedUnknown') {
    next.__tmp = 0
  }
  return next
}

const changedKeysFor = (benchCase: BenchCase): ReadonlyArray<string> => {
  switch (benchCase) {
    case 'single':
      return ['k0']
    case 'eight':
      return Array.from({ length: 8 }, (_, index) => `k${index}`)
    case 'many':
      return Array.from({ length: 64 }, (_, index) => `k${index}`)
    case 'listRoot':
      return []
    case 'mixedUnknown':
      return ['k0']
  }
}

const makeNextState = (state: BenchState, benchCase: BenchCase, keys: ReadonlyArray<string>): BenchState => {
  if (benchCase === 'listRoot') {
    const items = Array.isArray(state.items) ? state.items : []
    return {
      ...state,
      items: [...items, items.length],
    }
  }

  const next = { ...state } as BenchState
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!
    const current = typeof next[key] === 'number' ? (next[key] as number) : 0
    next[key] = current + 1
  }
  if (benchCase === 'mixedUnknown') {
    const current = typeof next.__tmp === 'number' ? (next.__tmp as number) : 0
    next.__tmp = current + 1
  }
  return next
}

const runBench = (args: {
  readonly mode: 'legacy' | 'topLevel'
  readonly benchCase: BenchCase
  readonly iterations: number
  readonly warmup: number
}): Effect.Effect<BenchSummary> =>
  Effect.gen(function* () {
    const fieldCount = 96
    const registryPaths: Array<ReadonlyArray<string>> = Array.from({ length: fieldCount }, (_, index) => [`k${index}`])
    if (args.benchCase === 'listRoot') {
      registryPaths.push(['items'])
    }
    const registry = makeFieldPathIdRegistry(registryPaths)
    const ref = yield* SubscriptionRef.make<BenchState>(makeState(fieldCount, args.benchCase))
    const keys = changedKeysFor(args.benchCase)

    const runTxn = (): Effect.Effect<number> =>
      Effect.gen(function* () {
        const prev = yield* SubscriptionRef.get(ref)
        const next = makeNextState(prev, args.benchCase, keys)
        const ctx = StateTransaction.makeContext<BenchState>({
          moduleId: 'ReducerWholeStateFallbackPerf',
          instanceId: `i-${args.mode}-${args.benchCase}`,
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          getListPathSet: args.benchCase === 'listRoot' ? () => new Set(['items']) : undefined,
          now,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'perf', name: `${args.mode}:${args.benchCase}` }, prev)
        StateTransaction.updateDraft(ctx, next)

        if (args.mode === 'legacy') {
          StateTransaction.recordPatch(ctx, '*', 'reducer', undefined, next)
        } else {
          const handled = StateTransaction.recordKnownTopLevelDirtyEvidence(ctx, prev, next, 'reducer')
          if (!handled) {
            throw new Error(`topLevel evidence should be handled for ${args.benchCase}`)
          }
        }

        const startedAtMs = now()
        const committed = yield* StateTransaction.commit(ctx, ref)
        const durationMs = Math.max(0, now() - startedAtMs)
        expect(committed?.dirty.dirtyAll).toBe(false)
        return durationMs
      })

    for (let index = 0; index < args.warmup; index += 1) {
      yield* runTxn()
    }

    const samples: number[] = []
    for (let index = 0; index < args.iterations; index += 1) {
      samples.push(yield* runTxn())
    }

    return {
      p50: quantile(samples, 0.5),
      p95: quantile(samples, 0.95),
      avg: average(samples),
    }
  })

describe('ModuleRuntime.reducer whole-state fallback · perf baseline (Diagnostics=off)', () => {
  it.effect('records reproducible evidence for top-level dirty evidence vs inferReplaceEvidence', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)
      const cases: ReadonlyArray<BenchCase> = ['single', 'eight', 'many', 'listRoot', 'mixedUnknown']

      for (let index = 0; index < cases.length; index += 1) {
        const benchCase = cases[index]!
        const legacy = yield* runBench({ mode: 'legacy', benchCase, iterations, warmup })
        const topLevel = yield* runBench({ mode: 'topLevel', benchCase, iterations, warmup })

        console.log(
          `[perf] reducer-whole-state-fallback case=${benchCase} ` +
            `legacy.p50=${legacy.p50.toFixed(3)}ms legacy.p95=${legacy.p95.toFixed(3)}ms legacy.avg=${legacy.avg.toFixed(3)}ms ` +
            `topLevel.p50=${topLevel.p50.toFixed(3)}ms topLevel.p95=${topLevel.p95.toFixed(3)}ms topLevel.avg=${topLevel.avg.toFixed(3)}ms`,
        )
      }
    }),
  )
})
