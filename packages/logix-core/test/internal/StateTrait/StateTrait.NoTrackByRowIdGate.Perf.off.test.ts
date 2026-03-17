import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import type { TxnDirtyEvidence } from '../../../src/internal/runtime/core/StateTransaction.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import * as StateTraitValidate from '../../../src/internal/state-trait/validate.js'
import * as Logix from '../../../src/index.js'

type BenchMode = 'legacy' | 'gated'

type BenchSample = Readonly<{
  p50: number
  p95: number
  ensureListCalls: number
}>

type Row = Readonly<{
  id: string
  warehouseId: string
  value: number
}>

type State = Readonly<{
  items: ReadonlyArray<Row>
  errors: unknown
}>

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const RowSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
  value: Schema.Number,
})

const StateSchema = Schema.Struct({
  items: Schema.Array(RowSchema),
  errors: Schema.Any,
})

const makeRows = (count: number): ReadonlyArray<Row> =>
  Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    warehouseId: `WH-${String(i).padStart(4, '0')}`,
    value: i,
  }))

const updateRow = (rows: ReadonlyArray<Row>, index: number, seq: number): ReadonlyArray<Row> =>
  rows.map((row, i) =>
    i === index
      ? {
          ...row,
          warehouseId: `WH-${String(index).padStart(4, '0')}-${seq}`,
          value: row.value + 1,
        }
      : row,
  )

const makeStableTxnEvidence = (changedIndex: number): TxnDirtyEvidence => ({
  dirtyAll: false,
  dirtyPathIds: new Set<number>(),
  dirtyPathsKeyHash: 0,
  dirtyPathsKeySize: 1,
  list: {
    indexBindings: new Map([['items@@', new Set([changedIndex])]]),
    rootTouched: new Set<string>(),
    itemTouched: new Map(),
  },
})

const makeProgram = () => {
  const traits = Logix.StateTrait.from(StateSchema)({
    items: Logix.StateTrait.list<Row>({
      list: Logix.StateTrait.node<ReadonlyArray<Row>>({
        check: {
          uniqueWarehouse: {
            deps: ['warehouseId'],
            validate: (rows: ReadonlyArray<Row>) => {
              const indicesByValue = new Map<string, Array<number>>()
              for (let i = 0; i < rows.length; i++) {
                const v = String(rows[i]?.warehouseId ?? '').trim()
                if (!v) continue
                const bucket = indicesByValue.get(v) ?? []
                bucket.push(i)
                indicesByValue.set(v, bucket)
              }

              const rowErrors: Array<Record<string, unknown> | undefined> = new Array(rows.length)
              for (const dupIndices of indicesByValue.values()) {
                if (dupIndices.length <= 1) continue
                for (const i of dupIndices) {
                  rowErrors[i] = { warehouseId: 'dup' }
                }
              }

              return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
            },
          },
        },
      }),
    }),
  })

  return {
    program: Logix.StateTrait.build(StateSchema, traits),
    listConfigs: RowId.collectListConfigs(traits as any),
  }
}

const instrumentEnsureList = (store: RowId.RowIdStore) => {
  let ensureListCalls = 0
  const rawEnsureList = store.ensureList.bind(store)
  ;(store as any).ensureList = (...args: Array<any>) => {
    ensureListCalls += 1
    return rawEnsureList(args[0], args[1], args[2], args[3])
  }
  return {
    read: () => ensureListCalls,
  }
}

const runValidateBench = (args: {
  readonly mode: BenchMode
  readonly rowCount: number
  readonly iterations: number
  readonly warmup: number
}): BenchSample => {
  const { program, listConfigs } = makeProgram()
  const store = new RowId.RowIdStore(`i-no-trackby-validate-${args.mode}-${args.rowCount}`)
  let draft: State = { items: makeRows(args.rowCount), errors: {} }
  store.ensureList('items', draft.items)

  const counter = instrumentEnsureList(store)
  if (args.mode === 'legacy') {
    ;(store as any).canSkipNoTrackByListReconcile = () => false
  }

  const targetIndex = Math.floor(args.rowCount / 2)
  let seq = 0
  const measureOnce = () => {
    seq += 1
    draft = {
      ...draft,
      items: updateRow(draft.items, targetIndex, seq),
    }
    const ctx: StateTraitValidate.ValidateContext<State> = {
      moduleId: 'PerfNoTrackByValidate',
      instanceId: `i-no-trackby-validate-${args.mode}-${args.rowCount}`,
      origin: { kind: 'perf', name: 'no-trackby-rowid-gate' },
      rowIdStore: store,
      listConfigs,
      txnDirtyEvidence: makeStableTxnEvidence(targetIndex),
      getDraft: () => draft,
      setDraft: (next) => {
        draft = next
      },
      recordPatch: () => {},
    }

    const effect = StateTraitValidate.validateInTransaction(program as any, ctx, [
      { mode: 'valueChange', target: { kind: 'field', path: `items.${targetIndex}.warehouseId` } },
    ])

    const t0 = performance.now()
    Effect.runSync(effect)
    return performance.now() - t0
  }

  for (let i = 0; i < args.warmup; i++) measureOnce()
  const samples: Array<number> = []
  for (let i = 0; i < args.iterations; i++) samples.push(measureOnce())

  return {
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    ensureListCalls: counter.read(),
  }
}

