import * as Logix from '@logixjs/core'
import { Context, Effect, Option, Schema } from 'effect'

const DefaultQueryInputSchema = Schema.Struct({
  pageSize: Schema.Number,
})

export type CrudDefaultQueryInput = Schema.Schema.Type<typeof DefaultQueryInputSchema>

export interface CrudQueryResult<Entity> {
  readonly items: ReadonlyArray<Entity>
  readonly total?: number
}

export interface CrudApi<Entity extends object, QueryInput, Id> {
  readonly list: (input: QueryInput) => Effect.Effect<CrudQueryResult<Entity>, unknown, never>
  readonly save: (entity: Entity) => Effect.Effect<Entity, unknown, never>
  readonly remove: (id: Id) => Effect.Effect<void, unknown, never>
}

export interface CrudSpec<Entity extends object, QueryInput = CrudDefaultQueryInput, Id = string> {
  readonly entity: Schema.Schema<Entity>
  readonly query?: Schema.Schema<QueryInput>
  readonly id?: Schema.Schema<Id>
  readonly initial?: ReadonlyArray<Entity>
  /**
   * idField：
   * - The default primary key field for upsert/remove in reducers (default: "id").
   * - For more complex primary-key strategies, prefer handling results in a custom upper-layer Logic and writing back to state.
   */
  readonly idField?: string
}

export type CrudState<Entity, QueryInput> = {
  readonly items: ReadonlyArray<Entity>
  readonly loading: boolean
  readonly error: string | undefined
  readonly lastQuery: QueryInput | undefined
  readonly total: number | undefined
}

export type CrudActionMap<
  Entity extends object,
  QueryInput,
  Id,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> = {
  readonly query: Schema.Schema<QueryInput>
  readonly querySucceeded: Schema.Schema<CrudQueryResult<Entity>>
  readonly queryFailed: Schema.Schema<string>

  readonly save: Schema.Schema<Entity>
  readonly saveSucceeded: Schema.Schema<Entity>
  readonly saveFailed: Schema.Schema<string>

  readonly remove: Schema.Schema<Id>
  readonly removeSucceeded: Schema.Schema<Id>
  readonly removeFailed: Schema.Schema<string>

  readonly clearError: Schema.Schema<void>
} & ExtraActions

export type CrudAction<
  Entity extends object,
  QueryInput,
  Id,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> = Logix.ActionsFromMap<CrudActionMap<Entity, QueryInput, Id, ExtraActions>>

export type CrudShape<
  Entity extends object,
  QueryInput,
  Id,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> = Logix.Shape<Schema.Schema<CrudState<Entity, QueryInput>>, CrudActionMap<Entity, QueryInput, Id, ExtraActions>>

export type CrudServices<Entity extends object, QueryInput, Id> = {
  readonly api: Logix.State.Tag<CrudApi<Entity, QueryInput, Id>>
}

export type CrudHandleExt<
  Entity extends object,
  QueryInput,
  Id,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> = {
  readonly controller: CrudController<Entity, QueryInput, Id, ExtraActions>['controller']
  readonly services: CrudServices<Entity, QueryInput, Id>
}

export interface CrudController<
  Entity extends object,
  QueryInput,
  Id,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> {
  readonly runtime: Logix.ModuleRuntime<CrudState<Entity, QueryInput>, CrudAction<Entity, QueryInput, Id, ExtraActions>>
  readonly getState: Effect.Effect<CrudState<Entity, QueryInput>>
  readonly dispatch: (action: CrudAction<Entity, QueryInput, Id, ExtraActions>) => Effect.Effect<void>
  readonly controller: {
    readonly list: (input: QueryInput) => Effect.Effect<void>
    readonly save: (entity: Entity) => Effect.Effect<void>
    readonly remove: (id: Id) => Effect.Effect<void>
    readonly clearError: () => Effect.Effect<void>
    readonly idField: string
  }
}

const makeActions = <Entity extends object, QueryInput, Id>(
  entity: Schema.Schema<Entity>,
  query: Schema.Schema<QueryInput>,
  id: Schema.Schema<Id>,
): CrudActionMap<Entity, QueryInput, Id> =>
  ({
    query,
    querySucceeded: Schema.Struct({
      items: Schema.Array(entity),
      total: Schema.optional(Schema.Number),
    }) as Schema.Schema<CrudQueryResult<Entity>>,
    queryFailed: Schema.String,

    save: entity,
    saveSucceeded: entity,
    saveFailed: Schema.String,

    remove: id,
    removeSucceeded: id,
    removeFailed: Schema.String,

    clearError: Schema.Void,
  }) satisfies CrudActionMap<Entity, QueryInput, Id>

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

