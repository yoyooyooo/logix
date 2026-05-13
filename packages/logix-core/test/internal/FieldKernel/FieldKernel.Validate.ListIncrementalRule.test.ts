import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import { ListScopeStateSchema, makeInitialState, setWarehouseIdAt, type Row } from '../../fixtures/listScopeCheck.js'

describe('FieldKernel validate list incremental rule', () => {
  it.effect('calls validateChanged with changedIndices for list validate', () =>
    Effect.gen(function* () {
      let validateAllCallCount = 0
      let validateChangedCallCount = 0
      let seenChangedIndices: ReadonlyArray<number> | undefined

      const fieldSpec = FieldContracts.fieldFrom(ListScopeStateSchema)({
        items: FieldContracts.fieldList<Row>({
          identityHint: { trackBy: 'id' },
          list: FieldContracts.fieldNode<ReadonlyArray<Row>>({
            check: {
              incremental: {
                deps: ['warehouseId'],
                validate: () => {
                  validateAllCallCount += 1
                  return []
                },
                validateChanged: (_rows: ReadonlyArray<Row>, changedIndices: ReadonlyArray<number>) => {
                  validateChangedCallCount += 1
                  seenChangedIndices = changedIndices
                  return []
                },
              },
            },
          }),
        }),
      })

      const program = FieldContracts.buildFieldProgram(ListScopeStateSchema, fieldSpec)
      const listConfigs = RowId.collectListConfigs(fieldSpec as any)
      const listPathSet = new Set<string>()
      for (const cfg of listConfigs as any) {
        const p = cfg?.path
        if (typeof p === 'string' && p.length > 0) listPathSet.add(p)
      }

      const fieldPathIdRegistry = (program as any)?.convergeIr?.fieldPathIdRegistry
      const txnContext = StateTransaction.makeContext<any>({
        moduleId: 'Perf',
        instanceId: 'i-list-incremental-rule',
        instrumentation: 'light',
        getFieldPathIdRegistry: () => fieldPathIdRegistry,
        getListPathSet: () => listPathSet,
      })

      const rowIdStore = new RowId.RowIdStore('i-list-incremental-rule')
      const initial = makeInitialState({ rowCount: 4 })
      StateTransaction.beginTransaction(txnContext, { kind: 'perf', name: 'incremental-rule' }, initial as any)
      const next = { ...(initial as any), items: setWarehouseIdAt(initial.items, 3, 'WH-CHANGED') }
      StateTransaction.updateDraft(txnContext, next as any)
      StateTransaction.recordPatch(txnContext, 'items.3.warehouseId', 'perf')

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'Perf',
          instanceId: 'i-list-incremental-rule',
          origin: { kind: 'perf', name: 'incremental-rule' },
          rowIdStore,
          listConfigs,
          dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
          getDraft: () => txnContext.current!.draft as any,
          setDraft: (next) => {
            StateTransaction.updateDraft(txnContext, next as any)
          },
          recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
            StateTransaction.recordPatch(txnContext, path as any, reason as any, from, to, fieldNodeId, stepId),
        } as FieldValidate.ValidateContext<any>,
        [{ mode: 'valueChange', target: { kind: 'list', path: 'items' } }],
      )

      expect(validateChangedCallCount).toBe(1)
      expect(validateAllCallCount).toBe(0)
      expect(seenChangedIndices).toEqual([3])
    }),
  )
})
