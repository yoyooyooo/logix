import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOp from '../../../../src/internal/runtime/core/EffectOpCore.js'
import { makeRunSession, RunSessionTag } from '../../../../src/internal/observability/runSession.js'
import * as ModuleRuntimeOperation from '../../../../src/internal/runtime/core/ModuleRuntime.operation.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'

const isCiPerfRunner = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

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

const parseBatchSizes = (): ReadonlyArray<number> => {
  const raw = process.env.LOGIX_PERF_BATCHES ?? (isCiPerfRunner ? '256' : '256,1024')
  const parsed = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value))

  return parsed.length > 0 ? parsed : [256, 1024]
}

const makeTxnContext = () =>
  StateTransaction.makeContext({
    instrumentation: 'light',
    captureSnapshots: false,
    now: () => 0,
  })

const runCase = (
  runner: ModuleRuntimeOperation.RunOperation,
  session: ReturnType<typeof makeRunSession> | undefined,
  iterations: number,
  warmup: number,
  batchSize: number,
) =>
  Effect.gen(function* () {
    const effect = runner('state', 'state:update', {}, Effect.void)
    const runOnce = () => {
      const linked = Effect.provideService(effect, EffectOp.currentLinkId, 'link-op-perf')
      return session ? Effect.provideService(linked, RunSessionTag, session as any) : linked
    }

    for (let index = 0; index < warmup; index += 1) {
      for (let inner = 0; inner < batchSize; inner += 1) {
        yield* runOnce()
      }
    }

    const samples: number[] = []
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = now()
      for (let inner = 0; inner < batchSize; inner += 1) {
        yield* runOnce()
      }
      samples.push(now() - startedAt)
    }
    return samples
  })

describe(
  'ModuleRuntime.operation runner · perf baseline (Diagnostics=off, middleware=empty, runSession=on)',
  { timeout: isCiPerfRunner ? 45_000 : 30_000 },
  () => {
  it.effect('records reproducible runner overhead evidence', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? (isCiPerfRunner ? 360 : 900))
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? (isCiPerfRunner ? 40 : 80))
      const batchSizes = parseBatchSizes()

      for (const batchSize of batchSizes) {
        const fastSession = makeRunSession({
          runId: `run-fast-${batchSize}`,
          startedAt: 1,
        })
        const legacySession = makeRunSession({
          runId: `run-legacy-${batchSize}`,
          startedAt: 1,
        })

        const fastRunner = ModuleRuntimeOperation.makeRunOperation({
          optionsModuleId: 'PerfOp',
          instanceId: 'i-1',
          runtimeLabel: 'PerfRuntime',
          txnContext: makeTxnContext(),
          defaultRuntimeServices: {
            middlewareStack: [],
            runSession: fastSession,
          },
        })

        const legacyRunner = ModuleRuntimeOperation.makeRunOperation({
          optionsModuleId: 'PerfOp',
          instanceId: 'i-1',
          runtimeLabel: 'PerfRuntime',
          txnContext: makeTxnContext(),
        })

        const fastSamples = yield* runCase(fastRunner, undefined, iterations, warmup, batchSize)
        const legacySamples = yield* runCase(legacyRunner, legacySession, iterations, warmup, batchSize)
        const fastAvg = average(fastSamples)
        const legacyAvg = average(legacySamples)
        const speedup = legacyAvg > 0 ? legacyAvg / fastAvg : 0
        const savedPct = legacyAvg > 0 ? ((legacyAvg - fastAvg) / legacyAvg) * 100 : 0

        console.log(
          `[perf] operation-runner diagnostics=off middleware=empty runSession=on iters=${iterations} warmup=${warmup} batch=${batchSize} ` +
            `fast.p50=${quantile(fastSamples, 0.5).toFixed(3)}ms fast.p95=${quantile(fastSamples, 0.95).toFixed(3)}ms fast.avg=${fastAvg.toFixed(3)}ms ` +
            `legacy.p50=${quantile(legacySamples, 0.5).toFixed(3)}ms legacy.p95=${quantile(legacySamples, 0.95).toFixed(3)}ms legacy.avg=${legacyAvg.toFixed(3)}ms ` +
            `speedup=${speedup.toFixed(3)}x saved=${savedPct.toFixed(2)}%`,
        )
      }
    }),
  )
  },
)
