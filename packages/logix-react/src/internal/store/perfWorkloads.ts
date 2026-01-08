import * as Logix from '@logixjs/core'
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
  module.logic(($) =>
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
  Logix.Module.make(moduleId, {
    state: PerfListScopeStateSchema,
    actions: {
      tick: Schema.Void,
    },
    traits: Logix.StateTrait.from(PerfListScopeStateSchema)({
      digest: Logix.StateTrait.computed({
        deps: ['items'],
        get: (items) =>
          `rows:${items.length}:${String(items[0]?.warehouseId ?? '')}:${String(items[items.length - 1]?.warehouseId ?? '')}`,
      }),
      items: Logix.StateTrait.list<PerfListScopeRow>({
        identityHint: { trackBy: 'id' },
        list: Logix.StateTrait.node<ReadonlyArray<PerfListScopeRow>>({
          check: {
            uniqueWarehouse: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<PerfListScopeRow>) => {
                const indicesByValue = new Map<string, Array<number>>()
                for (let i = 0; i < rows.length; i++) {
                  const v = String(rows[i]?.warehouseId ?? '').trim()
                  if (!v) continue
                  const bucket = indicesByValue.get(v) ?? []
                  bucket.push(i)
                  indicesByValue.set(v, bucket)
                }

                const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                for (const dupIndices of indicesByValue.values()) {
                  if (dupIndices.length <= 1) continue
                  for (const i of dupIndices) {
                    rowErrors[i] = { warehouseId: 'duplicate' }
                  }
                }

                return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
              },
            },
          },
        }),
      }),
    }),
  })

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
