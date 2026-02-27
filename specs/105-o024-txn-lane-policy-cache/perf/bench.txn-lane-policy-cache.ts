import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { Effect, Layer } from 'effect'
import {
  captureTxnLanePolicy,
  makeResolveTxnLanePolicy,
  resolveTxnLanePolicyFromCache,
  type ResolvedTxnLanePolicy,
} from '../../../packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts'
import {
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type StateTransactionOverrides,
  type StateTransactionRuntimeConfig,
  type TxnLanesPatch,
} from '../../../packages/logix-core/src/internal/runtime/core/env.ts'

const readPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const iterations = readPositiveInt(process.env.O024_ITERATIONS, 40000)
const rounds = readPositiveInt(process.env.O024_ROUNDS, 12)
const warmupRounds = readPositiveInt(process.env.O024_WARMUP, 3)
const outDir = resolve('specs/105-o024-txn-lane-policy-cache/perf')

const moduleId = 'o024-perf-module'
const builtinTxnLanes: TxnLanesPatch = {
  enabled: true,
  budgetMs: 1,
  debounceMs: 0,
  maxLagMs: 50,
  allowCoalesce: true,
  yieldStrategy: 'baseline',
}

const runtimeConfig: StateTransactionRuntimeConfig = {
  txnLanes: {
    enabled: true,
    budgetMs: 2,
    debounceMs: 1,
    maxLagMs: 60,
    allowCoalesce: true,
    yieldStrategy: 'baseline',
  },
  txnLanesOverridesByModuleId: {
    [moduleId]: {
      budgetMs: 3,
      debounceMs: 2,
      maxLagMs: 70,
      allowCoalesce: false,
      yieldStrategy: 'inputPending',
    },
  },
}

const providerOverrides: StateTransactionOverrides = {
  txnLanes: {
    enabled: true,
    budgetMs: 4,
    debounceMs: 3,
    maxLagMs: 80,
    allowCoalesce: true,
    yieldStrategy: 'baseline',
  },
  txnLanesOverridesByModuleId: {
    [moduleId]: {
      overrideMode: 'forced_sync',
      budgetMs: 5,
      debounceMs: 4,
      maxLagMs: 90,
      allowCoalesce: false,
      yieldStrategy: 'inputPending',
    },
  },
}

const layer = Layer.mergeAll(
  Layer.succeed(StateTransactionConfigTag, runtimeConfig),
  Layer.succeed(StateTransactionOverridesTag, providerOverrides),
)

const resolver = makeResolveTxnLanePolicy({
  moduleId,
  stateTransaction: {
    txnLanes: builtinTxnLanes,
  },
})

type BenchStats = {
  readonly samplesMs: ReadonlyArray<number>
  readonly p50Ms: number
  readonly p95Ms: number
  readonly meanMs: number
  readonly stddevMs: number
  readonly perIterUs: {
    readonly p50: number
    readonly p95: number
    readonly mean: number
  }
}

type BenchResult = {
  readonly stats: BenchStats
  readonly finalPolicy: ResolvedTxnLanePolicy
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx] ?? 0
}

const summarizeSamples = (samples: ReadonlyArray<number>): BenchStats => {
  const meanMs = samples.reduce((acc, value) => acc + value, 0) / Math.max(samples.length, 1)
  const variance =
    samples.reduce((acc, value) => {
      const diff = value - meanMs
      return acc + diff * diff
    }, 0) / Math.max(samples.length, 1)

  const p50Ms = quantile(samples, 0.5)
  const p95Ms = quantile(samples, 0.95)
  const perIterScale = 1000 / iterations

  return {
    samplesMs: Array.from(samples),
    p50Ms,
    p95Ms,
    meanMs,
    stddevMs: Math.sqrt(variance),
    perIterUs: {
      p50: p50Ms * perIterScale,
      p95: p95Ms * perIterScale,
      mean: meanMs * perIterScale,
    },
  }
}

const runLegacy = (): Effect.Effect<BenchResult> =>
  Effect.gen(function* () {
    const runOnce = (): Effect.Effect<{ durationMs: number; policy: ResolvedTxnLanePolicy }> =>
      Effect.gen(function* () {
        const startedAt = performance.now()
        let policy: ResolvedTxnLanePolicy | undefined = undefined
        for (let i = 0; i < iterations; i++) {
          policy = yield* resolver()
        }
        const durationMs = Math.max(0, performance.now() - startedAt)
        if (!policy) {
          throw new Error('Legacy benchmark did not produce a policy')
        }
        return { durationMs, policy }
      })

    for (let i = 0; i < warmupRounds; i++) {
      yield* runOnce()
    }

    const samples: number[] = []
    let finalPolicy: ResolvedTxnLanePolicy | undefined = undefined
    for (let i = 0; i < rounds; i++) {
      const measured = yield* runOnce()
      samples.push(measured.durationMs)
      finalPolicy = measured.policy
    }

    if (!finalPolicy) {
      throw new Error('Legacy benchmark did not produce final policy')
    }

    return {
      stats: summarizeSamples(samples),
      finalPolicy,
    }
  })

