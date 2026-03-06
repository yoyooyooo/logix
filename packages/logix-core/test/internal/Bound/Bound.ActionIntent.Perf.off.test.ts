import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntime from '../../../src/internal/runtime/ModuleRuntime.js'

type Entry = 'dispatchers' | 'action' | 'dispatch'

interface PerfSummary {
  readonly n: number
  readonly minMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly maxMs: number
}

interface AttemptRun {
  readonly dispatchers: PerfSummary
  readonly action: PerfSummary
  readonly dispatch: PerfSummary
  readonly ratios: {
    readonly p50DispatchersOverDispatch: number
    readonly p50DispatchersOverAction: number
    readonly p50DispatchersVsAction: number
  }
}

const now = (): number => {
  const perf = (globalThis as { readonly performance?: { readonly now?: () => number } }).performance
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

const summarize = (samples: ReadonlyArray<number>): PerfSummary => ({
  n: samples.length,
  minMs: quantile(samples, 0),
  p50Ms: quantile(samples, 0.5),
  p95Ms: quantile(samples, 0.95),
  maxMs: quantile(samples, 1),
})

const Counter = Logix.Module.make('Bound.ActionIntent.Perf', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  } as const,
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const benchmarkAllEntries = (args: {
  readonly operations: number
  readonly iterations: number
  readonly warmup: number
}): Effect.Effect<
  {
    readonly dispatchers: PerfSummary
    readonly action: PerfSummary
    readonly dispatch: PerfSummary
  },
  never,
  any
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const runtime = yield* ModuleRuntime.make<Logix.StateOf<typeof Counter.shape>, Logix.ActionOf<typeof Counter.shape>>(
        { count: 0 },
        {
          reducers: {
            inc: Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          },
        },
      )

      const $ = Logix.Bound.make(Counter.shape, runtime)
      const warmup = Math.max(0, args.warmup)
      const iterations = Math.max(1, args.iterations)

      const dispatchersInc = $.dispatchers.inc
      const actionInc = $.action($.actions.inc)

      const runLoops: Record<Entry, Effect.Effect<void, never, any>> = {
        dispatchers: Effect.gen(function* () {
          for (let i = 0; i < args.operations; i++) {
            yield* dispatchersInc()
          }
        }),
        action: Effect.gen(function* () {
          for (let i = 0; i < args.operations; i++) {
            yield* actionInc()
          }
        }),
        dispatch: Effect.gen(function* () {
          for (let i = 0; i < args.operations; i++) {
            yield* $.dispatch('inc')
          }
        }),
      }

      const measureEntry = (entry: Entry) =>
        Effect.gen(function* () {
          yield* runtime.setState({ count: 0 })
          const t0 = now()
          yield* runLoops[entry]
          const dt = now() - t0
          const finalState = yield* runtime.getState
          expect(finalState.count).toBe(args.operations)
          return dt
        })

      for (let i = 0; i < warmup; i++) {
        yield* measureEntry('dispatchers')
        yield* measureEntry('action')
        yield* measureEntry('dispatch')
      }

      const entries: ReadonlyArray<Entry> = ['dispatchers', 'action', 'dispatch']
      const samples: Record<Entry, number[]> = { dispatchers: [], action: [], dispatch: [] }

      for (let i = 0; i < iterations; i++) {
        const rotatedOrder = entries.map((_, idx) => entries[(idx + i) % entries.length]!)
        for (const entry of rotatedOrder) {
          const dt = yield* measureEntry(entry)
          samples[entry].push(dt)
        }
      }

      return {
        dispatchers: summarize(samples.dispatchers),
        action: summarize(samples.action),
        dispatch: summarize(samples.dispatch),
      }
    }),
  )