const upsertByIdField = <Entity extends object>(
  items: ReadonlyArray<Entity>,
  entity: Entity,
  idField: string,
): ReadonlyArray<Entity> => {
  const id = (entity as Record<string, unknown>)[idField]
  const idx = items.findIndex((x) => (x as Record<string, unknown>)[idField] === id)
  if (idx < 0) return [...items, entity]
  return items.map((x, i) => (i === idx ? entity : x))
}

const removeByIdField = <Entity extends object>(
  items: ReadonlyArray<Entity>,
  id: unknown,
  idField: string,
): ReadonlyArray<Entity> => items.filter((x) => (x as Record<string, unknown>)[idField] !== id)

export type CrudModule<
  Id extends string,
  Entity extends object,
  QueryInput,
  EntityId,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
> = Logix.Module.Module<
  Id,
  CrudShape<Entity, QueryInput, EntityId, ExtraActions>,
  CrudHandleExt<Entity, QueryInput, EntityId, ExtraActions>,
  unknown
> & {
  readonly _kind: 'Module'
  readonly services: CrudServices<Entity, QueryInput, EntityId>
}

const defineCrud = <
  Id extends string,
  Entity extends object,
  QueryInput = CrudDefaultQueryInput,
  EntityId = string,
  ExtraActions extends Record<string, Logix.AnySchema> = {},
