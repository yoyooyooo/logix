import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import * as StateTraitValidate from '../../../src/internal/state-trait/validate.js'

describe('StateTrait trait:check diagnostics levels', () => {
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

  const runWithDiagnostics = (options: {
    readonly level: Logix.Debug.DiagnosticsLevel
    readonly originPath: string
    readonly originOp: 'set' | 'unset' | 'insert' | 'remove'
  }) =>
    Effect.gen(function* () {
      type State = Schema.Schema.Type<typeof StateSchema>
      let draft: State = {
        items: [{ warehouseId: 'WH-1' }, { warehouseId: 'WH-1' }],
        errors: {},
      }

      const ring = Logix.Debug.makeRingBufferSink(200)
      const layer = Layer.mergeAll(
        Logix.Debug.replace([ring.sink]),
        Logix.Debug.diagnosticsLevel(options.level),
      ) as Layer.Layer<any, never, any>

      const ctx: StateTraitValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-trait-check',
        txnSeq: 1,
        txnId: 'i-trait-check::t1',
        origin: {
          kind: 'action',
          name: 'dispatch',
          details: { _tag: 'setValue', path: options.originPath, op: options.originOp },
        },
        rowIdStore: new RowId.RowIdStore('i-trait-check'),
        listConfigs: RowId.collectListConfigs(traits as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => undefined,
      }

      yield* StateTraitValidate.validateInTransaction(program as any, ctx, [
        { mode: 'valueChange', target: { kind: 'list', path: 'items' } },
      ]).pipe(Effect.provide(layer))

      const events = ring.getSnapshot().filter((e) => e.type === 'trace:trait:check')
      return events
    })

  it.effect('Diagnostics=off does not emit trait:check events', () =>
    Effect.gen(function* () {
      const events = yield* runWithDiagnostics({
        level: 'off',
        originPath: 'items.0.warehouseId',
        originOp: 'set',
      })
      expect(events.length).toBe(0)
    }),
  )

  it.effect('Diagnostics=light emits exportable trait:check events', () =>
    Effect.gen(function* () {
      const events = yield* runWithDiagnostics({
        level: 'light',
        originPath: 'items.0.warehouseId',
        originOp: 'set',
      })
      expect(events.length).toBeGreaterThan(0)

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(events[0] as any, {
        diagnosticsLevel: 'light',
      }) as any
      expect(ref?.kind).toBe('trait:check')
      expect(ref?.meta?.ruleId).toBe('items#uniqueWarehouse')
      expect(ref?.meta?.scopeFieldPath).toEqual(['items'])
      expect(ref?.meta?.mode).toBe('valueChange')
      expect(ref?.meta?.trigger?.kind).toBe('action:setValue')
      expect(ref?.meta?.trigger?.op).toBe('set')
      expect(ref?.meta?.trigger?.path).toEqual(['items', 'warehouseId'])
      expect(ref?.meta?.rowIdMode).toBe('store')
      expect(ref?.meta?.degraded).toBeUndefined()
      expect(() => JSON.stringify(ref)).not.toThrow()
    }),
  )

  it.effect('Diagnostics=full emits exportable trait:check events', () =>
    Effect.gen(function* () {
      const events = yield* runWithDiagnostics({
        level: 'full',
        originPath: 'items.0.warehouseId',
        originOp: 'set',
      })
      expect(events.length).toBeGreaterThan(0)

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(events[0] as any, {
        diagnosticsLevel: 'full',
      }) as any
      expect(ref?.kind).toBe('trait:check')
      expect(() => JSON.stringify(ref)).not.toThrow()
    }),
  )

  it.effect('root replace without trackBy marks degraded', () =>
    Effect.gen(function* () {
      const events = yield* runWithDiagnostics({
        level: 'full',
        originPath: 'items',
        originOp: 'set',
      })
      expect(events.length).toBeGreaterThan(0)

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(events[0] as any, {
        diagnosticsLevel: 'full',
      }) as any
      expect(ref?.meta?.degraded?.kind).toBe('rowId:degraded:no_trackBy_root_replace')
    }),
  )
})
