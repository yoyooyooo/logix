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

describe('StateTrait list-scope check · writeback ($list/rows[])', () => {
  it.effect('duplicate/un-duplicate updates all affected row errors', () =>
    Effect.gen(function* () {
      const traits = makeUniqueWarehouseListScopeTraits('items')
      const program = Logix.StateTrait.build(ListScopeStateSchema, traits)

      const listConfigs = RowId.collectListConfigs(traits as any)
      const rowIdStore = new RowId.RowIdStore('i-list-scope')

      let draft: any = makeInitialState()
      let setDraftCalls = 0
      const patches: Array<any> = []

      const ctx: StateTraitValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-list-scope',
        origin: { kind: 'test', name: 'list-scope-writeback' },
        rowIdStore,
        listConfigs,
        getDraft: () => draft,
        setDraft: (next) => {
          setDraftCalls += 1
          draft = next
        },
        recordPatch: (patch) => {
          patches.push(patch)
        },
      }

      const validateAt = (valuePath: string) =>
        StateTraitValidate.validateInTransaction(program as any, ctx, [
          { mode: 'valueChange', target: { kind: 'field', path: valuePath } },
        ])

      // 初始：无错误（validate 不应产生写回）。
      yield* validateAt('items.0.warehouseId')
      expect(setDraftCalls).toBe(0)
      expect(patches.length).toBe(0)

      // 制造重复：10/20/30 行都应标错。
      draft = {
        ...draft,
        items: applyDuplicateWarehouse(draft.items, DEFAULT_DUPLICATE_INDICES, DEFAULT_DUPLICATE_WAREHOUSE_ID),
      }
      yield* validateAt('items.20.warehouseId')

      const rows1: any[] = draft.errors?.items?.rows ?? []
      expect(rows1[10]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      expect(rows1[20]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      expect(rows1[30]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      expect(rows1[10]?.$rowId).toBe(draft.items[10]?.id)
      expect(rows1[20]?.$rowId).toBe(draft.items[20]?.id)
      expect(rows1[30]?.$rowId).toBe(draft.items[30]?.id)

      const row10Ref1 = rows1[10]
      const row30Ref1 = rows1[30]

      // 解除一行重复：20 清除；10/30 仍重复且应避免等价 churn（复用引用）。
      draft = {
        ...draft,
        items: setWarehouseIdAt(draft.items, 20, 'WH-020'),
      }
      yield* validateAt('items.20.warehouseId')

      const rows2: any[] = draft.errors?.items?.rows ?? []
      expect(rows2[20]).toBeUndefined()
      expect(rows2[10]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      expect(rows2[30]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      expect(rows2[10]).toBe(row10Ref1)
      expect(rows2[30]).toBe(row30Ref1)

      // 彻底解除重复：30 清除后，10 也应同步清除。
      draft = {
        ...draft,
        items: setWarehouseIdAt(draft.items, 30, 'WH-030'),
      }
      yield* validateAt('items.30.warehouseId')

      const rows3: any[] = draft.errors?.items?.rows ?? []
      expect(rows3[10]).toBeUndefined()
      expect(rows3[20]).toBeUndefined()
      expect(rows3[30]).toBeUndefined()
    }),
  )
})
