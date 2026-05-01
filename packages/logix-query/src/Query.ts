import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'
import * as Resource from './internal/resource.js'
import { autoTrigger } from './internal/logics/auto-trigger.js'
import { invalidate } from './internal/logics/invalidate.js'
import type { InvalidateRequest } from './Engine.js'
import {
  makeQueryDeclaration,
  toFieldDeclarations,
  type QueryBuilder,
  type QueryResourceData,
  type QueryResourceError,
  type QuerySourceConfig,
} from './internal/query-declarations.js'

type AnyQuerySourceConfig<TParams, TUI> = QuerySourceConfig<TParams, TUI, any, any>

type EnsureQueries<TParams, TUI, TQueries> = TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>>
  ? {}
  : {
      readonly __queries_must_be_QuerySourceConfig__: never
    }

type QueriesOf<TParams, TUI, TQueries> = TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> ? TQueries : never

export type QueryState<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly params: TParams
  readonly ui: TUI
  readonly queries: {
    readonly [K in keyof TQueries]: Resource.ResourceSnapshot<
      QueryResourceData<TQueries[K]['resource']>,
      QueryResourceError<TQueries[K]['resource']>
    >
  }
}

export type QueryName<TQueries extends Record<string, any>> = Extract<keyof TQueries, string>

type ForbiddenQueryName = 'params' | 'ui' | 'queries'
type ForbidQueryNames = {
  readonly [K in ForbiddenQueryName]?: never
}

export type QueryActions<TParams, TUI = unknown, TQueries extends Record<string, any> = {}> = {
  readonly setParams: Schema.Schema<TParams>
  readonly setUi: Schema.Schema<TUI>
  readonly refresh: Schema.Schema<QueryName<TQueries> | undefined>
  readonly invalidate: Schema.Schema<InvalidateRequest>
}

export type QueryShape<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.Module.Shape<Schema.Schema<QueryState<TParams, TUI, TQueries>>, QueryActions<TParams, TUI, TQueries>>

export type QueryAction<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.Module.ActionOf<QueryShape<TParams, TUI, TQueries>>

export interface QueryMakeConfig<
  TParams,
  TUI = unknown,
  TQueries = {},
> {
  readonly params: Schema.Schema<TParams>
  readonly initialParams: TParams
  readonly ui?: TUI
  readonly queries?: (q: QueryBuilder<TParams, TUI>) => TQueries & ForbidQueryNames
}

export interface QueryCommandsHandle<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> {
  readonly runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, TQueries>, QueryAction<TParams, TUI, TQueries>>
  readonly getState: Effect.Effect<QueryState<TParams, TUI, TQueries>>
  readonly dispatch: (action: QueryAction<TParams, TUI, TQueries>) => Effect.Effect<void>
  readonly setParams: (params: TParams) => Effect.Effect<void>
  readonly setUi: (ui: TUI) => Effect.Effect<void>
  readonly refresh: (target?: QueryName<TQueries>) => Effect.Effect<void>
  readonly invalidate: (request: InvalidateRequest) => Effect.Effect<void>
}

export type QueryCommandsFactory<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly make: (
    runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, TQueries>, QueryAction<TParams, TUI, TQueries>>,
  ) => QueryCommandsHandle<TParams, TUI, TQueries>
}

export type QueryHandleExt<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly commands: Pick<QueryCommandsHandle<TParams, TUI, TQueries>, 'setParams' | 'setUi' | 'refresh' | 'invalidate'>
}

export type QueryModule<
  Id extends string,
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.Program.Program<Id, QueryShape<TParams, TUI, TQueries>, QueryHandleExt<TParams, TUI, TQueries>, any> & {
  readonly commands: QueryCommandsFactory<TParams, TUI, TQueries>
}

const InvalidateRequestSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('byResource'),
    resourceId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal('byParams'),
    resourceId: Schema.String,
    keyHash: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal('byTag'),
    tag: Schema.String,
  }),
]) as Schema.Schema<InvalidateRequest>

const assertQueryName = (name: string): void => {
  if (!name) {
    throw new Error(`[Query.make] query name must be non-empty`)
  }
  if (name.includes('.')) {
    throw new Error(`[Query.make] query name must not include "."; got "${name}"`)
  }
  if (name === 'params' || name === 'ui' || name === 'queries') {
    throw new Error(`[Query.make] query name "${name}" is reserved`)
  }
}


const buildRefreshTargetSchema = <TQueries extends Record<string, AnyQuerySourceConfig<any, any>>>(
  names: ReadonlyArray<QueryName<TQueries>>,
): Schema.Schema<QueryName<TQueries>> => {
  if (names.length === 0) {
    return Schema.Never as unknown as Schema.Schema<QueryName<TQueries>>
  }

  return Schema.Literals(names as [QueryName<TQueries>, ...Array<QueryName<TQueries>>]) as unknown as Schema.Schema<QueryName<TQueries>>
}

const buildQueriesSchema = <TQueries extends Record<string, AnyQuerySourceConfig<any, any>>>(queries: TQueries) =>
  Schema.Struct(
    Object.fromEntries((Object.keys(queries) as Array<keyof TQueries>).map((key) => [key, Schema.Unknown])) as Record<
      string,
      Schema.Schema<any>
    >,
  )

export const make = <
  Id extends string,
  TParams,
  TUI = unknown,
  const TQueries = {},
