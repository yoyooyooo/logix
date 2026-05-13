import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect } from 'effect'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import { ListScopeStateSchema, makeInitialState, setWarehouseIdAt, type Row } from '../../fixtures/listScopeCheck.js'

describe('FieldKernel validate one-row dirty no full scan', () => {
  it.effect('uses txn list evidence changedIndices instead of full list validate for one-row dirty', () =>
    Effect.gen(function* () {
      let validateAllCallCount = 0
      let validateChangedCallCount = 0
      let seenRowsLength = 0
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
                  throw new Error('full list validate must not run for one-row dirty')
                },
                validateChanged: (rows: ReadonlyArray<Row>, changedIndices: ReadonlyArray<number>) => {
                  validateChangedCallCount += 1
                  seenRowsLength = rows.length
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
      const listPathSet = new Set<string>(['items'])
      const fieldPathIdRegistry = program.convergeIr?.fieldPathIdRegistry
      const txnContext = StateTransaction.makeContext<any>({
        moduleId: 'Perf',
        instanceId: 'i-one-row-dirty-no-full-scan',
        instrumentation: 'light',
        getFieldPathIdRegistry: () => fieldPathIdRegistry,
        getListPathSet: () => listPathSet,
      })

      const initial = makeInitialState({ rowCount: 16 })
      StateTransaction.beginTransaction(txnContext, { kind: 'perf', name: 'one-row-dirty' }, initial as any)
      StateTransaction.updateDraft(txnContext, {
        ...initial,
        items: setWarehouseIdAt(initial.items, 7, 'WH-CHANGED'),
      } as any)
      StateTransaction.recordPatch(txnContext, 'items.7.warehouseId', 'perf')

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'Perf',
          instanceId: 'i-one-row-dirty-no-full-scan',
          origin: { kind: 'perf', name: 'one-row-dirty' },
          rowIdStore: new RowId.RowIdStore('i-one-row-dirty-no-full-scan'),
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
      expect(seenRowsLength).toBe(16)
      expect(seenChangedIndices).toEqual([7])
    }),
  )
})
