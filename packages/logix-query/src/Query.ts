import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'
import { autoTrigger } from './internal/logics/auto-trigger.js'
import { invalidate } from './internal/logics/invalidate.js'
import type { InvalidateRequest } from './Engine.js'
import { toStateTraitSpec, type QueryBuilder, type QuerySourceConfig, type QueryResourceData, type QueryResourceError } from './Traits.js'

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
    readonly [K in keyof TQueries]: Logix.Resource.ResourceSnapshot<
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
  readonly setParams: Schema.Schema<TParams, any>
  readonly setUi: Schema.Schema<TUI, any>
  readonly refresh: Schema.Schema<QueryName<TQueries> | undefined, any>
  readonly invalidate: Schema.Schema<InvalidateRequest, any>
}

export type QueryShape<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.Shape<Schema.Schema<QueryState<TParams, TUI, TQueries>, any>, QueryActions<TParams, TUI, TQueries>>

export type QueryAction<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.ActionOf<QueryShape<TParams, TUI, TQueries>>

export interface QueryMakeConfig<
  TParams,
  TUI = unknown,
  TQueries = {},
> {
  readonly params: Schema.Schema<TParams, any>
  readonly initialParams: TParams
  readonly ui?: TUI
  readonly queries?: (q: QueryBuilder<TParams, TUI>) => TQueries & ForbidQueryNames
  readonly traits?: unknown
}

export interface QueryController<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> {
  readonly runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, TQueries>, QueryAction<TParams, TUI, TQueries>>
  readonly getState: Effect.Effect<QueryState<TParams, TUI, TQueries>>
  readonly dispatch: (action: QueryAction<TParams, TUI, TQueries>) => Effect.Effect<void>

  readonly controller: {
    readonly setParams: (params: TParams) => Effect.Effect<void>
    readonly setUi: (ui: TUI) => Effect.Effect<void>
    readonly refresh: (target?: QueryName<TQueries>) => Effect.Effect<void>
    readonly invalidate: (request: InvalidateRequest) => Effect.Effect<void>
  }
}

export type QueryModuleController<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly make: (
    runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, TQueries>, QueryAction<TParams, TUI, TQueries>>,
  ) => QueryController<TParams, TUI, TQueries>
}

export type QueryHandleExt<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly controller: QueryController<TParams, TUI, TQueries>['controller']
}

export type QueryModule<
  Id extends string,
  TParams,
  TUI = unknown,
  TQueries extends Record<string, AnyQuerySourceConfig<TParams, TUI>> = {},
> = Logix.Module.Module<Id, QueryShape<TParams, TUI, TQueries>, QueryHandleExt<TParams, TUI, TQueries>, any> & {
  readonly controller: QueryModuleController<TParams, TUI, TQueries>
}

const InvalidateRequestSchema = Schema.Union(
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
) as Schema.Schema<InvalidateRequest, any>

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
  const queryBuilder: QueryBuilder<TParams, TUI> = {
    source: (q: any) => q,
  }

	  const queries = ((): Queries => {
	    const raw = config.queries
	    if (!raw) return {} as Queries
	    return raw(queryBuilder) as Queries
	  })()

  const queriesForTraits: Readonly<Record<string, AnyQuerySourceConfig<TParams, TUI>>> = queries
  for (const name of Object.keys(queries)) {
    assertQueryName(name)
  }

	  const RefreshTargetSchema = (() => {
	    const names = Object.keys(queries) as Array<QueryName<Queries>>
	    if (names.length === 0) return Schema.Never as unknown as Schema.Schema<QueryName<Queries>, any>
	    if (names.length === 1) {
	      return Schema.Literal(names[0] as any) as unknown as Schema.Schema<QueryName<Queries>, any>
	    }
    const asUnionMembers = <A>(items: ReadonlyArray<A>): readonly [A, A, ...Array<A>] => {
      if (items.length < 2) {
        throw new Error(`[Query.make] internal error: expected at least 2 query names for union`)
      }
      return items as unknown as readonly [A, A, ...Array<A>]
    }

	    const members = names.map((n) => Schema.Literal(n as any))
	    return Schema.Union(...asUnionMembers(members)) as unknown as Schema.Schema<QueryName<Queries>, any>
	  })()

  const UiSchema = Schema.Unknown as Schema.Schema<TUI, any>

	  const QueriesSchema = Schema.Struct(
	    Object.fromEntries((Object.keys(queries) as Array<keyof Queries>).map((k) => [k, Schema.Unknown])) as Record<
	      string,
	      Schema.Schema<any, any>
	    >,
	  )

  const StateSchema = Schema.Struct({
    params: config.params,
    ui: UiSchema,
    queries: QueriesSchema,
  }) as unknown as Schema.Schema<QueryState<TParams, TUI, Queries>, any>

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

  const queryTraits =
    Object.keys(queriesForTraits).length > 0 ? toStateTraitSpec<TParams, TUI>({ queries: queriesForTraits }) : undefined

  const traits =
    queryTraits || config.traits
      ? ({
          ...(queryTraits as any),
          ...(config.traits as any),
        } as any)
      : undefined

  const module = Logix.Module.make(id, {
    state: StateSchema,
    actions: Actions,
    reducers,
    traits,
  })

  const logics = [
    autoTrigger<any, TParams, TUI>(module.tag as any, { queries: queriesForTraits }),
    invalidate<any, TParams, TUI>(module.tag as any, { queries: queriesForTraits }),
  ] satisfies ReadonlyArray<Logix.ModuleLogic<any, any, any>>

  const initial = (params?: TParams): QueryState<TParams, TUI, Queries> =>
    ({
      params: params ?? config.initialParams,
      ui: (config.ui ?? ({} as unknown as TUI)) as TUI,
      queries: Object.fromEntries(
        (Object.keys(queries) as Array<keyof Queries>).map((k) => [k, Logix.Resource.Snapshot.idle()]),
      ),
    }) as QueryState<TParams, TUI, Queries>

	  const controller: QueryModuleController<TParams, TUI, Queries> = {
	    make: (
	      runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, Queries>, QueryAction<TParams, TUI, Queries>>,
	    ): QueryController<TParams, TUI, Queries> => {
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
	        controller: {
	          setParams: (params: TParams) => dispatch(actions.setParams(params)),
	          setUi: (ui: TUI) => dispatch(actions.setUi(ui)),
	          refresh: (target?: QueryName<Queries>) => dispatch(actions.refresh(target)),
		          invalidate: (request: InvalidateRequest) => dispatch(actions.invalidate(request)),
		        },
		      } as QueryController<TParams, TUI, Queries>
		    },
		  }

  ;(module as any).controller = controller

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  ;(module.tag as any)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<QueryState<TParams, TUI, Queries>, QueryAction<TParams, TUI, Queries>>,
    base: Logix.ModuleHandle<any>,
  ) => {
    const c = controller.make(runtime)
    return {
      ...base,
      controller: c.controller,
    }
  }

  return module.implement({
    initial: initial(),
    logics: [...logics],
  }) as unknown as QueryModule<Id, TParams, TUI, Queries>
}
