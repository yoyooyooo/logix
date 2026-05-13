import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import type * as Resource from './resource.js'

export type QueryTrigger = 'onMount' | 'onKeyChange' | 'manual'

type FieldSourceTrigger = 'onMount' | 'onKeyChange'

export type QueryConcurrency = 'switch' | 'exhaust'

export type QueryResourceRef = { readonly id: string }

export type QueryResource = QueryResourceRef | Resource.ResourceSpec<any, any, any, any>

export type QueryResourceKey<R> = R extends Resource.ResourceSpec<infer Key, any, any, any> ? Key : unknown

export type QueryResourceData<R> = R extends Resource.ResourceSpec<any, infer Data, any, any> ? Data : unknown

export type QueryResourceError<R> = R extends Resource.ResourceSpec<any, any, infer Err, any> ? Err : unknown

export type QueryKeyState<TParams, TUI> = Readonly<{
  readonly params: TParams
  readonly ui: TUI
}>

export type QueryDepsPath<TParams, TUI> = FieldContracts.StateFieldPath<QueryKeyState<TParams, TUI>>

type DepsArgs<S extends object, Deps extends ReadonlyArray<string>> = {
  readonly [K in keyof Deps]: Deps[K] extends FieldContracts.StateFieldPath<S>
    ? FieldContracts.StateAtPath<S, Deps[K]>
    : any
}

type BivariantCallback<Args extends ReadonlyArray<any>, R> = {
  bivarianceHack(...args: Args): R
}['bivarianceHack']

export interface QueryDeclaration<
  TParams,
  TUI = unknown,
  R extends QueryResource = QueryResource,
  Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
> {
  readonly resource: R
  readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  readonly meta?: FieldContracts.FieldMeta
  readonly tags?: ReadonlyArray<string>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: BivariantCallback<DepsArgs<QueryKeyState<TParams, TUI>, Deps>, QueryResourceKey<R> | undefined>
}

export type QuerySourceConfig<
  TParams,
  TUI = unknown,
  R extends QueryResource = QueryResource,
  Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
> = QueryDeclaration<TParams, TUI, R, Deps>

export type QueryBuilder<TParams, TUI> = {
  readonly source: <
    R extends QueryResource,
    const Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
  >(config: {
    readonly resource: R
    readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
    readonly triggers?: ReadonlyArray<QueryTrigger>
    readonly meta?: FieldContracts.FieldMeta
    readonly tags?: ReadonlyArray<string>
    readonly debounceMs?: number
    readonly concurrency?: QueryConcurrency
    readonly key: (...depsValues: DepsArgs<QueryKeyState<TParams, TUI>, Deps>) => QueryResourceKey<R> | undefined
  }) => QueryDeclaration<TParams, TUI, R, Deps>
}

export const makeQueryDeclaration = <
  TParams,
  TUI = unknown,
  R extends QueryResource = QueryResource,
  const Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
>(config: {
  readonly resource: R
  readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  readonly meta?: FieldContracts.FieldMeta
  readonly tags?: ReadonlyArray<string>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: (...depsValues: DepsArgs<QueryKeyState<TParams, TUI>, Deps>) => QueryResourceKey<R> | undefined
}): QueryDeclaration<TParams, TUI, R, Deps> => config as QueryDeclaration<TParams, TUI, R, Deps>

export interface QueryDeclarationsInput<TParams, TUI> {
  readonly queries: Readonly<Record<string, QueryDeclaration<TParams, TUI, any>>>
}

const toFieldSourceTriggers = (triggers: ReadonlyArray<QueryTrigger>): ReadonlyArray<FieldSourceTrigger> => {
  if (triggers.includes('manual')) {
    if (triggers.length > 1) {
      throw new Error(`[Query.fields] "manual" must be exclusive, but got triggers=[${triggers.join(', ')}].`)
    }
    return []
  }
  return triggers.filter((trigger): trigger is FieldSourceTrigger => trigger === 'onMount' || trigger === 'onKeyChange')
}

export const toFieldDeclarations = <TParams, TUI>(
  input: QueryDeclarationsInput<TParams, TUI>,
): FieldContracts.FieldSpec<any> => {
  const out: Record<string, FieldContracts.FieldEntry<any, any>> = {}

  for (const [name, q] of Object.entries(input.queries)) {
    const triggers = q.triggers ?? (['onMount', 'onKeyChange'] as const)

    out[`queries.${name}`] = FieldContracts.fieldSource({
      deps: q.deps as any,
      resource: q.resource.id,
      triggers: toFieldSourceTriggers(triggers),
      debounceMs: q.debounceMs,
      concurrency: q.concurrency === 'exhaust' ? 'exhaust-trailing' : q.concurrency,
      key: (...depsValues: ReadonlyArray<any>) => (q.key as any)(...depsValues),
      meta: q.meta,
    })
  }

  return out as FieldContracts.FieldSpec<any>
}
