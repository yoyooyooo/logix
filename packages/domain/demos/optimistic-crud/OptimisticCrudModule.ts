import * as Logix from '@logix/core'
import { Context, Effect, Option, Schema } from 'effect'
import type { CrudApi, CrudQueryResult } from '@logix/domain'
import { applyOptimisticOps, removeOp, type OptimisticOp } from './optimisticList.js'

export interface OptimisticCrudSpec<
  Entity extends object,
  QueryInput = { readonly pageSize: number },
  EntityId = string,
> {
  readonly entity: Schema.Schema<Entity>
  readonly query?: Schema.Schema<QueryInput>
  readonly id?: Schema.Schema<EntityId>
  readonly initial?: ReadonlyArray<Entity>
  readonly idField?: string
}

export type OptimisticCrudServices<Entity extends object, QueryInput, EntityId> = {
  readonly api: Logix.State.Tag<CrudApi<Entity, QueryInput, EntityId>>
}

export type OptimisticCrudHandleExt<Entity extends object, QueryInput, EntityId> = {
  readonly controller: {
    readonly query: (input: QueryInput) => Effect.Effect<void>
    readonly save: (entity: Entity) => Effect.Effect<void>
    readonly remove: (id: EntityId) => Effect.Effect<void>
    readonly clearError: () => Effect.Effect<void>
  }
  readonly services: OptimisticCrudServices<Entity, QueryInput, EntityId>
}

const DefaultQueryInputSchema = Schema.Struct({
  pageSize: Schema.Number,
})

