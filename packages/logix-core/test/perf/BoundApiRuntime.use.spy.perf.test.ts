import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { Context, Effect, Layer, Schema } from 'effect'
import { test } from 'vitest'

import * as Logix from '@logixjs/core'

const LOGIX_PERF_REPORT_PREFIX = 'LOGIX_PERF_REPORT:'

const MATRIX_ID = 'logix-node-perf-matrix.spy-use-v1'
const SUITE_ID = 'core.boundApi.use.spyCollector'

type Primitive = string | number | boolean
type Params = Record<string, Primitive>

type MetricResult =
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'ok'
      readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
    }
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type EvidenceUnit = 'count' | 'ratio' | 'bytes' | 'string'
type EvidenceResult =
  | {
      readonly name: string
      readonly unit: EvidenceUnit
      readonly status: 'ok'
      readonly value: number | string
    }
  | {
      readonly name: string
      readonly unit: EvidenceUnit
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type PointResult = {
  readonly params: Params
  readonly status: 'ok' | 'timeout' | 'failed' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<MetricResult>
  readonly evidence?: ReadonlyArray<EvidenceResult>
}

type PerfReport = {
  readonly schemaVersion: 1
  readonly meta: {
    readonly createdAt: string
    readonly generator: string
    readonly matrixId: string
    readonly config: {
      readonly runs: number
      readonly warmupDiscard: number
      readonly timeoutMs: number
      readonly headless?: boolean
      readonly profile?: string
    }
    readonly env: {
      readonly os: string
      readonly arch: string
      readonly node: string
      readonly browser: {
        readonly name: string
        readonly version?: string
        readonly headless?: boolean
      }
    }
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly title?: string
    readonly priority?: 'P1' | 'P2' | 'P3'
    readonly primaryAxis: string
    readonly points: ReadonlyArray<PointResult>
    readonly thresholds?: ReadonlyArray<unknown>
    readonly comparisons?: ReadonlyArray<unknown>
  }>
}

const nowMs = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarizeMs = (samples: ReadonlyArray<number>): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const emitPerfReport = (report: PerfReport): void => {
  // eslint-disable-next-line no-console
  console.log(`${LOGIX_PERF_REPORT_PREFIX}${JSON.stringify(report)}`)
}

const resolveProfileId = (): string | undefined => {
  const profile = process.env.VITE_LOGIX_PERF_PROFILE
  return typeof profile === 'string' && profile.length > 0 ? profile : undefined
}

const resolveProfileConfig = (
  profileId: string | undefined,
): { readonly profile?: string; readonly runs: number; readonly warmupDiscard: number; readonly timeoutMs: number } => {
  switch (profileId) {
    case 'smoke':
      return { profile: 'smoke', runs: 12, warmupDiscard: 2, timeoutMs: 12_000 }
    case 'quick':
      return { profile: 'quick', runs: 25, warmupDiscard: 5, timeoutMs: 15_000 }
    case 'soak':
      return { profile: 'soak', runs: 80, warmupDiscard: 10, timeoutMs: 30_000 }
    case 'default':
      return { profile: 'default', runs: 30, warmupDiscard: 5, timeoutMs: 20_000 }
    default:
      return { runs: 30, warmupDiscard: 5, timeoutMs: 20_000 }
  }
}

const toTag = (moduleOrTag: unknown): unknown =>
  typeof moduleOrTag === 'object' && moduleOrTag !== null && 'tag' in moduleOrTag && (moduleOrTag as any).tag
    ? (moduleOrTag as any).tag
    : moduleOrTag

type SpyRuntime = {
  readonly SpyCollectorTag: Context.Tag<any, any>
  readonly makeSpyCollector: () => unknown
}

const loadSpyRuntime = async (): Promise<SpyRuntime> => {
  const spec = String('../../src/internal/observability/spy/SpyCollector.js')
  const mod = (await import(spec)) as any
  const SpyCollectorTag = mod?.SpyCollectorTag as Context.Tag<any, any> | undefined
  const makeSpyCollector = mod?.makeSpyCollector as (() => unknown) | undefined
  if (!SpyCollectorTag || typeof makeSpyCollector !== 'function') {
    throw new Error('SpyCollector runtime missing or invalid exports')
  }
  return { SpyCollectorTag, makeSpyCollector }
}

const runLoop = (args: {
  readonly bound: any
  readonly serviceTag: Context.Tag<any, any>
  readonly iterations: number
  readonly variant: 'directTag' | 'use'
}): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    for (let i = 0; i < args.iterations; i++) {
      if (args.variant === 'directTag') {
        yield* (args.serviceTag as Effect.Effect<unknown, never, any>)
      } else {
        yield* (args.bound.use(args.serviceTag) as Effect.Effect<unknown, never, any>)
      }
    }
  }).pipe(Effect.asVoid)

const shouldRun = process.env.LOGIX_PERF_COLLECT === '1'

