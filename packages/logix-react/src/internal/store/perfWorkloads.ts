import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import type { YieldPolicy } from '../provider/policy.js'

export const PerfCounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

export type PerfCounterState = Schema.Schema.Type<typeof PerfCounterStateSchema>

export const PerfCounterActions = {
  inc: Schema.Void,
}

export const makePerfCounterModule = (moduleId: string) =>
  Logix.Module.make(moduleId, {
    state: PerfCounterStateSchema,
    actions: PerfCounterActions,
  })

type PerfCounterModule = ReturnType<typeof makePerfCounterModule>

export const makePerfCounterIncWatchersLogic = (module: PerfCounterModule, watcherCount: number) =>
  module.logic(`${module.id}-inc-watchers`, ($) =>
    Effect.gen(function* () {
      for (let i = 0; i < watcherCount; i++) {
        yield* $.onAction('inc').runParallelFork(
          $.state.update((prev: PerfCounterState) => ({
            ...prev,
            value: prev.value + 1,
          })),
        )
      }
    }),
  )

export const PerfListScopeRowSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
})

export type PerfListScopeRow = Schema.Schema.Type<typeof PerfListScopeRowSchema>

export const PerfListScopeStateSchema = Schema.Struct({
  items: Schema.Array(PerfListScopeRowSchema),
  digest: Schema.String,
  errors: Schema.Any,
})

export type PerfListScopeState = Schema.Schema.Type<typeof PerfListScopeStateSchema>

export const makePerfListScopeRows = (rowCount: number): ReadonlyArray<PerfListScopeRow> =>
  Array.from({ length: Math.max(0, rowCount) }, (_, i) => ({
    id: `row-${i}`,
    warehouseId: `WH-${String(i).padStart(3, '0')}`,
  }))

export const makePerfListScopeInitialState = (rowCount: number): PerfListScopeState => ({
  items: Array.from(makePerfListScopeRows(rowCount)),
  digest: '',
  errors: {},
})

