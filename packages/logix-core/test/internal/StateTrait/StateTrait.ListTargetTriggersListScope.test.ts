import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import * as StateTraitValidate from '../../../src/internal/state-trait/validate.js'

describe('StateTrait list target triggers list-scope check', () => {
  const RowSchema = Schema.Struct({
    warehouseId: Schema.String,
  })

  type Row = Schema.Schema.Type<typeof RowSchema>

  const StateSchema = Schema.Struct({
    items: Schema.Array(RowSchema),
    errors: Schema.Any,
  })

  const traits = Logix.StateTrait.from(StateSchema)({
    items: Logix.StateTrait.list<Row>({
      list: Logix.StateTrait.node<ReadonlyArray<Row>>({
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

  const program = Logix.StateTrait.build(StateSchema, traits)

  const run = (requests: ReadonlyArray<StateTraitValidate.ScopedValidateRequest>) =>
    Effect.gen(function* () {
      type State = Schema.Schema.Type<typeof StateSchema>
      let draft: State = {
        items: [{ warehouseId: 'WH-1' }, { warehouseId: 'WH-1' }],
        errors: {},
      }

      const patches: Array<any> = []
      const ctx: StateTraitValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-1',
        origin: { kind: 'test', name: 'scopedValidate' },
        listConfigs: RowId.collectListConfigs(traits as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: (patch) => {
          patches.push(patch)
        },
      }

      yield* StateTraitValidate.validateInTransaction(program as any, ctx, requests)

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
