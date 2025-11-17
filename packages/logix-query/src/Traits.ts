import * as Logix from '@logix/core'

export type QueryTrigger = 'onMount' | 'onValueChange' | 'manual'

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

export interface QuerySourceConfig<TParams, TUI = unknown, R extends QueryResource = QueryResource> {
  readonly resource: R
  readonly deps: ReadonlyArray<QueryDepsPath<TParams, TUI>>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  /**
   * Optional static tags for invalidate(byTag), used to narrow byTag from "refresh all" to a matched subset.
   * - Must be serializable (recommend: string constants only)
   * - If omitted, byTag conservatively falls back to refreshing everything
   */
  readonly tags?: ReadonlyArray<string>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: (state: QueryKeyState<TParams, TUI>) => QueryResourceKey<R> | undefined
}

export interface QueryTraitsInput<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI, any>>>
}

const isDevEnv = (): boolean => Logix.Env.isDevEnv()

const makeLazyUiProxy = (state: any): any =>
  new Proxy(
    {},
    {
      get: (_target, prop) => (state as any)?.ui?.[prop as any],
      has: (_target, prop) => prop in ((state as any)?.ui ?? {}),
      ownKeys: () => Reflect.ownKeys((state as any)?.ui ?? {}),
      getOwnPropertyDescriptor: (_target, prop) => Object.getOwnPropertyDescriptor((state as any)?.ui ?? {}, prop),
    },
  )

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
    const triggers = q.triggers ?? (['onMount', 'onValueChange'] as const)

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
      key: (state: any) =>
        q.key({
          params: state.params,
          // Avoid deps-trace false positives caused by "reading ui only to pass args":
          // - dev/test: use a lazy proxy; only record paths when key actually reads ui.
          // - production: pass state.ui directly to avoid extra Proxy overhead.
          ui: isDevEnv() ? makeLazyUiProxy(state) : state.ui,
        }),
    })
  }

  return out as Logix.StateTrait.StateTraitSpec<any>
}