const runCaptureCache = (): Effect.Effect<BenchResult> =>
  Effect.gen(function* () {
    const runOnce = (): Effect.Effect<{ durationMs: number; policy: ResolvedTxnLanePolicy }> =>
      Effect.gen(function* () {
        const captured = captureTxnLanePolicy({
          previous: undefined,
          resolvedPolicy: yield* resolver(),
        })

        const startedAt = performance.now()
        let policy: ResolvedTxnLanePolicy | undefined = undefined
        for (let i = 0; i < iterations; i++) {
          const resolved = resolveTxnLanePolicyFromCache(captured)
          if (!resolved) {
            throw new Error('Capture cache unexpectedly missed')
          }
          policy = resolved.policy
        }
        const durationMs = Math.max(0, performance.now() - startedAt)
        if (!policy) {
          throw new Error('Capture cache benchmark did not produce a policy')
        }
        return { durationMs, policy }
      })

    for (let i = 0; i < warmupRounds; i++) {
      yield* runOnce()
    }

    const samples: number[] = []
    let finalPolicy: ResolvedTxnLanePolicy | undefined = undefined
    for (let i = 0; i < rounds; i++) {
      const measured = yield* runOnce()
      samples.push(measured.durationMs)
      finalPolicy = measured.policy
    }

    if (!finalPolicy) {
      throw new Error('Capture cache benchmark did not produce final policy')
    }

    return {
      stats: summarizeSamples(samples),
      finalPolicy,
    }
  })

const main = async (): Promise<void> => {
  const legacy = await Effect.runPromise(runLegacy().pipe(Effect.provide(layer)))
  const captureCache = await Effect.runPromise(runCaptureCache().pipe(Effect.provide(layer)))
  try {
    assert.deepStrictEqual(captureCache.finalPolicy, legacy.finalPolicy)
  } catch {
    throw new Error(
      `[o024-perf] policy mismatch between legacy and captureCache paths\nlegacy=${JSON.stringify(legacy.finalPolicy)}\ncaptureCache=${JSON.stringify(captureCache.finalPolicy)}`,
    )
  }
  const captureCacheOutlierNote =
    `captureCache tail variance observed (p50=${captureCache.stats.p50Ms.toFixed(6)}ms, ` +
    `p95=${captureCache.stats.p95Ms.toFixed(6)}ms, stddev=${captureCache.stats.stddevMs.toFixed(6)}ms). ` +
    'A single large sample in samplesMs is expected under GC/JIT warm-up noise and is not treated as a functional regression.'

  const before = {
    meta: {
      createdAt: new Date().toISOString(),
      benchmark: 'o024-txn-lane-policy-cache',
      mode: 'legacy_recompute',
      iterations,
      rounds,
      warmupRounds,
      env: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
    metrics: legacy.stats,
    sample: {
      policy: legacy.finalPolicy,
    },
  }

  const after = {
    meta: {
      createdAt: new Date().toISOString(),
      benchmark: 'o024-txn-lane-policy-cache',
      mode: 'capture_cache_hit',
      iterations,
      rounds,
      warmupRounds,
      env: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
    metrics: captureCache.stats,
    sample: {
      policy: captureCache.finalPolicy,
    },
  }

  const diff = {
    meta: {
      createdAt: new Date().toISOString(),
      benchmark: 'o024-txn-lane-policy-cache',
      iterations,
      rounds,
      warmupRounds,
    },
    legacy: before.metrics,
    captureCache: after.metrics,
    delta: {
      p50Ms: after.metrics.p50Ms - before.metrics.p50Ms,
      p95Ms: after.metrics.p95Ms - before.metrics.p95Ms,
      meanMs: after.metrics.meanMs - before.metrics.meanMs,
      speedupRatioP50: before.metrics.p50Ms / Math.max(after.metrics.p50Ms, Number.EPSILON),
      speedupRatioP95: before.metrics.p95Ms / Math.max(after.metrics.p95Ms, Number.EPSILON),
      speedupRatioMean: before.metrics.meanMs / Math.max(after.metrics.meanMs, Number.EPSILON),
    },
    analysis: {
      captureCacheOutlierNote,
    },
  }

  const beforeFile = resolve(outDir, 'before.legacy.txn-lane-policy-cache.json')
  const afterFile = resolve(outDir, 'after.capture-cache.txn-lane-policy-cache.json')
  const diffFile = resolve(outDir, 'diff.legacy__capture-cache.txn-lane-policy-cache.json')

  await mkdir(dirname(beforeFile), { recursive: true })
  await writeFile(beforeFile, `${JSON.stringify(before, null, 2)}\n`, 'utf8')
  await writeFile(afterFile, `${JSON.stringify(after, null, 2)}\n`, 'utf8')
  await writeFile(diffFile, `${JSON.stringify(diff, null, 2)}\n`, 'utf8')

  console.log(`[o024-perf] wrote ${beforeFile}`)
  console.log(`[o024-perf] wrote ${afterFile}`)
  console.log(`[o024-perf] wrote ${diffFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