>(
  id: Id,
  config: QueryMakeConfig<TParams, TUI, TQueries> & EnsureQueries<TParams, TUI, TQueries>,
): QueryModule<Id, TParams, TUI, QueriesOf<TParams, TUI, TQueries>> => {
  type Queries = QueriesOf<TParams, TUI, TQueries>
  const legacyFieldsKey = ['tr', 'aits'].join('')

  if (Object.prototype.hasOwnProperty.call(config as object, legacyFieldsKey)) {
    throw new Error('[Query.make] direct legacy field fragments are removed; extend Query DSL instead of passing raw field fragments')
  }

  const queryBuilder: QueryBuilder<TParams, TUI> = {
    source: (q: any) => makeQueryDeclaration(q),
  }

  const queries = ((): Queries => {
    const raw = config.queries
    if (!raw) return {} as Queries
    return raw(queryBuilder) as Queries
  })()

  const queryDeclarations: Readonly<Record<string, AnyQuerySourceConfig<TParams, TUI>>> = queries
  const queryNames = Object.keys(queries) as Array<QueryName<Queries>>
  for (const name of queryNames) {
    assertQueryName(name)
  }

  const RefreshTargetSchema = buildRefreshTargetSchema<Queries>(queryNames)

  const UiSchema = Schema.Unknown as Schema.Schema<TUI>

  const QueriesSchema = buildQueriesSchema<Queries>(queries)

  const StateSchema = Schema.Struct({
    params: config.params,
    ui: UiSchema,
    queries: QueriesSchema,
  }) as unknown as Schema.Schema<QueryState<TParams, TUI, Queries>>

  const Actions = {
    setParams: config.params,
    setUi: UiSchema,
    refresh: Schema.UndefinedOr(RefreshTargetSchema),
    invalidate: InvalidateRequestSchema,
  } satisfies QueryActions<TParams, TUI, Queries>

  type Reducers = Logix.ReducersFromMap<typeof StateSchema, typeof Actions>

  const reducers: Reducers = {
    setParams: (state, action, sink) => {
      sink?.('params')
      return { ...state, params: action.payload ?? state.params }
    },
    setUi: (state, action, sink) => {
      sink?.('ui')
      return { ...state, ui: action.payload ?? state.ui }
    },
    refresh: (state) => state,
    invalidate: (state) => state,
  } satisfies Reducers

  const queryFields =
    Object.keys(queryDeclarations).length > 0
      ? toFieldDeclarations<TParams, TUI>({ queries: queryDeclarations })
      : undefined

  const module = Logix.Module.make(id, {
    state: StateSchema,
    actions: Actions,
    reducers,
  })

  const queryFieldsLogic =
    queryFields === undefined
      ? undefined
      : module.logic('__query_internal:fields', ($) => {
          $.fields(queryFields as any)
          return Effect.void
        })

  const logics = [
    ...(queryFieldsLogic ? [queryFieldsLogic] : []),
    autoTrigger<any, TParams, TUI>(module.tag as any, { queries: queryDeclarations }),
    invalidate<any, TParams, TUI>(module.tag as any, { queries: queryDeclarations }),
  ] satisfies ReadonlyArray<Logix.ModuleLogic<any, any, any>>

  const initial = (params?: TParams): QueryState<TParams, TUI, Queries> =>
    ({
      params: params ?? config.initialParams,
      ui: (config.ui ?? ({} as unknown as TUI)) as TUI,
      queries: Object.fromEntries((Object.keys(queries) as Array<keyof Queries>).map((key) => [key, Resource.Snapshot.idle()])),
    }) as QueryState<TParams, TUI, Queries>

  const commands: QueryCommandsFactory<TParams, TUI, Queries> = {
    make: (
      runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, Queries>, QueryAction<TParams, TUI, Queries>>,
    ): QueryCommandsHandle<TParams, TUI, Queries> => {
      const dispatch = runtime.dispatch
      const actions = module.actions as unknown as {
        readonly setParams: (params: TParams) => QueryAction<TParams, TUI, Queries>
        readonly setUi: (ui: TUI) => QueryAction<TParams, TUI, Queries>
        readonly refresh: (target: QueryName<Queries> | undefined) => QueryAction<TParams, TUI, Queries>
        readonly invalidate: (request: InvalidateRequest) => QueryAction<TParams, TUI, Queries>
      }

      return {
        runtime,
        getState: runtime.getState as Effect.Effect<QueryState<TParams, TUI, Queries>>,
        dispatch,
        setParams: (params: TParams) => dispatch(actions.setParams(params)),
        setUi: (ui: TUI) => dispatch(actions.setUi(ui)),
        refresh: (target?: QueryName<Queries>) => dispatch(actions.refresh(target)),
        invalidate: (request: InvalidateRequest) => dispatch(actions.invalidate(request)),
      } as QueryCommandsHandle<TParams, TUI, Queries>
    },
  }

  ;(module as any).commands = commands

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  ;(module.tag as any)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, Queries>, QueryAction<TParams, TUI, Queries>>,
    base: Logix.ModuleHandle<any>,
  ) => {
    const c = commands.make(runtime)
    return {
      ...base,
      commands: {
        setParams: c.setParams,
        setUi: c.setUi,
        refresh: c.refresh,
        invalidate: c.invalidate,
      },
    }
  }

  return Logix.Program.make<Id, QueryShape<TParams, TUI, Queries>, {}, any>(module, {
    initial: initial(),
    logics: [...logics],
  }) as unknown as QueryModule<Id, TParams, TUI, Queries>
}
