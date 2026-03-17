import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import {
  makeResolveTxnLanePolicy,
  captureStateTransactionRuntimeSnapshot,
} from '../../../../src/internal/runtime/core/ModuleRuntime.txnLanePolicy.js'
import { makeResolveTraitConvergeConfig } from '../../../../src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.js'
import {
  captureSchedulingPolicyRuntimeSnapshot,
  makeResolveConcurrencyPolicy,
} from '../../../../src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.js'
import {
  SchedulingPolicySurfaceOverridesTag,
  SchedulingPolicySurfaceTag,
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type SchedulingPolicySurface,
  type SchedulingPolicySurfaceOverrides,
  type StateTransactionOverrides,
  type StateTransactionRuntimeConfig,
} from '../../../../src/internal/runtime/core/env.js'
import {
  ledgerSummaryForResolveShellSnapshot,
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

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const runCase = (args: {
  readonly runOnce: () => Effect.Effect<void>
  readonly iterations: number
  readonly warmup: number
  readonly batchSize: number
}): Effect.Effect<ReadonlyArray<number>> =>
  Effect.gen(function* () {
    for (let index = 0; index < args.warmup; index += 1) {
      for (let inner = 0; inner < args.batchSize; inner += 1) {
        yield* args.runOnce()
      }
    }

    const samples: number[] = []
    for (let index = 0; index < args.iterations; index += 1) {
      const startedAt = now()
      for (let inner = 0; inner < args.batchSize; inner += 1) {
        yield* args.runOnce()
      }
      samples.push(now() - startedAt)
    }
    return samples
  })

describe('ModuleRuntime runtime snapshot resolve shell · microbench (Diagnostics=off)', { timeout: 20_000 }, () => {
  it.effect('keeps resolver semantics and cuts repeated serviceOption shell tax across adjacent resolvers', () => {
    const moduleId = 'ModuleRuntime_RuntimeSnapshot_ResolveShell_Perf'
    const stateTransaction = {
      traitConvergeBudgetMs: 80,
      traitConvergeDecisionBudgetMs: 0.6,
      traitConvergeMode: 'auto' as const,
      traitConvergeTimeSlicing: { enabled: true, debounceMs: 2, maxLagMs: 80 },
      txnLanePolicy: {
        tier: 'interactive' as const,
        tuning: { budgetMs: 1, debounceMs: 0, maxLagMs: 60, allowCoalesce: true, yieldStrategy: 'baseline' as const },
      },
    }

    const runtimeConfig: StateTransactionRuntimeConfig = {
      traitConvergeMode: 'full',
      traitConvergeBudgetMs: 120,
      traitConvergeDecisionBudgetMs: 0.8,
      traitConvergeTimeSlicing: { enabled: false, debounceMs: 4, maxLagMs: 120 },
      txnLanePolicy: {
        tier: 'throughput',
        tuning: { budgetMs: 4, debounceMs: 0, maxLagMs: 120, allowCoalesce: true, yieldStrategy: 'baseline' },
      },
      traitConvergeOverridesByModuleId: {
        [moduleId]: { traitConvergeMode: 'dirty', traitConvergeBudgetMs: 40 },
      },
      txnLanePolicyOverridesByModuleId: {
        [moduleId]: { tier: 'sync' },
      },
    }

    const providerOverrides: StateTransactionOverrides = {
      traitConvergeMode: 'auto',
      traitConvergeBudgetMs: 60,
      traitConvergeDecisionBudgetMs: 0.5,
      traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 40 },
      txnLanePolicy: { tier: 'interactive', tuning: { budgetMs: 1, debounceMs: 0, maxLagMs: 40, allowCoalesce: true } },
      traitConvergeOverridesByModuleId: {
        [moduleId]: { traitConvergeMode: 'dirty', traitConvergeBudgetMs: 24 },
      },
      txnLanePolicyOverridesByModuleId: {
        [moduleId]: { tier: 'interactive', tuning: { budgetMs: 0, debounceMs: 0, maxLagMs: 30, allowCoalesce: true } },
      },
    }

    const schedulingRuntimeConfig: SchedulingPolicySurface = {
      concurrencyLimit: 32,
      losslessBackpressureCapacity: 2048,
      allowUnbounded: false,
      pressureWarningThreshold: { backlogCount: 1200, backlogDurationMs: 1200 },
      warningCooldownMs: 20_000,
      overridesByModuleId: {
        [moduleId]: {
          concurrencyLimit: 'unbounded',
          allowUnbounded: false,
          losslessBackpressureCapacity: 1536,
          pressureWarningThreshold: { backlogCount: 640, backlogDurationMs: 600 },
        },
      },
    }

    const schedulingProviderOverrides: SchedulingPolicySurfaceOverrides = {
      concurrencyLimit: 24,
      losslessBackpressureCapacity: 1024,
      allowUnbounded: true,
      pressureWarningThreshold: { backlogCount: 900, backlogDurationMs: 900 },
      warningCooldownMs: 12_000,
      overridesByModuleId: {
        [moduleId]: {
          concurrencyLimit: 'unbounded',
          allowUnbounded: true,
          pressureWarningThreshold: { backlogCount: 256, backlogDurationMs: 120 },
        },
      },
    }

    return Effect.gen(function* () {
      const resolveTxnLanePolicy = makeResolveTxnLanePolicy({ moduleId, stateTransaction })
      const resolveTraitConvergeConfig = makeResolveTraitConvergeConfig({ moduleId, stateTransaction })
      const resolveConcurrencyPolicy = makeResolveConcurrencyPolicy({ moduleId })

      const baselineLane = yield* resolveTxnLanePolicy()
      const baselineConverge = yield* resolveTraitConvergeConfig()
      const baselineConcurrency = yield* resolveConcurrencyPolicy()
      const runtimeSnapshot = yield* captureStateTransactionRuntimeSnapshot()
      const schedulingSnapshot = yield* captureSchedulingPolicyRuntimeSnapshot()
      const snapshotLane = yield* resolveTxnLanePolicy(runtimeSnapshot)
      const snapshotConverge = yield* resolveTraitConvergeConfig(runtimeSnapshot)
      const snapshotConcurrency = yield* resolveConcurrencyPolicy(schedulingSnapshot)

      expect(snapshotLane.fingerprint).toBe(baselineLane.fingerprint)
      expect(snapshotConverge).toEqual(baselineConverge)
      expect(snapshotConcurrency).toEqual(baselineConcurrency)

      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 2000)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 200)
      const batchSize = Number(process.env.LOGIX_PERF_BATCH ?? 128)

      const noSnapshotSamples = yield* runCase({
        runOnce: () =>
          Effect.gen(function* () {
            yield* resolveTxnLanePolicy()
            yield* resolveTraitConvergeConfig()
            yield* resolveConcurrencyPolicy()
          }),
        iterations,
        warmup,
        batchSize,
      })

      const snapshotSamples = yield* runCase({
        runOnce: () =>
          Effect.gen(function* () {
            yield* resolveTxnLanePolicy(runtimeSnapshot)
            yield* resolveTraitConvergeConfig(runtimeSnapshot)
            yield* resolveConcurrencyPolicy(schedulingSnapshot)
          }),
        iterations,
        warmup,
        batchSize,
      })

      const noSnapshotAvg = average(noSnapshotSamples)
      const snapshotAvg = average(snapshotSamples)
      const speedup = snapshotAvg > 0 ? noSnapshotAvg / snapshotAvg : 0
      const savedPct = noSnapshotAvg > 0 ? ((noSnapshotAvg - snapshotAvg) / noSnapshotAvg) * 100 : 0

      console.log(
        `[perf] runtime-snapshot-resolve-shell diagnostics=off iters=${iterations} warmup=${warmup} batch=${batchSize} ` +
          `noSnapshot.p50=${quantile(noSnapshotSamples, 0.5).toFixed(3)}ms noSnapshot.p95=${quantile(noSnapshotSamples, 0.95).toFixed(3)}ms noSnapshot.avg=${noSnapshotAvg.toFixed(3)}ms ` +
          `snapshot.p50=${quantile(snapshotSamples, 0.5).toFixed(3)}ms snapshot.p95=${quantile(snapshotSamples, 0.95).toFixed(3)}ms snapshot.avg=${snapshotAvg.toFixed(3)}ms ` +
          `speedup=${speedup.toFixed(3)}x saved=${savedPct.toFixed(2)}%`,
      )

      writeRuntimeShellLedgerV1({
        segmentId: 'resolveShell.snapshot.off',
        suiteRef: {
          suiteId: 'ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off',
          command:
            'pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts',
          artifactRef: 'specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.evidence.json',
        },
        config: { diagnosticsLevel: 'off', iterations, warmup, batch: batchSize },
        samples: [
          ...noSnapshotSamples.map(
            (batchMs, index) =>
              ({
                kind: 'resolveShell.snapshot',
                index,
                case: 'noSnapshot',
                batchMs,
                decision: createRuntimeShellBoundaryDecision({
                  mode: 'noSnapshot',
                  reasonCode: 'snapshot_missing',
                  boundaryClass: 'snapshot_blocked',
                  shellSource: 'resolveShell.noSnapshot',
                  reuseKey: `${moduleId}:noSnapshot`,
                }),
              }) as const,
          ),
          ...snapshotSamples.map(
            (batchMs, index) => ({ kind: 'resolveShell.snapshot', index, case: 'snapshot', batchMs }) as const,
          ),
        ],
        summaryMetrics: mergeRuntimeShellAttributionMetrics({
          metrics: ledgerSummaryForResolveShellSnapshot(noSnapshotSamples, snapshotSamples),
          decisions: noSnapshotSamples.map(() =>
            createRuntimeShellBoundaryDecision({
              mode: 'noSnapshot',
              reasonCode: 'snapshot_missing',
              boundaryClass: 'snapshot_blocked',
              shellSource: 'resolveShell.noSnapshot',
              reuseKey: `${moduleId}:noSnapshot`,
            }),
          ),
        }),
        summaryNotes: [`aggregated from ${iterations} paired batches (noSnapshot + snapshot)`],
        profile: 'quick',
      })
    }).pipe(
      Effect.provideService(StateTransactionConfigTag, runtimeConfig),
      Effect.provideService(StateTransactionOverridesTag, providerOverrides),
      Effect.provideService(SchedulingPolicySurfaceTag, schedulingRuntimeConfig),
      Effect.provideService(SchedulingPolicySurfaceOverridesTag, schedulingProviderOverrides),
    )
  })
})
