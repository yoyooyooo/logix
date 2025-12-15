import * as Logix from "@logix/core"
import { Effect, Schema } from "effect"
import { autoTrigger } from "./logics/auto-trigger.js"
import { invalidate, type InvalidateRequest } from "./logics/invalidate.js"
import {
  toStateTraitSpec,
  type QuerySourceConfig,
  type QueryResourceData,
  type QueryResourceError,
} from "./traits.js"

export type QueryState<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, QuerySourceConfig<TParams, TUI>> = {},
> = {
  readonly params: TParams
  readonly ui: TUI
} & {
  readonly [K in keyof TQueries]: Logix.Resource.ResourceSnapshot<
    QueryResourceData<TQueries[K]["resource"]>,
    QueryResourceError<TQueries[K]["resource"]>
  >
}

export type QueryAction<TParams, TUI = unknown> =
  | { readonly _tag: "setParams"; readonly payload: TParams }
  | { readonly _tag: "setUi"; readonly payload: TUI }
  | { readonly _tag: "refresh"; readonly payload: string | undefined }
  | { readonly _tag: "invalidate"; readonly payload: InvalidateRequest }

export interface QueryMakeConfig<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, QuerySourceConfig<TParams, TUI>> = {},
> {
  readonly params: Schema.Schema<TParams, any>
  readonly initialParams: TParams
  readonly ui?: TUI
  readonly queries?: TQueries
  readonly traits?: unknown
}

export interface QueryBlueprint<
  Id extends string,
  TParams,
  TUI = unknown,
  TQueries extends Record<string, QuerySourceConfig<TParams, TUI>> = {},
  Sh extends Logix.AnyModuleShape = Logix.AnyModuleShape,
> {
  readonly id: Id
  readonly module: Logix.ModuleInstance<Id, Sh>
  readonly impl: Logix.ModuleImpl<Id, Sh, any>
  readonly initial: (params?: TParams) => QueryState<TParams, TUI, TQueries>
  readonly logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>>
  readonly traits?: unknown
  readonly controller: {
    readonly make: (
      runtime: Logix.ModuleRuntime<
        QueryState<TParams, TUI, TQueries>,
        QueryAction<TParams, TUI>
      >,
    ) => QueryController<TParams, TUI, TQueries>
  }
}

export interface QueryController<
  TParams,
  TUI = unknown,
  TQueries extends Record<string, QuerySourceConfig<TParams, TUI>> = {},
> {
  readonly runtime: Logix.ModuleRuntime<
    QueryState<TParams, TUI, TQueries>,
    QueryAction<TParams, TUI>
  >
  readonly getState: Effect.Effect<QueryState<TParams, TUI, TQueries>>
  readonly dispatch: (action: QueryAction<TParams, TUI>) => Effect.Effect<void>

  readonly setParams: (params: TParams) => Effect.Effect<void>
  readonly setUi: (ui: TUI) => Effect.Effect<void>
  readonly refresh: (target?: string) => Effect.Effect<void>
  readonly invalidate: (request: InvalidateRequest) => Effect.Effect<void>
}

const InvalidateRequestSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("byResource"),
    resourceId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("byParams"),
    resourceId: Schema.String,
    keyHash: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("byTag"),
    tag: Schema.String,
  }),
) as Schema.Schema<InvalidateRequest, any>

export const make = <
  Id extends string,
  TParams,
  TUI = unknown,
  TQueries extends Record<string, QuerySourceConfig<TParams, TUI>> = {},
>(
  id: Id,
  config: QueryMakeConfig<TParams, TUI, TQueries>,
) => {
  const queries = (config.queries ?? {}) as TQueries

  const UiSchema = Schema.Unknown as Schema.Schema<TUI, any>

  const StateSchema = Schema.Struct({
    params: config.params,
    ui: UiSchema,
    ...Object.fromEntries(
      (Object.keys(queries) as Array<keyof TQueries>).map((k) => [
        k,
        Schema.Unknown,
      ]),
    ),
  } as Record<string, Schema.Schema<any, any>>) as unknown as Schema.Schema<
    QueryState<TParams, TUI, TQueries>,
    any
  >

  const Actions = {
    setParams: config.params,
    setUi: UiSchema,
    refresh: Schema.UndefinedOr(Schema.String),
    invalidate: InvalidateRequestSchema,
  } as const

  type Reducers = Logix.ReducersFromMap<typeof StateSchema, typeof Actions>

  const reducers: Reducers = {
    setParams: (state, action) => ({ ...state, params: action.payload }),
    setUi: (state, action) => ({ ...state, ui: action.payload }),
    refresh: (state) => state,
    invalidate: (state) => state,
  } satisfies Reducers

  const queryTraits =
    Object.keys(queries).length > 0 ? toStateTraitSpec({ queries }) : undefined

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
    autoTrigger(module, { queries }),
    invalidate(module, { queries }),
  ] satisfies ReadonlyArray<Logix.ModuleLogic<any, any, any>>

  const initial = (
    params?: TParams,
  ): QueryState<TParams, TUI, TQueries> =>
    ({
      params: params ?? config.initialParams,
      ui: (config.ui ?? ({} as unknown as TUI)) as TUI,
      ...Object.fromEntries(
        (Object.keys(queries) as Array<keyof TQueries>).map((k) => [
          k,
          Logix.Resource.Snapshot.idle(),
        ]),
      ),
    }) as QueryState<TParams, TUI, TQueries>

  const impl = module.implement({
    initial: initial(),
    logics: [...logics],
  })

  const controller = {
    make: (
      runtime: Logix.ModuleRuntime<
        QueryState<TParams, TUI, TQueries>,
        QueryAction<TParams, TUI>
      >,
    ): QueryController<TParams, TUI, TQueries> => ({
      runtime,
      getState: runtime.getState as Effect.Effect<QueryState<TParams, TUI, TQueries>>,
      dispatch: runtime.dispatch,
      setParams: (params: TParams) =>
        runtime.dispatch({ _tag: "setParams", payload: params }),
      setUi: (ui: TUI) =>
        runtime.dispatch({ _tag: "setUi", payload: ui }),
      refresh: (target?: string) =>
        runtime.dispatch({ _tag: "refresh", payload: target }),
      invalidate: (request: InvalidateRequest) =>
        runtime.dispatch({ _tag: "invalidate", payload: request }),
    }),
  }

  return {
    id,
    module,
    impl,
    initial,
    logics,
    traits,
    controller,
  } satisfies QueryBlueprint<
    Id,
    TParams,
    TUI,
    TQueries,
    typeof module.shape
  >
}
