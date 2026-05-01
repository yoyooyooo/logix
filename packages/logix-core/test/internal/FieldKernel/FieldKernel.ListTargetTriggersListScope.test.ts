import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'

describe('FieldKernel list target triggers list-scope check', () => {
  const RowSchema = Schema.Struct({
    warehouseId: Schema.String,
  })

  type Row = Schema.Schema.Type<typeof RowSchema>

  const StateSchema = Schema.Struct({
    items: Schema.Array(RowSchema),
    errors: Schema.Any,
  })

  const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
    items: FieldContracts.fieldList<Row>({
      list: FieldContracts.fieldNode<ReadonlyArray<Row>>({
        check: {
          uniqueWarehouse: {
            deps: ['warehouseId'],
            validate: (rows: ReadonlyArray<Row>) => {
              const list = rows
              const seen = new Set<string>()
              for (const row of list) {
                const v = String(row?.warehouseId ?? '').trim()
                if (!v) continue
                if (seen.has(v)) return 'duplicate'
                seen.add(v)
              }
              return undefined
            },
          },
        },
      }),
    }),
  })

  const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

  const run = (requests: ReadonlyArray<FieldValidate.ScopedValidateRequest>) =>
    Effect.gen(function* () {
      type State = Schema.Schema.Type<typeof StateSchema>
      let draft: State = {
        items: [{ warehouseId: 'WH-1' }, { warehouseId: 'WH-1' }],
        errors: {},
      }

      const patches: Array<any> = []
      const ctx: FieldValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-1',
        origin: { kind: 'test', name: 'scopedValidate' },
        listConfigs: RowId.collectListConfigs(fieldSpec as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: (patch) => {
          patches.push(patch)
        },
      }

      yield* FieldValidate.validateInTransaction(program as any, ctx, requests)

      return { draft, patches }
    })

  it.effect("Ref.list('items') selects list-scope check", () =>
    Effect.gen(function* () {
      const { draft } = yield* run([{ mode: 'manual', target: { kind: 'list', path: 'items' } }])

      expect(draft.errors.items?.$list).toBe('duplicate')
    }),
  )

  it.effect("Ref.field('items.0.warehouseId') selects list-scope check via pattern normalization", () =>
    Effect.gen(function* () {
      const { draft } = yield* run([
        {
          mode: 'manual',
          target: { kind: 'field', path: 'items.0.warehouseId' },
        },
      ])

      expect(draft.errors.items?.$list).toBe('duplicate')
    }),
  )
})