const toErrorMessage = (error: unknown): string => {
  if (error === null || error === undefined) return 'unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message
  }
  if (typeof error === 'object') {
    if ('message' in error) {
      const message = (error as { readonly message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
    try {
      const json = JSON.stringify(error)
      if (typeof json === 'string' && json.length > 0) return json
    } catch {
      // ignore
    }
  }
  return String(error)
}

export const makeOptimisticCrudModule = <
  Id extends string,
  Entity extends object,
  QueryInput = Schema.Schema.Type<typeof DefaultQueryInputSchema>,
  EntityId = string,
>(
  id: Id,
  spec: OptimisticCrudSpec<Entity, QueryInput, EntityId>,
) => {
  const QuerySchema = (spec.query ?? DefaultQueryInputSchema) as Schema.Schema<QueryInput>
  const IdSchema = (spec.id ?? Schema.String) as Schema.Schema<EntityId>
  const idField = spec.idField ?? 'id'

  class Api extends Context.Tag(`${id}/optimistic-crud/api`)<Api, CrudApi<Entity, QueryInput, EntityId>>() {}

  const services = { api: Api } as const satisfies OptimisticCrudServices<Entity, QueryInput, EntityId>

  const PendingOpSchema = Schema.Union(
    Schema.Struct({
      _tag: Schema.Literal('save'),
      opId: Schema.String,
      seq: Schema.Number,
      entity: spec.entity,
    }),
    Schema.Struct({
      _tag: Schema.Literal('remove'),
      opId: Schema.String,
      seq: Schema.Number,
      id: IdSchema,
    }),
  )

  type PendingOp = Schema.Schema.Type<typeof PendingOpSchema>

  const StateSchema = Schema.Struct({
    base: Schema.Array(spec.entity),
    pending: Schema.Array(PendingOpSchema),
    items: Schema.Array(spec.entity),
    loading: Schema.Boolean,
    error: Schema.UndefinedOr(Schema.String),
    lastQuery: Schema.UndefinedOr(QuerySchema),
    lastQueryOpId: Schema.UndefinedOr(Schema.String),
    total: Schema.UndefinedOr(Schema.Number),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  const toDraft = <T>(value: T): Logix.Logic.Draft<T> => value as unknown as Logix.Logic.Draft<T>

  const getId = (entity: Entity | Logix.Logic.Draft<Entity>): EntityId =>
    (entity as Record<string, unknown>)[idField] as EntityId

  const recomputeItems = (base: ReadonlyArray<Entity>, pending: ReadonlyArray<PendingOp>): ReadonlyArray<Entity> =>
    applyOptimisticOps(base, pending as ReadonlyArray<OptimisticOp<Entity, EntityId>>, getId)

  const upsertBase = (base: ReadonlyArray<Entity>, entity: Entity): ReadonlyArray<Entity> => {
    const id = getId(entity)
    const idx = base.findIndex((x) => getId(x) === id)
    if (idx < 0) return [...base, entity]
    return base.map((x, i) => (i === idx ? entity : x))
  }

  const Actions = {
    query: Schema.Struct({
      opId: Schema.String,
      seq: Schema.Number,
      input: QuerySchema,
    }),
    querySucceeded: Schema.Struct({
      opId: Schema.String,
      result: Schema.Struct({
        items: Schema.Array(spec.entity),
        total: Schema.UndefinedOr(Schema.Number),
      }) as Schema.Schema<CrudQueryResult<Entity>>,
    }),
    queryFailed: Schema.Struct({ opId: Schema.String, error: Schema.String }),

    save: Schema.Struct({ opId: Schema.String, seq: Schema.Number, entity: spec.entity }),
    saveSucceeded: Schema.Struct({ opId: Schema.String, entity: spec.entity }),
    saveFailed: Schema.Struct({ opId: Schema.String, error: Schema.String }),

    remove: Schema.Struct({ opId: Schema.String, seq: Schema.Number, id: IdSchema }),
    removeSucceeded: Schema.Struct({ opId: Schema.String, id: IdSchema }),
    removeFailed: Schema.Struct({ opId: Schema.String, error: Schema.String }),

    clearError: Schema.Struct({}),
  } as const

  type ActionMap = typeof Actions

  const immerReducers = {
    query: (draft, payload) => {
      draft.loading = true
      draft.error = undefined
      draft.lastQuery = toDraft(payload.input)
      draft.lastQueryOpId = payload.opId
    },
    querySucceeded: (draft, payload) => {
      if (draft.lastQueryOpId && payload.opId !== draft.lastQueryOpId) {
        return
      }

      draft.base = Array.from(payload.result.items).map(toDraft)
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.total = payload.result.total
      draft.error = undefined
      draft.loading = draft.pending.length > 0
    },
    queryFailed: (draft, payload) => {
      if (draft.lastQueryOpId && payload.opId !== draft.lastQueryOpId) {
        return
      }

      draft.error = payload.error
      draft.loading = draft.pending.length > 0
    },

    save: (draft, payload) => {
      draft.pending.push({
        _tag: 'save',
        opId: payload.opId,
        seq: payload.seq,
        entity: toDraft(payload.entity),
      })
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = undefined
      draft.loading = true
    },
    saveSucceeded: (draft, payload) => {
      if (!draft.pending.some((op) => op.opId === payload.opId)) {
        return
      }

      draft.base = Array.from(
        upsertBase(draft.base as unknown as ReadonlyArray<Entity>, payload.entity),
      ).map(toDraft)
      draft.pending = Array.from(removeOp(draft.pending, payload.opId))
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = undefined
      draft.loading = draft.pending.length > 0
    },
    saveFailed: (draft, payload) => {
      if (!draft.pending.some((op) => op.opId === payload.opId)) {
        return
      }

      draft.pending = Array.from(removeOp(draft.pending, payload.opId))
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = payload.error
      draft.loading = draft.pending.length > 0
    },

    remove: (draft, payload) => {
      draft.pending.push({
        _tag: 'remove',
        opId: payload.opId,
        seq: payload.seq,
        id: toDraft(payload.id),
      })
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = undefined
      draft.loading = true
    },
    removeSucceeded: (draft, payload) => {
      if (!draft.pending.some((op) => op.opId === payload.opId)) {
        return
      }

      draft.base = draft.base.filter((e) => getId(e) !== payload.id)
      draft.pending = Array.from(removeOp(draft.pending, payload.opId))
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = undefined
      draft.loading = draft.pending.length > 0
    },
    removeFailed: (draft, payload) => {
      if (!draft.pending.some((op) => op.opId === payload.opId)) {
        return
      }

      draft.pending = Array.from(removeOp(draft.pending, payload.opId))
      draft.items = Array.from(
        recomputeItems(
          draft.base as unknown as ReadonlyArray<Entity>,
          draft.pending as unknown as ReadonlyArray<PendingOp>,
        ),
      ).map(toDraft)
      draft.error = payload.error
      draft.loading = draft.pending.length > 0
    },

    clearError: (draft) => {
      draft.error = undefined
    },
  } satisfies Logix.MutatorsFromMap<typeof StateSchema, ActionMap>

  const module = Logix.Module.make<
    Id,
    typeof StateSchema,
    ActionMap,
    OptimisticCrudHandleExt<Entity, QueryInput, EntityId>
  >(id, {
    state: StateSchema,
    actions: Actions,
    immerReducers,
    meta: { kind: 'optimistic-crud', idField },
    services,
  })

  const install = module.logic(
    ($) =>
      Effect.gen(function* () {
        yield* $.onAction('query').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.queryFailed({
                opId: action.payload.opId,
                error: `[OptimisticCrud] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              })
              return
            }
            const api = apiOpt.value
            const result = yield* api.list(action.payload.input)
            yield* $.dispatchers.querySucceeded({ opId: action.payload.opId, result })
          }).pipe(
            Effect.catchAll((e) =>
              $.dispatchers.queryFailed({
                opId: action.payload.opId,
                error: toErrorMessage(e),
              }),
            ),
          ),
        )

        yield* $.onAction('save').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.saveFailed({
                opId: action.payload.opId,
                error: `[OptimisticCrud] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              })
              return
            }
            const api = apiOpt.value
            const entity = yield* api.save(action.payload.entity as Entity)
            yield* $.dispatchers.saveSucceeded({ opId: action.payload.opId, entity })
          }).pipe(
            Effect.catchAll((e) =>
              $.dispatchers.saveFailed({
                opId: action.payload.opId,
                error: toErrorMessage(e),
              }),
            ),
          ),
        )

        yield* $.onAction('remove').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.removeFailed({
                opId: action.payload.opId,
                error: `[OptimisticCrud] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              })
              return
            }
            const api = apiOpt.value
            yield* api.remove(action.payload.id as EntityId)
            yield* $.dispatchers.removeSucceeded({
              opId: action.payload.opId,
              id: action.payload.id,
            })
          }).pipe(
            Effect.catchAll((e) =>
              $.dispatchers.removeFailed({
                opId: action.payload.opId,
                error: toErrorMessage(e),
              }),
            ),
          ),
        )
      }),
    { id: 'install' },
  )

  const controller = {
    make: (runtime: Logix.ModuleRuntime<State, Logix.ActionsFromMap<ActionMap>>) => {
      let nextSeq = 0
      const newOp = (): { readonly opId: string; readonly seq: number } => {
        nextSeq += 1
        const seq = nextSeq
        return { opId: `${runtime.instanceId}::op${seq}`, seq }
      }

      return {
        runtime,
        getState: runtime.getState,
        dispatch: runtime.dispatch,
        controller: {
          query: (input: QueryInput) => {
            const { opId, seq } = newOp()
            return runtime.dispatch({ _tag: 'query', payload: { opId, seq, input } } as any)
          },
          save: (entity: Entity) => {
            const { opId, seq } = newOp()
            return runtime.dispatch({ _tag: 'save', payload: { opId, seq, entity } } as any)
          },
          remove: (id: EntityId) => {
            const { opId, seq } = newOp()
            return runtime.dispatch({ _tag: 'remove', payload: { opId, seq, id } } as any)
          },
          clearError: () => runtime.dispatch({ _tag: 'clearError', payload: {} } as any),
        },
        services,
      }
    },
  }

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  ;(module.tag as unknown as Record<PropertyKey, unknown>)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<any, any>,
    base: Logix.ModuleHandle<Logix.AnyModuleShape>,
  ) => {
    const ext = controller.make(runtime as any)
    return { ...base, controller: ext.controller, services }
  }

  return module.implement({
    initial: {
      base: Array.from(spec.initial ?? []),
      pending: [],
      items: recomputeItems(Array.from(spec.initial ?? []), []),
      loading: false,
      error: undefined,
      lastQuery: undefined,
      lastQueryOpId: undefined,
      total: undefined,
    } satisfies State,
    logics: [install],
  }) as unknown as Logix.Module.Module<
    Id,
    typeof module.shape,
    OptimisticCrudHandleExt<Entity, QueryInput, EntityId>,
    unknown
  > & {
    readonly services: OptimisticCrudServices<Entity, QueryInput, EntityId>
  }
}