const runSourceLikeBench = (args: {
  readonly mode: BenchMode
  readonly rowCount: number
  readonly iterations: number
  readonly warmup: number
}): BenchSample => {
  const store = new RowId.RowIdStore(`i-no-trackby-source-${args.mode}-${args.rowCount}`)
  let items = makeRows(args.rowCount)
  store.ensureList('items', items)

  const counter = instrumentEnsureList(store)
  if (args.mode === 'legacy') {
    ;(store as any).canSkipNoTrackByListReconcile = () => false
  }

  const targetIndex = Math.floor(args.rowCount / 2)
  let seq = 0
  const measureOnce = () => {
    seq += 1
    items = updateRow(items, targetIndex, seq)
    const t0 = performance.now()
    const canSkip = store.canSkipNoTrackByListReconcile({
      listPath: 'items',
      items,
    })
    const ids = canSkip ? undefined : store.ensureList('items', items)
    for (let i = 0; i < items.length; i++) {
      const rowId = ids?.[i] ?? store.getRowId('items', i)
      if (!rowId) throw new Error(`missing rowId at ${i}`)
    }
    return performance.now() - t0
  }

  for (let i = 0; i < args.warmup; i++) measureOnce()
  const samples: Array<number> = []
  for (let i = 0; i < args.iterations; i++) samples.push(measureOnce())

  return {
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    ensureListCalls: counter.read(),
  }
}

describe('StateTrait no-trackBy RowId gate · perf baseline (Diagnostics=off)', () => {
  it.effect('provides reproducible evidence for validate/source-like hot paths', () =>
    Effect.sync(() => {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 60)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 10)

      for (const rowCount of [100, 300, 1000]) {
        const validateLegacy = runValidateBench({ mode: 'legacy', rowCount, iterations, warmup })
        const validateGated = runValidateBench({ mode: 'gated', rowCount, iterations, warmup })
        expect(validateLegacy.ensureListCalls).toBe(iterations + warmup)
        expect(validateGated.ensureListCalls).toBe(0)

        const sourceLegacy = runSourceLikeBench({ mode: 'legacy', rowCount, iterations, warmup })
        const sourceGated = runSourceLikeBench({ mode: 'gated', rowCount, iterations, warmup })
        expect(sourceLegacy.ensureListCalls).toBe(iterations + warmup)
        expect(sourceGated.ensureListCalls).toBe(0)

        console.log(
          `[perf] no-trackby-rowid-gate validate rows=${rowCount} iters=${iterations} ` +
            `legacy.p50=${validateLegacy.p50.toFixed(3)}ms legacy.p95=${validateLegacy.p95.toFixed(3)}ms ` +
            `gated.p50=${validateGated.p50.toFixed(3)}ms gated.p95=${validateGated.p95.toFixed(3)}ms ` +
            `speedup.p50=${(validateLegacy.p50 / Math.max(validateGated.p50, Number.EPSILON)).toFixed(2)}x ` +
            `speedup.p95=${(validateLegacy.p95 / Math.max(validateGated.p95, Number.EPSILON)).toFixed(2)}x ` +
            `ensureList(legacy=${validateLegacy.ensureListCalls},gated=${validateGated.ensureListCalls})`,
        )

        console.log(
          `[perf] no-trackby-rowid-gate source-like rows=${rowCount} iters=${iterations} ` +
            `legacy.p50=${sourceLegacy.p50.toFixed(3)}ms legacy.p95=${sourceLegacy.p95.toFixed(3)}ms ` +
            `gated.p50=${sourceGated.p50.toFixed(3)}ms gated.p95=${sourceGated.p95.toFixed(3)}ms ` +
            `speedup.p50=${(sourceLegacy.p50 / Math.max(sourceGated.p50, Number.EPSILON)).toFixed(2)}x ` +
            `speedup.p95=${(sourceLegacy.p95 / Math.max(sourceGated.p95, Number.EPSILON)).toFixed(2)}x ` +
            `ensureList(legacy=${sourceLegacy.ensureListCalls},gated=${sourceGated.ensureListCalls})`,
        )
      }
    }),
  )
})