if (!shouldRun) {
  test.skip('perf: BoundApiRuntime.$.use spy overhead (disabled by default)', () => {})
} else {
  const profileId = resolveProfileId()
  const profileConfig = resolveProfileConfig(profileId)

  test('perf: BoundApiRuntime.$.use spy overhead (node)', async () => {
    class PerfServiceTag extends Context.Tag('PerfService')<PerfServiceTag, { readonly n: number }>() {}

    const { profile, runs, warmupDiscard, timeoutMs } = profileConfig

    const Self = Logix.Module.make('PerfSelf', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const SelfTag = toTag(Self) as any
    const selfRuntime = (await Effect.runPromise(
      (SelfTag as any).pipe(Effect.provide((SelfTag as any).live({ value: 0 }) as Layer.Layer<any, any, any>)),
    )) as any

    const boundOff = Logix.Bound.make((Self as any).shape, selfRuntime)
    const boundOn = Logix.Bound.make((Self as any).shape, selfRuntime)

    const iterationsLevels = [1, 10, 100, 1_000, 10_000]
    const variants: ReadonlyArray<'directTag' | 'use'> = ['directTag', 'use']
    const spyCollectorMode = process.env.LOGIX_SPY_COLLECTOR === 'on' ? 'on' : 'off'

    const spy =
      spyCollectorMode === 'on'
        ? await loadSpyRuntime()
        : undefined
    const spyCollector = spyCollectorMode === 'on' ? (spy as SpyRuntime).makeSpyCollector() : undefined

    const points: PointResult[] = []

    for (const variant of variants) {
      for (const iterations of iterationsLevels) {
        const params: Params = {
          variant,
          iterations,
        }

        const samples: number[] = []
        let failedReason: string | undefined

        for (let runIndex = 0; runIndex < runs; runIndex++) {
          const bound = spyCollectorMode === 'on' ? boundOn : boundOff
          let program = runLoop({
            bound,
            serviceTag: PerfServiceTag,
            iterations,
            variant,
          }).pipe(Effect.provideService(PerfServiceTag, { n: 1 }))

          if (spyCollectorMode === 'on') {
            program = program.pipe(Effect.provideService((spy as SpyRuntime).SpyCollectorTag, spyCollector))
          }

          const startedAt = nowMs()
          try {
            await Effect.runPromise(program as Effect.Effect<void, never, never>)
            samples.push(nowMs() - startedAt)
          } catch (err) {
            failedReason = err instanceof Error ? err.message : String(err)
            break
          }
        }

        if (failedReason) {
          points.push({
            params,
            status: 'failed',
            reason: failedReason,
            metrics: [
              {
                name: 'runtime.useLoopMs',
                unit: 'ms',
                status: 'unavailable',
                unavailableReason: failedReason,
              },
            ],
            evidence: [
              { name: 'workload.iterations', unit: 'count', status: 'ok', value: iterations },
              { name: 'variant', unit: 'string', status: 'ok', value: variant },
              { name: 'spyCollectorMode', unit: 'string', status: 'ok', value: spyCollectorMode },
            ],
          })
          continue
        }

        const trimmed = samples.slice(Math.min(warmupDiscard, samples.length))
        const metric: MetricResult =
          trimmed.length > 0
            ? {
                name: 'runtime.useLoopMs',
                unit: 'ms',
                status: 'ok',
                stats: summarizeMs(trimmed),
              }
            : {
                name: 'runtime.useLoopMs',
                unit: 'ms',
                status: 'unavailable',
                unavailableReason: 'insufficientSamples',
              }

        points.push({
          params,
          status: 'ok',
          metrics: [metric],
          evidence: [
            { name: 'workload.iterations', unit: 'count', status: 'ok', value: iterations },
            { name: 'variant', unit: 'string', status: 'ok', value: variant },
            { name: 'spyCollectorMode', unit: 'string', status: 'ok', value: spyCollectorMode },
          ],
        })
      }
    }

    const report: PerfReport = {
      schemaVersion: 1,
      meta: {
        createdAt: new Date().toISOString(),
        generator: 'packages/logix-core/test/perf/BoundApiRuntime.use.spy.perf.test.ts',
        matrixId: MATRIX_ID,
        config: {
          runs,
          warmupDiscard,
          timeoutMs,
          headless: true,
          ...(profile ? { profile } : null),
        },
        env: {
          os: process.platform,
          arch: process.arch,
          node: process.version,
          browser: {
            name: 'node',
            headless: true,
          },
        },
      },
      suites: [
        {
          id: SUITE_ID,
          title: 'core: BoundApiRuntime.$.use serviceTag overhead (spy on/off)',
          priority: 'P1',
          primaryAxis: 'iterations',
          points,
          thresholds: [],
          comparisons: [],
        },
      ],
    }

    emitPerfReport(report)
  }, profileConfig.timeoutMs + 10_000)
}