export const makePerfListScopeCheckModule = (moduleId: string) =>
  FieldContracts.withModuleFieldDeclarations(
    Logix.Module.make(moduleId, {
      state: PerfListScopeStateSchema,
      actions: {
        tick: Schema.Void,
      },
    }),
    FieldContracts.fieldFrom(PerfListScopeStateSchema)({
      digest: FieldContracts.fieldComputed({
        deps: ['items'],
        get: (items: ReadonlyArray<PerfListScopeRow>) =>
          `rows:${items.length}:${String(items[0]?.warehouseId ?? '')}:${String(items[items.length - 1]?.warehouseId ?? '')}`,
      }),
      items: FieldContracts.fieldList<PerfListScopeRow>({
        identityHint: { trackBy: 'id' },
        list: FieldContracts.fieldNode<ReadonlyArray<PerfListScopeRow>>({
          check: {
            uniqueWarehouse: {
              deps: ['warehouseId'],
              validate: (() => {
                // Incremental list-scope unique check (performance-first, best-effort):
                // - Keeps per-list-instance caches keyed by stable rowIds (trackBy/store/index).
                // - Uses ctx.scope.changedIndices when available to avoid full rescans.
                // - Falls back to full scan on structural changes or missing hints.
                type RowError = Record<string, unknown>

                type Cache = {
                  readonly rowCount: number
                  readonly rowIds: ReadonlyArray<string>
                  readonly valueByRowId: Map<string, string>
                  readonly indicesByValue: Map<string, Set<number>>
                }

                // Cache per concrete list instance.
                const cacheByKey = new Map<string, Cache>()

                const getRowId = (
                  rows: ReadonlyArray<PerfListScopeRow>,
                  index: number,
                  ctx: any,
                ): string => {
                  const fromFn = ctx?.scope?.rowIdAt
                  if (typeof fromFn === 'function') {
                    const v = fromFn(index)
                    if (typeof v === 'string' && v.length > 0) return v
                  }
                  const row = rows[index]
                  const trackBy = typeof row?.id === 'string' ? row.id : undefined
                  return trackBy ? trackBy : String(index)
                }

                const normalizeValue = (v: unknown): string => String(v ?? '').trim()

                const removeIndexFromValueBucket = (cache: Cache, value: string, index: number): void => {
                  const bucket = cache.indicesByValue.get(value)
                  if (!bucket) return
                  bucket.delete(index)
                  if (bucket.size === 0) cache.indicesByValue.delete(value)
                }

                const addIndexToValueBucket = (cache: Cache, value: string, index: number): void => {
                  const bucket = cache.indicesByValue.get(value) ?? new Set<number>()
                  bucket.add(index)
                  cache.indicesByValue.set(value, bucket)
                }

                const fullRebuild = (rows: ReadonlyArray<PerfListScopeRow>, ctx: any): Cache => {
                  const rowIds: string[] = new Array(rows.length)
                  const valueByRowId = new Map<string, string>()
                  const indicesByValue = new Map<string, Set<number>>()

                  for (let i = 0; i < rows.length; i++) {
                    const rowId = getRowId(rows, i, ctx)
                    rowIds[i] = rowId
                    const value = normalizeValue(rows[i]?.warehouseId)
                    valueByRowId.set(rowId, value)
                    if (!value) continue
                    const bucket = indicesByValue.get(value) ?? new Set<number>()
                    bucket.add(i)
                    indicesByValue.set(value, bucket)
                  }

                  return { rowCount: rows.length, rowIds, valueByRowId, indicesByValue }
                }

                const buildErrorsFromCache = (cache: Cache): { readonly rows: Array<RowError | undefined> } | undefined => {
                  // Sparse errors array; only allocate and touch duplicates.
                  let hasAny = false
                  const out: Array<RowError | undefined> = new Array(cache.rowCount)
                  for (const bucket of cache.indicesByValue.values()) {
                    if (bucket.size <= 1) continue
                    hasAny = true
                    for (const i of bucket) {
                      if (i < 0 || i >= cache.rowCount) continue
                      out[i] = { warehouseId: 'duplicate' }
                    }
                  }
                  return hasAny ? { rows: out } : undefined
                }

                return (rows: ReadonlyArray<PerfListScopeRow>, ctx: any) => {
                  const listKey = `${String(ctx?.scope?.listPath ?? '')}@@${(ctx?.scope?.listIndexPath ?? []).join(',')}`

                  const prev = cacheByKey.get(listKey)
                  const changedIndices: ReadonlyArray<number> | undefined = Array.isArray(ctx?.scope?.changedIndices)
                    ? (ctx.scope.changedIndices as ReadonlyArray<number>)
                    : undefined

                  // If the caller cannot provide a precise changed-indices hint (e.g. list/root validate),
                  // we must fall back to a full rebuild to preserve correctness.
                  // (Perf-only workload: correctness > micro-alloc savings.)
                  const hasPreciseChangedIndices = !!(changedIndices && changedIndices.length > 0)

                  // Structural changes or missing hints: full rebuild.
                  const shouldRebuild =
                    !prev || prev.rowCount !== rows.length || !hasPreciseChangedIndices

                  const cache = shouldRebuild ? fullRebuild(rows, ctx) : (prev as Cache)

                  if (!shouldRebuild) {
                    for (const index of changedIndices!) {
                      if (!Number.isInteger(index) || index < 0 || index >= rows.length) continue

                      const rowId = getRowId(rows, index, ctx)

                      // RowId drift (reorder or identity change) => rebuild.
                      if (cache.rowIds[index] !== rowId) {
                        const rebuilt = fullRebuild(rows, ctx)
                        cacheByKey.set(listKey, rebuilt)
                        return buildErrorsFromCache(rebuilt)
                      }

                      const nextValue = normalizeValue(rows[index]?.warehouseId)
                      const prevValue = cache.valueByRowId.get(rowId) ?? ''
                      if (Object.is(prevValue, nextValue)) continue

                      cache.valueByRowId.set(rowId, nextValue)

                      if (prevValue) removeIndexFromValueBucket(cache, prevValue, index)
                      if (nextValue) addIndexToValueBucket(cache, nextValue, index)
                    }
                  }

                  if (shouldRebuild) {
                    cacheByKey.set(listKey, cache)
                  }

                  return buildErrorsFromCache(cache)
                }
              })(),
            },
          },
        }),
      }),
    }),
  )

