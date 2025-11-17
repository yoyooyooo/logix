import * as Logix from '@logix/core'

export type QueryTrigger = 'onMount' | 'onKeyChange' | 'manual'

export type QueryConcurrency = 'switch' | 'exhaust'

export type QueryResourceRef = { readonly id: string }

export type QueryResource = QueryResourceRef | Logix.Resource.ResourceSpec<any, any, any, any>

export type QueryResourceKey<R> = R extends Logix.Resource.ResourceSpec<infer Key, any, any, any> ? Key : unknown

export type QueryResourceData<R> = R extends Logix.Resource.ResourceSpec<any, infer Data, any, any> ? Data : unknown

export type QueryResourceError<R> = R extends Logix.Resource.ResourceSpec<any, any, infer Err, any> ? Err : unknown

export type QueryKeyState<TParams, TUI> = Readonly<{
  readonly params: TParams
  readonly ui: TUI
}>

export type QueryDepsPath<TParams, TUI> = Logix.StateTrait.StateFieldPath<QueryKeyState<TParams, TUI>>

type DepsArgs<S extends object, Deps extends ReadonlyArray<string>> = {
  readonly [K in keyof Deps]: Deps[K] extends Logix.StateTrait.StateFieldPath<S>
    ? Logix.StateTrait.StateAtPath<S, Deps[K]>
    : any
}

type BivariantCallback<Args extends ReadonlyArray<any>, R> = {
  bivarianceHack(...args: Args): R
}['bivarianceHack']

export interface QuerySourceConfig<
  TParams,
  TUI = unknown,
  R extends QueryResource = QueryResource,
  Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
> {
  readonly resource: R
  readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  /**
   * Optional static tags for invalidate(byTag), used to narrow byTag from "refresh all" to a matched subset.
   * - Must be serializable (recommend: string constants only)
   * - If omitted, byTag conservatively falls back to refreshing everything
   */
  readonly tags?: ReadonlyArray<string>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: BivariantCallback<DepsArgs<QueryKeyState<TParams, TUI>, Deps>, QueryResourceKey<R> | undefined>
}

export type QueryBuilder<TParams, TUI> = {
  readonly source: <
    R extends QueryResource,
    const Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
  >(config: {
    readonly resource: R
    readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
    readonly triggers?: ReadonlyArray<QueryTrigger>
    readonly tags?: ReadonlyArray<string>
    readonly debounceMs?: number
    readonly concurrency?: QueryConcurrency
    readonly key: (...depsValues: DepsArgs<QueryKeyState<TParams, TUI>, Deps>) => QueryResourceKey<R> | undefined
  }) => QuerySourceConfig<TParams, TUI, R, Deps>
}

/**
 * Query.source:
 * - Strongly typed helper to preserve `deps` as a tuple and infer `key(...depsValues)` argument types from it.
 * - Recommended usage inside `Query.make(..., { queries: { name: Query.source({ ... }) } })`.
 */
export const source = <
  TParams,
  TUI = unknown,
  R extends QueryResource = QueryResource,
  const Deps extends ReadonlyArray<string> = ReadonlyArray<QueryDepsPath<TParams, TUI>>,
>(config: {
  readonly resource: R
  readonly deps: Deps & ReadonlyArray<QueryDepsPath<TParams, TUI>>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  readonly tags?: ReadonlyArray<string>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: (...depsValues: DepsArgs<QueryKeyState<TParams, TUI>, Deps>) => QueryResourceKey<R> | undefined
}): QuerySourceConfig<TParams, TUI, R, Deps> => config as QuerySourceConfig<TParams, TUI, R, Deps>

export interface QueryTraitsInput<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI, any>>>
}

/**
 * Lowering rules (Query -> StateTrait):
 * - Each Query rule maps to a `StateTrait.source`, writing back to `queries.<name>` (isomorphic to module state).
 * - keySelector computes key from `{ params; ui }`; keyHash/race gating is guaranteed by the kernel source runtime.
 *
 * Notes:
 * - deps uses module-root paths (e.g. "params.q" / "ui.query.autoEnabled"), aligned with the constraints in 007/004.
 * - concurrency "exhaust" is represented as "exhaust-trailing" in the kernel.
 */
export const toStateTraitSpec = <TParams, TUI>(
  input: QueryTraitsInput<TParams, TUI>,
): Logix.StateTrait.StateTraitSpec<any> => {
  const out: Record<string, Logix.StateTrait.StateTraitEntry<any, any>> = {}

  for (const [name, q] of Object.entries(input.queries)) {
    const triggers = q.triggers ?? (['onMount', 'onKeyChange'] as const)

    // "manual" must be exclusive to avoid ambiguous semantics (configuration error).
    if (triggers.includes('manual') && triggers.length > 1) {
      throw new Error(
        `[Query.traits] "manual" must be exclusive, but got triggers=[${triggers.join(', ')}] for query "${name}".`,
      )
    }

    out[`queries.${name}`] = Logix.StateTrait.source({
      // deps: used for graph building/diagnostics/future reverse-closure; Query also reuses deps to converge triggers.
      deps: q.deps as any,
      resource: q.resource.id,
      triggers,
      debounceMs: q.debounceMs,
      concurrency: q.concurrency === 'exhaust' ? 'exhaust-trailing' : q.concurrency,
      key: (...depsValues: ReadonlyArray<any>) => (q.key as any)(...depsValues),
    })
  }

  return out as Logix.StateTrait.StateTraitSpec<any>
}
