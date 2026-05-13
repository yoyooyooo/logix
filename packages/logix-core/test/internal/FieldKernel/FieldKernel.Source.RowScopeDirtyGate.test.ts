import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as FieldSource from '../../../src/internal/field-kernel/source.impl.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'

describe('FieldKernel source row-scope dirty gate', () => {
  it.effect('uses exact list dirty evidence to evaluate only the changed row source key', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        items: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            warehouseId: Schema.String,
            resource: Schema.Struct({ status: Schema.String }),
          }),
        ),
      })

      type State = Schema.Schema.Type<typeof StateSchema>
      const initial: State = {
        items: [
          { id: 'row-0', warehouseId: 'WH-000', resource: { status: 'success' } },
          { id: 'row-1', warehouseId: 'WH-001', resource: { status: 'success' } },
          { id: 'row-2', warehouseId: 'WH-002', resource: { status: 'success' } },
        ],
      }

      let keyEvalCount = 0
      const keyEvalRows: Array<string> = []

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        items: FieldContracts.fieldList({
          identityHint: { trackBy: 'id' },
          item: FieldContracts.fieldNode({
            source: {
              resource: FieldContracts.fieldSource({
                deps: ['warehouseId'],
                resource: 'item/resource',
                key: (warehouseId) => {
                  keyEvalCount += 1
                  keyEvalRows.push(String(warehouseId))
                  return warehouseId ? 'active' : undefined
                },
              }),
            },
          }),
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-row-scope-dirty-gate',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
        getListPathSet: () => new Set(['items']),
      })
      let draft = initial

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-row-scope' }, initial)
      StateTransaction.recordPatch(txnContext, 'items.1.warehouseId', 'reducer')
      const dirtyPlan = StateTransaction.readDirtyPlanSnapshot(txnContext)

      expect(FieldSource.getSourceRowScopeRunPlan({ listPath: 'items', dirtyPlan })).toMatchObject({
        mode: 'changed',
        indices: Int32Array.from([1]),
      })

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-row-scope-dirty-gate',
        dirtyPlan,
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(keyEvalCount).toBe(1)
      expect(keyEvalRows).toEqual(['WH-001'])
    }),
  )
})
