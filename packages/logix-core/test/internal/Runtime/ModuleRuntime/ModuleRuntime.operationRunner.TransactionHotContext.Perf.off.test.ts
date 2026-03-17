import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import { makeRunSession, RunSessionTag } from '../../../../src/internal/observability/runSession.js'
import * as ModuleRuntimeOperation from '../../../../src/internal/runtime/core/ModuleRuntime.operation.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import {
  ledgerSummaryForOperationRunnerTxnHotContext,
  mergeRuntimeShellAttributionMetrics,
  writeRuntimeShellLedgerV1,
} from '../_perf/runtimeShellLedger.v1.js'
import { createRuntimeShellBoundaryDecision } from '../../../../src/internal/runtime/core/RuntimeShellBoundary.js'

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
  const raw = process.env.LOGIX_PERF_BATCHES ?? '256,1024'
  const parsed = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value))

  return parsed.length > 0 ? parsed : [256, 1024]
}

const makeActiveTxnContext = (operationRuntimeServices?: ModuleRuntimeOperation.OperationRuntimeServices) => {
  const txnContext = StateTransaction.makeContext({
    instrumentation: 'light',
    captureSnapshots: false,
    now: () => 0,
  })
  StateTransaction.beginTransaction(txnContext, { kind: 'perf', name: 'txn-hot-context' }, { value: 0 } as any)
  if (operationRuntimeServices) {
    ;(txnContext.current as any).operationRuntimeServices = operationRuntimeServices
  }
  return txnContext
}

const runCase = (
  runner: ModuleRuntimeOperation.RunOperation,
  session: ReturnType<typeof makeRunSession>,
  iterations: number,
  warmup: number,
  batchSize: number,
) =>
  Effect.gen(function* () {
    const effect = Effect.provideService(
      Effect.provideService(
        Effect.provideService(
          runner('state', 'state:update', {}, Effect.void),
          EffectOpCore.EffectOpMiddlewareTag,
          { stack: [] },
        ),
        RunSessionTag,
        session,
      ),
      EffectOpCore.currentLinkId,
      undefined as any,
    )

    for (let index = 0; index < warmup; index += 1) {
      for (let inner = 0; inner < batchSize; inner += 1) {
        yield* effect
      }
    }

    const samples: number[] = []
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = now()
      for (let inner = 0; inner < batchSize; inner += 1) {
        yield* effect
      }
      samples.push(now() - startedAt)
    }

    return samples
  })

describe(
  'ModuleRuntime.operation runner · transaction-shared hot context microbench (Diagnostics=off, middleware=empty)',
  { timeout: 40_000 },
  () => {
  it.effect('records direct evidence for transaction-captured operation hot context', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 900)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 100)
      const batchSizes = parseBatchSizes()

      for (const batchSize of batchSizes) {
        const sharedSession = makeRunSession({
          runId: `run-shared-${batchSize}`,
          startedAt: 1,
        })
        const fallbackSession = makeRunSession({
          runId: `run-fallback-${batchSize}`,
          startedAt: 1,
        })

        const sharedRunner = ModuleRuntimeOperation.makeRunOperation({
          optionsModuleId: 'PerfTxnHot',
          instanceId: 'i-txn-hot',
          runtimeLabel: 'PerfRuntime',
          txnContext: makeActiveTxnContext({
            middlewareStack: [],
            runSession: sharedSession,
          }),
        })

        const fallbackRunner = ModuleRuntimeOperation.makeRunOperation({
          optionsModuleId: 'PerfTxnHot',
          instanceId: 'i-txn-hot',
          runtimeLabel: 'PerfRuntime',
          txnContext: makeActiveTxnContext(),
        })

        const sharedSamples = yield* runCase(sharedRunner, sharedSession, iterations, warmup, batchSize)
        const fallbackSamples = yield* runCase(fallbackRunner, fallbackSession, iterations, warmup, batchSize)
        const sharedAvg = average(sharedSamples)
        const fallbackAvg = average(fallbackSamples)
        const speedup = fallbackAvg > 0 ? fallbackAvg / sharedAvg : 0
        const savedPct = fallbackAvg > 0 ? ((fallbackAvg - sharedAvg) / fallbackAvg) * 100 : 0

        console.log(
          `[perf] operation-runner txn-hot-context diagnostics=off middleware=empty iters=${iterations} warmup=${warmup} batch=${batchSize} ` +
            `shared.p50=${quantile(sharedSamples, 0.5).toFixed(3)}ms shared.p95=${quantile(sharedSamples, 0.95).toFixed(3)}ms shared.avg=${sharedAvg.toFixed(3)}ms ` +
            `fallback.p50=${quantile(fallbackSamples, 0.5).toFixed(3)}ms fallback.p95=${quantile(fallbackSamples, 0.95).toFixed(3)}ms fallback.avg=${fallbackAvg.toFixed(3)}ms ` +
            `speedup=${speedup.toFixed(3)}x saved=${savedPct.toFixed(2)}%`,
        )

        writeRuntimeShellLedgerV1({
          segmentId: `operationRunner.txnHotContext.off.batch${batchSize}`,
          suiteRef: {
            suiteId: 'ModuleRuntime.operationRunner.TransactionHotContext.Perf.off',
            command:
              'pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts',
            artifactRef: 'specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.evidence.json',
          },
          config: { diagnosticsLevel: 'off', middleware: 'empty', iterations, warmup, batch: batchSize },
          samples: [
            ...sharedSamples.map((batchMs, index) => ({
              kind: 'operationRunner.txnHotContext',
              index,
              case: 'shared',
              batchMs,
            }) as const),
            ...fallbackSamples.map((batchMs, index) => ({
              kind: 'operationRunner.txnHotContext',
              index,
              case: 'fallback',
              batchMs,
              decision: createRuntimeShellBoundaryDecision({
                mode: 'noSnapshot',
                reasonCode: 'middleware_env_mismatch',
                boundaryClass: 'policy_fallback',
                shellSource: 'operationRunner.fallback',
                reuseKey: `txnHotContext:${batchSize}:fallback`,
              }),
            }) as const),
          ],
          summaryMetrics: mergeRuntimeShellAttributionMetrics({
            metrics: ledgerSummaryForOperationRunnerTxnHotContext(sharedSamples, fallbackSamples),
            decisions: fallbackSamples.map(() =>
              createRuntimeShellBoundaryDecision({
                mode: 'noSnapshot',
                reasonCode: 'middleware_env_mismatch',
                boundaryClass: 'policy_fallback',
                shellSource: 'operationRunner.fallback',
                reuseKey: `txnHotContext:${batchSize}:fallback`,
              }),
            ),
          }),
          summaryNotes: [`aggregated from ${iterations} paired batches (shared + fallback)`],
          profile: 'quick',
        })
      }
    }),
  )
  },
)