>(
  id: Id,
  spec: CrudSpec<Entity, QueryInput, EntityId>,
  extend?: Logix.Module.MakeExtendDef<
    Schema.Schema<CrudState<Entity, QueryInput>>,
    CrudActionMap<Entity, QueryInput, EntityId>,
    ExtraActions
  >,
): CrudModule<Id, Entity, QueryInput, EntityId, ExtraActions> => {
  const QuerySchema = (spec.query ?? DefaultQueryInputSchema) as Schema.Schema<QueryInput>
  const IdSchema = (spec.id ?? Schema.String) as Schema.Schema<EntityId>

  const idField = spec.idField ?? 'id'

  class Api extends Context.Tag(`${id}/crud/api`)<Api, CrudApi<Entity, QueryInput, EntityId>>() {}

  const services = { api: Api } as const satisfies CrudServices<Entity, QueryInput, EntityId>

  const Actions = makeActions(spec.entity, QuerySchema, IdSchema)

  const StateSchema = Schema.Struct({
    items: Schema.Array(spec.entity),
    loading: Schema.Boolean,
    error: Schema.UndefinedOr(Schema.String),
    lastQuery: Schema.UndefinedOr(QuerySchema),
    total: Schema.UndefinedOr(Schema.Number),
  })

  type Reducers = Logix.ReducersFromMap<typeof StateSchema, CrudActionMap<Entity, QueryInput, EntityId>>

  const reducers: Reducers = {
    query: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      sink?.('lastQuery')
      return {
        ...state,
        loading: true,
        error: undefined,
        lastQuery: action.payload,
      }
    },
    querySucceeded: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      sink?.('items')
      sink?.('total')
      return {
        ...state,
        loading: false,
        error: undefined,
        items: action.payload.items,
        total: action.payload.total,
      }
    },
    queryFailed: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    },

    save: (state, _action, sink) => {
      sink?.('loading')
      sink?.('error')
      return {
        ...state,
        loading: true,
        error: undefined,
      }
    },
    saveSucceeded: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      sink?.('items')
      return {
        ...state,
        loading: false,
        error: undefined,
        items: upsertByIdField(state.items, action.payload as Entity, idField),
      }
    },
    saveFailed: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    },

    remove: (state, _action, sink) => {
      sink?.('loading')
      sink?.('error')
      return {
        ...state,
        loading: true,
        error: undefined,
      }
    },
    removeSucceeded: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      sink?.('items')
      return {
        ...state,
        loading: false,
        error: undefined,
        items: removeByIdField(state.items, action.payload, idField),
      }
    },
    removeFailed: (state, action, sink) => {
      sink?.('loading')
      sink?.('error')
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    },

    clearError: (state, _action, sink) => {
      sink?.('error')
      return {
        ...state,
        error: undefined,
      }
    },
  }

  const def = {
    state: StateSchema,
    actions: Actions,
    reducers,
    schemas: { entity: spec.entity },
    meta: { kind: 'crud', idField },
    services,
  }

  const module = extend
    ? Logix.Module.make<
        Id,
        typeof StateSchema,
        CrudActionMap<Entity, QueryInput, EntityId>,
        CrudHandleExt<Entity, QueryInput, EntityId, ExtraActions>
      >(
        id,
        def,
        extend as unknown as Logix.Module.MakeExtendDef<
          typeof StateSchema,
          CrudActionMap<Entity, QueryInput, EntityId>,
          ExtraActions
        >,
      )
    : Logix.Module.make<
        Id,
        typeof StateSchema,
        CrudActionMap<Entity, QueryInput, EntityId>,
        CrudHandleExt<Entity, QueryInput, EntityId, ExtraActions>
      >(id, def)

  const install = module.logic(
    ($) =>
      Effect.gen(function* () {
        yield* $.onAction('query').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.queryFailed(
                `[CRUDModule] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              )
              return
            }
            const api = apiOpt.value

            const result = yield* api.list(action.payload as QueryInput)
            yield* $.dispatchers.querySucceeded(result)
          }).pipe(Effect.catchAll((e) => $.dispatchers.queryFailed(toErrorMessage(e)))),
        )

        yield* $.onAction('save').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.saveFailed(
                `[CRUDModule] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              )
              return
            }
            const api = apiOpt.value

            const entity = yield* api.save(action.payload as Entity)
            yield* $.dispatchers.saveSucceeded(entity)
          }).pipe(Effect.catchAll((e) => $.dispatchers.saveFailed(toErrorMessage(e)))),
        )

        yield* $.onAction('remove').runFork((action) =>
          Effect.gen(function* () {
            const apiOpt = yield* Effect.serviceOption(services.api)
            if (Option.isNone(apiOpt)) {
              yield* $.dispatchers.removeFailed(
                `[CRUDModule] Missing services.api; provide Layer.succeed(${id}.services.api, impl) via withLayer/withLayers/Runtime layer.`,
              )
              return
            }
            const api = apiOpt.value

            yield* api.remove(action.payload as EntityId)
            yield* $.dispatchers.removeSucceeded(action.payload as EntityId)
          }).pipe(Effect.catchAll((e) => $.dispatchers.removeFailed(toErrorMessage(e)))),
        )
      }),
    { id: 'install' },
  )

  const controller = {
    make: (
      runtime: Logix.ModuleRuntime<
        CrudState<Entity, QueryInput>,
        CrudAction<Entity, QueryInput, EntityId, ExtraActions>
      >,
    ): CrudController<Entity, QueryInput, EntityId, ExtraActions> => ({
      runtime,
      getState: runtime.getState,
      dispatch: runtime.dispatch,
      controller: {
        list: (input: QueryInput) =>
          runtime.dispatch({ _tag: 'query', payload: input } as CrudAction<Entity, QueryInput, EntityId, ExtraActions>),
        save: (entity: Entity) =>
          runtime.dispatch({ _tag: 'save', payload: entity } as CrudAction<Entity, QueryInput, EntityId, ExtraActions>),
        remove: (id: EntityId) =>
          runtime.dispatch({ _tag: 'remove', payload: id } as CrudAction<Entity, QueryInput, EntityId, ExtraActions>),
        clearError: () =>
          runtime.dispatch({ _tag: 'clearError' } as CrudAction<Entity, QueryInput, EntityId, ExtraActions>),
        idField,
      },
    }),
  }

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  ;(module.tag as unknown as Record<PropertyKey, unknown>)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<CrudState<Entity, QueryInput>, CrudAction<Entity, QueryInput, EntityId, ExtraActions>>,
    base: Logix.ModuleHandle<Logix.AnyModuleShape>,
  ) => {
    const crud = controller.make(runtime)
    return {
      ...base,
      controller: crud.controller,
      services,
    }
  }

  return module.implement({
    initial: {
      items: Array.from(spec.initial ?? []),
      loading: false,
      error: undefined,
      lastQuery: undefined,
      total: undefined,
    } as CrudState<Entity, QueryInput>,
    logics: [install],
  }) as unknown as CrudModule<Id, Entity, QueryInput, EntityId, ExtraActions>
}

export const CRUDModule = Logix.Module.Manage.make({
  kind: 'crud',
  define: defineCrud,
})