type WorkloadStats = {
  seen: boolean
  samplesMs: number[]
}

type WorkloadRegistry = {
  byRuntime: WeakMap<object, Map<string, WorkloadStats>>
}

const GLOBAL_YIELD_BUDGET_MEMORY_KEY = '__LOGIX_REACT_YIELD_BUDGET_MEMORY__'

const getGlobalYieldBudgetMemory = (): WorkloadRegistry => {
  const root = globalThis as any
  const existing = root[GLOBAL_YIELD_BUDGET_MEMORY_KEY] as WorkloadRegistry | undefined
  if (existing && existing.byRuntime instanceof WeakMap) {
    return existing
  }
  const created: WorkloadRegistry = { byRuntime: new WeakMap() }
  root[GLOBAL_YIELD_BUDGET_MEMORY_KEY] = created
  return created
}

const getStatsMapForRuntime = (runtime: object): Map<string, WorkloadStats> => {
  const global = getGlobalYieldBudgetMemory()
  const cached = global.byRuntime.get(runtime)
  if (cached) return cached
  const created = new Map<string, WorkloadStats>()
  global.byRuntime.set(runtime, created)
  return created
}

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const p95 = (samplesMs: ReadonlyArray<number>): number => {
  if (samplesMs.length === 0) return Number.NaN
  const sorted = samplesMs.slice().sort((a, b) => a - b)
  return quantile(sorted, 0.95)
}

export const YieldBudgetMemory = {
  shouldYield(args: {
    readonly runtime: object
    readonly workloadKey: string
    readonly policy: YieldPolicy | undefined
  }) {
    const budgetMs = args.policy?.onlyWhenOverBudgetMs
    if (budgetMs === undefined) {
      return { shouldYield: true, reason: 'budgetDisabled' as const, p95Ms: undefined as number | undefined }
    }

    const byKey = getStatsMapForRuntime(args.runtime)
    const stats = byKey.get(args.workloadKey) ?? { seen: false, samplesMs: [] }
    if (!byKey.has(args.workloadKey)) {
      byKey.set(args.workloadKey, stats)
    }

    if (!stats.seen) {
      stats.seen = true
      return { shouldYield: true, reason: 'firstRun' as const, p95Ms: undefined as number | undefined }
    }

    if (stats.samplesMs.length === 0) {
      return { shouldYield: true, reason: 'insufficientSamples' as const, p95Ms: undefined as number | undefined }
    }

    const p95Ms = p95(stats.samplesMs)
    if (!Number.isFinite(p95Ms)) {
      return { shouldYield: true, reason: 'insufficientSamples' as const, p95Ms: undefined as number | undefined }
    }

    return p95Ms > budgetMs
      ? { shouldYield: true, reason: 'overBudget' as const, p95Ms }
      : { shouldYield: false, reason: 'underBudget' as const, p95Ms }
  },

  record(args: { readonly runtime: object; readonly workloadKey: string; readonly durationMs: number }) {
    if (!Number.isFinite(args.durationMs) || args.durationMs < 0) return

    const byKey = getStatsMapForRuntime(args.runtime)
    const stats = byKey.get(args.workloadKey) ?? { seen: true, samplesMs: [] }
    if (!byKey.has(args.workloadKey)) {
      byKey.set(args.workloadKey, stats)
    }

    stats.samplesMs.push(args.durationMs)
    if (stats.samplesMs.length > 20) {
      stats.samplesMs.shift()
    }
  },
}
