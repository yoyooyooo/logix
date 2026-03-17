import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOp from '../../../../src/internal/runtime/core/EffectOpCore.js'
import * as ModuleRuntimeOperation from '../../../../src/internal/runtime/core/ModuleRuntime.operation.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'

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
  const raw = process.env.LOGIX_PERF_BATCHES ?? '1024,2048'
  const parsed = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value))

  return parsed.length > 0 ? parsed : [1024, 4096]
}

const makeTxnContext = () =>
  StateTransaction.makeContext({
    instrumentation: 'light',
    captureSnapshots: false,
    now: () => 0,
  })

const runCase = (
  runner: ModuleRuntimeOperation.RunOperation,
  iterations: number,
  warmup: number,
  batchSize: number,
  existingLinkId: string | undefined,
) =>
  Effect.gen(function* () {
    const effect = runner('state', 'state:update', {}, Effect.void)
    const runOnce = () =>
      existingLinkId === undefined ? effect : Effect.provideService(effect, EffectOp.currentLinkId, existingLinkId)

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

describe('ModuleRuntime.operation runner · existing-link inline microbench (Diagnostics=off, middleware=empty, runSession=off)', { timeout: 30_000 }, () => {
  it.effect('records direct evidence for existingLinkId inline fast path', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 600)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 60)
      const batchSizes = parseBatchSizes()

      const runner = ModuleRuntimeOperation.makeRunOperation({
        optionsModuleId: 'PerfOp',
        instanceId: 'i-existing-link',
        runtimeLabel: 'PerfRuntime',
        txnContext: makeTxnContext(),
        defaultRuntimeServices: {
          middlewareStack: [],
          runSession: undefined,
        },
      })

      for (const batchSize of batchSizes) {
        const inlineSamples = yield* runCase(runner, iterations, warmup, batchSize, 'link-op-inline')
        const fallbackSamples = yield* runCase(runner, iterations, warmup, batchSize, undefined)
        const inlineAvg = average(inlineSamples)
        const fallbackAvg = average(fallbackSamples)
        const speedup = fallbackAvg > 0 ? fallbackAvg / inlineAvg : 0
        const savedPct = fallbackAvg > 0 ? ((fallbackAvg - inlineAvg) / fallbackAvg) * 100 : 0

        console.log(
          `[perf] operation-runner existing-link-inline diagnostics=off middleware=empty runSession=off iters=${iterations} warmup=${warmup} batch=${batchSize} ` +
            `inline.p50=${quantile(inlineSamples, 0.5).toFixed(3)}ms inline.p95=${quantile(inlineSamples, 0.95).toFixed(3)}ms inline.avg=${inlineAvg.toFixed(3)}ms ` +
            `fallback.p50=${quantile(fallbackSamples, 0.5).toFixed(3)}ms fallback.p95=${quantile(fallbackSamples, 0.95).toFixed(3)}ms fallback.avg=${fallbackAvg.toFixed(3)}ms ` +
            `speedup=${speedup.toFixed(3)}x saved=${savedPct.toFixed(2)}%`,
        )
      }
    }),
  )
})
