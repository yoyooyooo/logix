import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'
import type { TxnDirtyEvidenceSnapshot } from '../../../../src/internal/runtime/core/StateTransaction.js'
import * as RowId from '../../../../src/internal/field-kernel/rowid.js'

type BenchMode = 'baseline' | 'guarded'

type BenchState = {
  readonly meta: {
    readonly updatedAt: number
  }
  readonly [key: string]: unknown
}

type BenchResult = {
  readonly p50: number
  readonly p95: number
  readonly updateAllCalls: number
  readonly shouldSyncTrueCount: number
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

const makeDirty = (dirtyPathIds: ReadonlyArray<number>, dirtyAll = false): TxnDirtyEvidenceSnapshot => {
  if (dirtyAll) {
    return {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      dirtyPathIds: [],
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  return {
    dirtyAll: false,
    dirtyPathIds,
    dirtyPathsKeyHash: 0,
    dirtyPathsKeySize: dirtyPathIds.length,
  }
}

const makeBenchState = (listCount: number, rowCount: number): BenchState => {
  const next: Record<string, unknown> = {
    meta: {
      updatedAt: 0,
    },
  }

  for (let listIndex = 0; listIndex < listCount; listIndex += 1) {
    next[`list${listIndex}`] = Array.from({ length: rowCount }, (_, rowIndex) => ({
      id: `list${listIndex}-row${rowIndex}`,
      value: rowIndex,
    }))
  }

  return next as BenchState
}

const makeListConfigs = (listCount: number): ReadonlyArray<RowId.ListConfig> =>
  Array.from({ length: listCount }, (_, listIndex) => ({
    path: `list${listIndex}`,
    trackBy: 'id',
  }))

const runBench = (args: {
  readonly mode: BenchMode
  readonly iterations: number
  readonly warmup: number
  readonly txnsPerIteration: number
  readonly getListConfigs: () => ReadonlyArray<RowId.ListConfig>
  readonly dirty: TxnDirtyEvidenceSnapshot
  readonly state: BenchState
  readonly fieldPathIdRegistry: ReturnType<typeof makeFieldPathIdRegistry> | undefined
}): BenchResult => {
  const { mode, iterations, warmup, txnsPerIteration, getListConfigs, dirty, state, fieldPathIdRegistry } = args

  const rowIdStore = new RowId.RowIdStore(`i-list-configs-guard-perf-${mode}`)
  const primeListConfigs = getListConfigs()
  if (primeListConfigs.length > 0) {
    rowIdStore.updateAll(state as any, primeListConfigs)
  }

  let updateAllCalls = 0
  let shouldSyncTrueCount = 0

  const runTxnBatch = (): void => {
    for (let txnIndex = 0; txnIndex < txnsPerIteration; txnIndex += 1) {
      const listConfigs = getListConfigs()
      if (listConfigs.length === 0) continue

      if (mode === 'baseline') {
        rowIdStore.updateAll(state as any, listConfigs)
        updateAllCalls += 1
        continue
      }

      const shouldSyncRowIds = RowId.shouldReconcileListConfigsByDirtyEvidence({
        dirty,
        listConfigs,
        fieldPathIdRegistry,
      })

      if (shouldSyncRowIds) {
        shouldSyncTrueCount += 1
        rowIdStore.updateAll(state as any, listConfigs)
        updateAllCalls += 1
      }
    }
  }

  for (let i = 0; i < warmup; i += 1) {
    runTxnBatch()
  }

  updateAllCalls = 0
  shouldSyncTrueCount = 0

  const samples: number[] = []
  for (let i = 0; i < iterations; i += 1) {
    const t0 = now()
    runTxnBatch()
    samples.push(now() - t0)
  }

  return {
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    updateAllCalls,
    shouldSyncTrueCount,
  }
}

describe('ModuleRuntime.transaction listConfigs guard · perf baseline (Diagnostics=off)', () => {
  it.effect(
    'should provide reproducible evidence for no-overlap fast path vs overlap path',
    () =>
      Effect.sync(() => {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 20)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)
      const txnsPerIteration = Number(process.env.LOGIX_PERF_TXNS ?? 256)
      const listCount = Number(process.env.LOGIX_PERF_LISTS ?? 24)
      const rowCount = Number(process.env.LOGIX_PERF_ROWS ?? 32)

      const state = makeBenchState(listCount, rowCount)
      const listConfigs = makeListConfigs(listCount)
      const getListConfigs = () => listConfigs

      const fieldPathIdRegistry = makeFieldPathIdRegistry([
        ['meta', 'updatedAt'],
        // Structural list root dirtiness must trigger RowId reconciliation.
        ['list0'],
        // Non-structural list item field updates (e.g. list0.value) should be gated.
        ['list0', 'value'],
        // TrackBy dirtiness must still trigger reconciliation (identity can change).
        ['list0', 'id'],
      ])

      const noOverlapDirty = makeDirty([0])
      const overlapDirty = makeDirty([1])

      const noOverlapBaseline = runBench({
        mode: 'baseline',
        iterations,
        warmup,
        txnsPerIteration,
        getListConfigs,
        dirty: noOverlapDirty,
        state,
        fieldPathIdRegistry,
      })

      const noOverlapGuarded = runBench({
        mode: 'guarded',
        iterations,
        warmup,
        txnsPerIteration,
        getListConfigs,
        dirty: noOverlapDirty,
        state,
        fieldPathIdRegistry,
      })

      const overlapBaseline = runBench({
        mode: 'baseline',
        iterations,
        warmup,
        txnsPerIteration,
        getListConfigs,
        dirty: overlapDirty,
        state,
        fieldPathIdRegistry,
      })

      const overlapGuarded = runBench({
        mode: 'guarded',
        iterations,
        warmup,
        txnsPerIteration,
        getListConfigs,
        dirty: overlapDirty,
        state,
        fieldPathIdRegistry,
      })

      const expectedUpdateAllCalls = iterations * txnsPerIteration
      expect(noOverlapBaseline.updateAllCalls).toBe(expectedUpdateAllCalls)
      expect(noOverlapGuarded.updateAllCalls).toBe(0)
      expect(overlapBaseline.updateAllCalls).toBe(expectedUpdateAllCalls)
      expect(overlapGuarded.updateAllCalls).toBe(expectedUpdateAllCalls)
      expect(overlapGuarded.shouldSyncTrueCount).toBe(expectedUpdateAllCalls)

      const noOverlapSpeedup = noOverlapBaseline.p50 / Math.max(noOverlapGuarded.p50, Number.EPSILON)
      const overlapOverheadRatio = overlapGuarded.p50 / Math.max(overlapBaseline.p50, Number.EPSILON)

      console.log(
        `[perf] ModuleRuntime.transaction.listConfigsGuard no-overlap iters=${iterations} txns=${txnsPerIteration} ` +
          `baseline.p50=${noOverlapBaseline.p50.toFixed(3)}ms baseline.p95=${noOverlapBaseline.p95.toFixed(3)}ms ` +
          `guarded.p50=${noOverlapGuarded.p50.toFixed(3)}ms guarded.p95=${noOverlapGuarded.p95.toFixed(3)}ms ` +
          `speedup=${noOverlapSpeedup.toFixed(2)}x updateAll(baseline=${noOverlapBaseline.updateAllCalls},guarded=${noOverlapGuarded.updateAllCalls})`,
      )

      console.log(
        `[perf] ModuleRuntime.transaction.listConfigsGuard overlap iters=${iterations} txns=${txnsPerIteration} ` +
          `baseline.p50=${overlapBaseline.p50.toFixed(3)}ms baseline.p95=${overlapBaseline.p95.toFixed(3)}ms ` +
          `guarded.p50=${overlapGuarded.p50.toFixed(3)}ms guarded.p95=${overlapGuarded.p95.toFixed(3)}ms ` +
          `guardedOverhead=${overlapOverheadRatio.toFixed(2)}x updateAll(baseline=${overlapBaseline.updateAllCalls},guarded=${overlapGuarded.updateAllCalls})`,
      )
      }),
  )
})
