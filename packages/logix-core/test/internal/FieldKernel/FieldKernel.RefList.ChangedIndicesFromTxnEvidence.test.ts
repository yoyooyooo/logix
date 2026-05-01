import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import { ListScopeStateSchema, makeInitialState, setWarehouseIdAt, type Row } from '../../fixtures/listScopeCheck.js'

describe('FieldKernel validate: Ref.list changedIndices from txn evidence', () => {
  it.effect('should derive changedIndices for list validate (Ref.list) from txn recordPatch(valuePath)', () =>
    Effect.gen(function* () {
      const fieldSpec = FieldContracts.fieldFrom(ListScopeStateSchema)({
        items: FieldContracts.fieldList<Row>({
          identityHint: { trackBy: 'id' },
          list: FieldContracts.fieldNode<ReadonlyArray<Row>>({
            check: {
              onlyChanged: {
                deps: ['warehouseId'],
                validate: (rows: ReadonlyArray<Row>, ctx: any) => {
                  const changed: ReadonlyArray<number> | undefined = ctx?.scope?.changedIndices
                  const out: Array<Record<string, unknown> | undefined> = new Array(rows.length)

                  // If changedIndices is missing, this intentionally degrades to "full" (to make the test fail).
                  if (!changed || changed.length === 0) {
                    for (let i = 0; i < rows.length; i++) {
                      out[i] = { warehouseId: 'FULL' }
                    }
                    return { rows: out }
                  }

                  for (const i of changed) {
                    if (!Number.isInteger(i) || i < 0 || i >= rows.length) continue
                    out[i] = { warehouseId: 'CHANGED' }
                  }
                  return { rows: out }
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
        instanceId: 'i-ref-list-txn-evidence',
        instrumentation: 'light',
        getFieldPathIdRegistry: () => fieldPathIdRegistry,
        getListPathSet: () => listPathSet,
      })

      const rowIdStore = new RowId.RowIdStore('i-ref-list-txn-evidence')

      const initial = makeInitialState({ rowCount: 3 })
      StateTransaction.beginTransaction(txnContext, { kind: 'perf', name: 'c-1' }, initial as any)

      // Mutate index 1 and record value-path evidence.
      const next = { ...(initial as any), items: setWarehouseIdAt(initial.items, 1, 'WH-CHANGED') }
      StateTransaction.updateDraft(txnContext, next as any)
      StateTransaction.recordPatch(txnContext, 'items.1.warehouseId', 'perf')

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'Perf',
          instanceId: 'i-ref-list-txn-evidence',
          origin: { kind: 'perf', name: 'c-1' },
          rowIdStore,
          listConfigs,
          txnDirtyEvidence: StateTransaction.readDirtyEvidence(txnContext),
          getDraft: () => txnContext.current!.draft as any,
          setDraft: (next) => {
            StateTransaction.updateDraft(txnContext, next as any)
          },
          recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
            StateTransaction.recordPatch(txnContext, path as any, reason as any, from, to, fieldNodeId, stepId),
        } as FieldValidate.ValidateContext<any>,
        [{ mode: 'valueChange', target: { kind: 'list', path: 'items' } }],
      )

      const draft: any = txnContext.current!.draft as any
      const rows = draft?.errors?.items?.rows as Array<any> | undefined
      expect(Array.isArray(rows)).toBe(true)
      if (!rows) return

      // "CHANGED" only at index 1 when changedIndices is derived; otherwise it degrades to FULL for all rows.
      expect(rows[0]?.warehouseId).toBeUndefined()
      expect(rows[1]?.warehouseId).toBe('CHANGED')
      expect(rows[2]?.warehouseId).toBeUndefined()
    }),
  )

  it.effect('should derive changedIndices for list validate (Ref.list) from txn recordPatch(arrayPath)', () =>
    Effect.gen(function* () {
      const fieldSpec = FieldContracts.fieldFrom(ListScopeStateSchema)({
        items: FieldContracts.fieldList<Row>({
          identityHint: { trackBy: 'id' },
          list: FieldContracts.fieldNode<ReadonlyArray<Row>>({
            check: {
              onlyChanged: {
                deps: ['warehouseId'],
                validate: (rows: ReadonlyArray<Row>, ctx: any) => {
                  const changed: ReadonlyArray<number> | undefined = ctx?.scope?.changedIndices
                  const out: Array<Record<string, unknown> | undefined> = new Array(rows.length)

                  if (!changed || changed.length === 0) {
                    for (let i = 0; i < rows.length; i++) {
                      out[i] = { warehouseId: 'FULL' }
                    }
                    return { rows: out }
                  }

                  for (const i of changed) {
                    if (!Number.isInteger(i) || i < 0 || i >= rows.length) continue
                    out[i] = { warehouseId: 'CHANGED' }
                  }
                  return { rows: out }
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
        instanceId: 'i-ref-list-txn-evidence',
        instrumentation: 'light',
        getFieldPathIdRegistry: () => fieldPathIdRegistry,
        getListPathSet: () => listPathSet,
      })

      const rowIdStore = new RowId.RowIdStore('i-ref-list-txn-evidence')

      const initial = makeInitialState({ rowCount: 3 })
      StateTransaction.beginTransaction(txnContext, { kind: 'perf', name: 'c-1' }, initial as any)

      const next = { ...(initial as any), items: setWarehouseIdAt(initial.items, 1, 'WH-CHANGED') }
      StateTransaction.updateDraft(txnContext, next as any)

      // Record array-path evidence that includes the list index segment ("1").
      StateTransaction.recordPatch(txnContext, ['items', '1', 'warehouseId'], 'perf')

      yield* FieldValidate.validateInTransaction(
        program as any,
        {
          moduleId: 'Perf',
          instanceId: 'i-ref-list-txn-evidence',
          origin: { kind: 'perf', name: 'c-1' },
          rowIdStore,
          listConfigs,
          txnDirtyEvidence: StateTransaction.readDirtyEvidence(txnContext),
          getDraft: () => txnContext.current!.draft as any,
          setDraft: (next) => {
            StateTransaction.updateDraft(txnContext, next as any)
          },
          recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
            StateTransaction.recordPatch(txnContext, path as any, reason as any, from, to, fieldNodeId, stepId),
        } as FieldValidate.ValidateContext<any>,
        [{ mode: 'valueChange', target: { kind: 'list', path: 'items' } }],
      )

      const draft: any = txnContext.current!.draft as any
      const rows = draft?.errors?.items?.rows as Array<any> | undefined
      expect(Array.isArray(rows)).toBe(true)
      if (!rows) return

      expect(rows[0]?.warehouseId).toBeUndefined()
      expect(rows[1]?.warehouseId).toBe('CHANGED')
      expect(rows[2]?.warehouseId).toBeUndefined()
    }),
  )
})
