import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import * as StateTraitValidate from '../../../src/internal/state-trait/validate.js'
import {
  DEFAULT_DUPLICATE_INDICES,
  DEFAULT_DUPLICATE_WAREHOUSE_ID,
  applyDuplicateWarehouse,
  makeInitialState,
  makeUniqueWarehouseListScopeTraits,
  setWarehouseIdAt,
  ListScopeStateSchema,
} from '../../fixtures/listScopeCheck.js'

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

describe('StateTrait list-scope check · perf baseline (Diagnostics=off)', () => {
  it.effect('100 rows duplicate/un-duplicate p95 baseline', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 30)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)

      const traits = makeUniqueWarehouseListScopeTraits('items')
      const program = Logix.StateTrait.build(ListScopeStateSchema, traits)
      const listConfigs = RowId.collectListConfigs(traits as any)
      const rowIdStore = new RowId.RowIdStore('i-list-scope-perf')

      const runOnce = Effect.sync(() => {
        let draft: any = makeInitialState()
        let setDraftCalls = 0
        let patchCount = 0

        const ctx: StateTraitValidate.ValidateContext<any> = {
          moduleId: 'Perf',
          instanceId: 'i-list-scope-perf',
          origin: { kind: 'perf', name: 'list-scope-off' },
          rowIdStore,
          listConfigs,
          getDraft: () => draft,
          setDraft: (next) => {
            setDraftCalls += 1
            draft = next
          },
          recordPatch: () => {
            patchCount += 1
          },
        }

        const validateAt = (valuePath: string) =>
          StateTraitValidate.validateInTransaction(program as any, ctx, [
            { mode: 'valueChange', target: { kind: 'field', path: valuePath } },
          ])

        return Effect.gen(function* () {
          // Make duplicates -> remove duplicates (two steps) to observe the hot-path cost of "cross-row consistent writeback".
          draft = {
            ...draft,
            items: applyDuplicateWarehouse(draft.items, DEFAULT_DUPLICATE_INDICES, DEFAULT_DUPLICATE_WAREHOUSE_ID),
          }
          yield* validateAt('items.20.warehouseId')

          draft = {
            ...draft,
            items: setWarehouseIdAt(draft.items, 20, 'WH-020'),
          }
          yield* validateAt('items.20.warehouseId')

          draft = {
            ...draft,
            items: setWarehouseIdAt(draft.items, 30, 'WH-030'),
          }
          yield* validateAt('items.30.warehouseId')

          expect(setDraftCalls).toBeGreaterThan(0)
          expect(patchCount).toBeGreaterThan(0)
        })
      }).pipe(Effect.flatten)

      const samples: number[] = []

      // warmup
      for (let i = 0; i < warmup; i++) {
        const t0 = globalThis.performance.now()
        yield* runOnce
        const dt = globalThis.performance.now() - t0
        samples.push(dt)
      }

      samples.length = 0

      // measure
      for (let i = 0; i < iterations; i++) {
        const t0 = globalThis.performance.now()
        yield* runOnce
        const dt = globalThis.performance.now() - t0
        samples.push(dt)
      }

      const p50 = quantile(samples, 0.5)
      const p95 = quantile(samples, 0.95)

      // Intended for manually filling specs/010-form-api-perf-boundaries/references/perf-baseline.md
      console.log(
        `[perf] StateTrait.ListScopeCheck.off rows=100 iters=${iterations} p50=${p50.toFixed(
          2,
        )}ms p95=${p95.toFixed(2)}ms`,
      )

      expect(samples.length).toBe(iterations)
    }),
  )
})
