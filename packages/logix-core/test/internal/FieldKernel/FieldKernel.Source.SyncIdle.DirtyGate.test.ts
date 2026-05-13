import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as FieldSource from '../../../src/internal/field-kernel/source.impl.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'

describe('FieldKernel source sync idle dirty gate', () => {
  const StateSchema = Schema.Struct({
    user: Schema.Struct({
      name: Schema.String,
      locale: Schema.String,
    }),
    settings: Schema.Struct({
      locale: Schema.String,
    }),
    userResource: Schema.Struct({
      status: Schema.String,
    }),
    settingsResource: Schema.Struct({
      status: Schema.String,
    }),
    noDepsResource: Schema.Struct({
      status: Schema.String,
    }),
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
        resource: Schema.Struct({
          status: Schema.String,
        }),
      }),
    ),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  const makeState = (): State => ({
    user: { name: 'n', locale: 'zh-CN' },
    settings: { locale: 'en-US' },
    userResource: { status: 'success' },
    settingsResource: { status: 'success' },
    noDepsResource: { status: 'success' },
    items: [
      { id: 'row-0', warehouseId: 'WH-000', resource: { status: 'success' } },
      { id: 'row-1', warehouseId: 'WH-001', resource: { status: 'success' } },
      { id: 'row-2', warehouseId: 'WH-002', resource: { status: 'success' } },
    ],
  })

  it.effect('skips unrelated source key eval and keeps explicit empty deps idle source untouched', () =>
    Effect.gen(function* () {
      let userKeyEvalCount = 0
      let settingsKeyEvalCount = 0
      let noDepsKeyEvalCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        userResource: FieldContracts.fieldSource({
          deps: ['user.name'],
          resource: 'user/resource',
          key: (name) => {
            userKeyEvalCount += 1
            return name ? 'active' : undefined
          },
        }),
        settingsResource: FieldContracts.fieldSource({
          deps: ['settings.locale'],
          resource: 'settings/resource',
          key: (locale) => {
            settingsKeyEvalCount += 1
            return locale ? 'active' : undefined
          },
        }),
        noDepsResource: FieldContracts.fieldSource({
          deps: [],
          resource: 'nodeps/resource',
          key: () => {
            noDepsKeyEvalCount += 1
            return undefined
          },
        }),
      })
      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-dirty-gate',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-gate' }, state)
      StateTransaction.recordPatch(txnContext, 'user.name', 'reducer')

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-dirty-gate',
        dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(userKeyEvalCount).toBe(1)
      expect(settingsKeyEvalCount).toBe(0)
      expect(noDepsKeyEvalCount).toBe(0)
    }),
  )

  it.effect('treats parent dirty root as affecting child source deps', () =>
    Effect.gen(function* () {
      let keyEvalCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        userResource: FieldContracts.fieldSource({
          deps: ['user.name'],
          resource: 'user/resource',
          key: () => {
            keyEvalCount += 1
            return undefined
          },
        }),
      })
      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-parent-dirty',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-parent' }, state)
      StateTransaction.recordPatch(txnContext, 'user', 'reducer')

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-parent-dirty',
        dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(keyEvalCount).toBe(1)
    }),
  )

  it.effect('treats child dirty root as affecting parent source deps', () =>
    Effect.gen(function* () {
      let keyEvalCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        userResource: FieldContracts.fieldSource({
          deps: ['user'],
          resource: 'user/resource',
          key: () => {
            keyEvalCount += 1
            return undefined
          },
        } as any),
      })
      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-child-dirty',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-child' }, state)
      StateTransaction.recordPatch(txnContext, 'user.name', 'reducer')

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-child-dirty',
        dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(keyEvalCount).toBe(1)
    }),
  )

  it('rejects unmappable source deps at build time', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      userResource: FieldContracts.fieldSource({
        deps: ['missing.user'],
        resource: 'user/resource',
        key: () => undefined,
      } as any),
    })

    expect(() => FieldContracts.buildFieldProgram(StateSchema, fieldSpec)).toThrow(/unmappable dep "missing\.user"/)
  })

  it.effect('evaluates only changed row keys for affected list sources with exact row evidence', () =>
    Effect.gen(function* () {
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
        instanceId: 'source-list-row-dirty',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
        getListPathSet: () => new Set(['items']),
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-list-row' }, state)
      StateTransaction.recordPatch(txnContext, 'items.1.warehouseId', 'reducer')

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-list-row-dirty',
        dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
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

  it.effect('falls back to all rows when list root is touched', () =>
    Effect.gen(function* () {
      let keyEvalCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        items: FieldContracts.fieldList({
          identityHint: { trackBy: 'id' },
          item: FieldContracts.fieldNode({
            source: {
              resource: FieldContracts.fieldSource({
                deps: ['warehouseId'],
                resource: 'item/resource',
                key: () => {
                  keyEvalCount += 1
                  return 'active'
                },
              }),
            },
          }),
        }),
      })
      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-list-root-dirty',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
        getListPathSet: () => new Set(['items']),
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-list-root' }, state)
      StateTransaction.recordPatch(txnContext, 'items', 'reducer')
      expect(
        FieldSource.getSourceRowScopeRunPlan({
          listPath: 'items',
          dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
        }),
      ).toMatchObject({
        mode: 'full',
        fallbackReason: 'list_root_touched',
        kernelFallbackReason: 'list_root_touched',
      })

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-list-root-dirty',
        dirtyPlan: StateTransaction.readDirtyPlanSnapshot(txnContext),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(keyEvalCount).toBe(3)
    }),
  )

  it.effect('falls back when dirty plan field-path key does not match source IR', () =>
    Effect.gen(function* () {
      let keyEvalCount = 0

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        userResource: FieldContracts.fieldSource({
          deps: ['user.name'],
          resource: 'user/resource',
          key: () => {
            keyEvalCount += 1
            return undefined
          },
        }),
      })
      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const txnContext = StateTransaction.makeContext<State>({
        instanceId: 'source-field-path-key-mismatch',
        getFieldPathIdRegistry: () => program.convergeIr?.fieldPathIdRegistry,
      })
      const state = makeState()
      let draft = state

      StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'source-field-path-key' }, state)
      StateTransaction.recordPatch(txnContext, 'settings.locale', 'reducer')
      const dirtyPlan = StateTransaction.readDirtyPlanSnapshot(txnContext)
      const mismatchedDirtyPlan = dirtyPlan ? { ...dirtyPlan, fieldPathsKey: 'mismatched' } : dirtyPlan

      expect(FieldSource.collectAffectedSourceDecision(program, mismatchedDirtyPlan)).toMatchObject({
        mode: 'full',
        fallbackReason: 'field_paths_key_mismatch',
        kernelFallbackReason: 'field_paths_key_mismatch',
      })

      yield* FieldSource.syncIdleInTransaction(program, {
        instanceId: 'source-field-path-key-mismatch',
        dirtyPlan: mismatchedDirtyPlan,
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      })

      expect(keyEvalCount).toBe(1)
    }),
  )
})