describe('Bound ActionIntent entry perf baseline (Diagnostics=off)', () => {
  it.effect(
    'dispatchers/action/dispatch should stay within action-entry hot-path budget',
    () =>
      Effect.gen(function* () {
        const isCi = process.env.CI === 'true'

        const parseFiniteNumber = (key: string, raw: string): number => {
          const parsed = Number(raw)
          if (!Number.isFinite(parsed)) {
            throw new Error(`[perf-config] ${key} must be a finite number, got "${raw}"`)
          }
          return parsed
        }

        const readNumberEnv = (
          primaryKey: string,
          fallback: number,
          options?: { readonly integer?: boolean; readonly min?: number },
        ): number => {
          const raw = process.env[primaryKey]
          const value =
            raw == null
              ? Number.isFinite(fallback)
                ? fallback
                : Number.NaN
              : parseFiniteNumber(primaryKey, raw)

          if (!Number.isFinite(value)) {
            throw new Error(`[perf-config] ${primaryKey} fallback must be a finite number, got "${String(fallback)}"`)
          }
          if (options?.integer === true && !Number.isInteger(value)) {
            throw new Error(`[perf-config] ${primaryKey} must be an integer, got "${String(raw ?? value)}"`)
          }
          if (options?.min != null && value < options.min) {
            throw new Error(`[perf-config] ${primaryKey} must be >= ${options.min}, got "${String(raw ?? value)}"`)
          }
          return value
        }

        const readOptionalNumberEnv = (primaryKey: string): number | undefined => {
          const raw = process.env[primaryKey]
          return raw == null ? undefined : parseFiniteNumber(primaryKey, raw)
        }

        const operations = readNumberEnv('LOGIX_ACTION_ENTRY_OPS', isCi ? 900 : 1500, { integer: true, min: 1 })
        const iterations = readNumberEnv('LOGIX_PERF_ITERS', isCi ? 4 : 8, { integer: true, min: 1 })
        const warmup = readNumberEnv('LOGIX_PERF_WARMUP', isCi ? 1 : 2, { integer: true, min: 0 })
        const attempts = readNumberEnv('LOGIX_ACTION_ENTRY_ATTEMPTS', isCi ? 3 : 3, { integer: true, min: 1 })
        // Shared CI runners have higher jitter; keep local default strict and CI moderately relaxed.
        const maxRatio = readNumberEnv('LOGIX_ACTION_ENTRY_MAX_RATIO', isCi ? 1.2 : 1.05, { min: 0 })
        const ciSoftMaxRatio = readNumberEnv('LOGIX_ACTION_ENTRY_CI_SOFT_MAX_RATIO', 1.1, { min: 0 })
        const maxCompatRatio = readNumberEnv('LOGIX_ACTION_ENTRY_COMPAT_MAX_RATIO', 1.2, { min: 0 })
        const ciJitterAllowance = readNumberEnv('LOGIX_ACTION_ENTRY_CI_JITTER_ALLOWANCE', isCi ? 0.01 : 0, { min: 0 })
        const maxSymmetricRatio = readOptionalNumberEnv('LOGIX_ACTION_ENTRY_SYMMETRIC_MAX_RATIO')
        if (maxSymmetricRatio != null && maxSymmetricRatio < 0) {
          throw new Error(`[perf-config] LOGIX_ACTION_ENTRY_SYMMETRIC_MAX_RATIO must be >= 0, got "${maxSymmetricRatio}"`)
        }
        const effectiveMaxRatio = maxRatio + ciJitterAllowance
        const effectiveCiSoftMaxRatio = ciSoftMaxRatio + ciJitterAllowance

        const normalizedIterations = iterations
        const normalizedWarmup = warmup
        const normalizedAttempts = attempts

        const runs: AttemptRun[] = []

        for (let attempt = 0; attempt < normalizedAttempts; attempt++) {
          const { dispatchers, action, dispatch } = yield* benchmarkAllEntries({
            operations,
            iterations: normalizedIterations,
            warmup: normalizedWarmup,
          })

          const p50DispatchersOverDispatch = dispatch.p50Ms > 0 ? dispatchers.p50Ms / dispatch.p50Ms : Number.NaN
          const p50DispatchersOverAction = action.p50Ms > 0 ? dispatchers.p50Ms / action.p50Ms : Number.NaN
          const p50DispatchersVsAction =
            dispatchers.p50Ms > 0 && action.p50Ms > 0
              ? Math.max(dispatchers.p50Ms, action.p50Ms) / Math.min(dispatchers.p50Ms, action.p50Ms)
              : Number.NaN

          runs.push({
            dispatchers,
            action,
            dispatch,
            ratios: {
              p50DispatchersOverDispatch,
              p50DispatchersOverAction,
              p50DispatchersVsAction,
            },
          })
        }

        const medianFinite = (values: ReadonlyArray<number>): number => {
          const finite = values.filter((value) => Number.isFinite(value))
          return finite.length > 0 ? quantile(finite, 0.5) : Number.NaN
        }

        const p50DispatchersOverDispatch = medianFinite(runs.map((run) => run.ratios.p50DispatchersOverDispatch))
        const p50DispatchersOverAction = medianFinite(runs.map((run) => run.ratios.p50DispatchersOverAction))
        const p50DispatchersVsAction = medianFinite(runs.map((run) => run.ratios.p50DispatchersVsAction))
        const ciSoftPassCount = runs.filter((run) => run.ratios.p50DispatchersOverAction <= effectiveCiSoftMaxRatio).length

        const evidence = {
          scenario: 'action-intent.entry-perf.off',
          run: {
            operations,
            iterations: normalizedIterations,
            warmup: normalizedWarmup,
            attempts: normalizedAttempts,
            budget: {
              maxRatio,
              ciSoftMaxRatio,
              maxCompatRatio,
              maxSymmetricRatio,
              ciJitterAllowance,
              effectiveMaxRatio,
              effectiveCiSoftMaxRatio,
            },
          },
          metrics: {
            aggregated: {
              p50DispatchersOverDispatch,
              p50DispatchersOverAction,
              p50DispatchersVsAction,
            },
            ciSoftPassCount,
            attempts: runs,
          },
        } as const

        console.log(
          `[perf] action-entry ops=${operations} iters=${normalizedIterations} attempts=${normalizedAttempts} median.ratio(dispatchers/action)=${Number.isFinite(
            p50DispatchersOverAction,
          ) ? p50DispatchersOverAction.toFixed(3) : 'NaN'} median.ratio(dispatchersVsAction)=${Number.isFinite(
            p50DispatchersVsAction,
          ) ? p50DispatchersVsAction.toFixed(3) : 'NaN'} median.ratio(dispatchers/dispatch)=${Number.isFinite(
            p50DispatchersOverDispatch,
          ) ? p50DispatchersOverDispatch.toFixed(3) : 'NaN'} ciSoftPass=${ciSoftPassCount}/${normalizedAttempts}`,
        )
        console.log(`[perf:evidence] ${JSON.stringify(evidence)}`)

        try {
          expect(Number.isFinite(p50DispatchersOverAction)).toBe(true)
          expect(Number.isFinite(p50DispatchersOverDispatch)).toBe(true)
          expect(p50DispatchersOverAction).toBeLessThanOrEqual(effectiveMaxRatio)
          expect(p50DispatchersOverDispatch).toBeLessThanOrEqual(maxCompatRatio)
          if (isCi) {
            const minSoftPass = Math.max(1, Math.ceil(normalizedAttempts / 3))
            expect(ciSoftPassCount).toBeGreaterThanOrEqual(minSoftPass)
          }
          if (maxSymmetricRatio != null) {
            expect(Number.isFinite(p50DispatchersVsAction)).toBe(true)
            expect(p50DispatchersVsAction).toBeLessThanOrEqual(maxSymmetricRatio)
          }
        } catch (error) {
          console.error(
            `[perf:assertion-context] ${JSON.stringify({
              budget: evidence.run.budget,
              aggregated: evidence.metrics.aggregated,
              ciSoftPassCount,
              normalizedAttempts,
            })}`,
          )
          throw error
        }
      }),
    45000,
  )
})
