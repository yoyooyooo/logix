import * as Logix from "@logix/core"

export type QueryTrigger = "onMount" | "onValueChange" | "manual"

export type QueryConcurrency = "switch" | "exhaust"

export type QueryResourceRef = { readonly id: string }

export type QueryResource = QueryResourceRef | Logix.Resource.ResourceSpec<any, any, any, any>

export type QueryResourceKey<R> = R extends Logix.Resource.ResourceSpec<infer Key, any, any, any>
  ? Key
  : unknown

export type QueryResourceData<R> = R extends Logix.Resource.ResourceSpec<any, infer Data, any, any>
  ? Data
  : unknown

export type QueryResourceError<R> = R extends Logix.Resource.ResourceSpec<any, any, infer Err, any>
  ? Err
  : unknown

export interface QuerySourceConfig<TParams, TUI = unknown, R extends QueryResource = QueryResource> {
  readonly resource: R
  readonly deps: ReadonlyArray<string>
  readonly triggers?: ReadonlyArray<QueryTrigger>
  readonly debounceMs?: number
  readonly concurrency?: QueryConcurrency
  readonly key: (params: TParams, ui: TUI) => QueryResourceKey<R> | undefined
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
      getOwnPropertyDescriptor: (_target, prop) =>
        Object.getOwnPropertyDescriptor((state as any)?.ui ?? {}, prop),
    },
  )

/**
 * 降解规则（Query → StateTrait）：
 * - 每条 Query 规则对应一个 `StateTrait.source`，写回目标字段为 queryName（同构到模块 state 上）。
 * - keySelector 从 (params, ui) 计算 key；keyHash/竞态门控由 kernel source 运行时保证。
 *
 * 注意：
 * - deps 使用模块根路径表达（如 "params.q" / "ui.query.autoEnabled"），保持与 007/004 的约束一致；
 * - concurrency 的 "exhaust" 在 kernel 中以 "exhaust-trailing" 表达。
 */
export const toStateTraitSpec = <TParams, TUI>(
  input: QueryTraitsInput<TParams, TUI>,
): Logix.StateTrait.StateTraitSpec<any> => {
  const out: Record<string, unknown> = {}

  for (const [name, q] of Object.entries(input.queries)) {
    const triggers = q.triggers ?? (["onMount", "onValueChange"] as const)

    // manual 必须独占：避免语义歧义（属于配置错误）。
    if (triggers.includes("manual") && triggers.length > 1) {
      throw new Error(
        `[Query.traits] "manual" must be exclusive, but got triggers=[${triggers.join(", ")}] for query "${name}".`,
      )
    }

    out[name] = Logix.StateTrait.source({
      // deps：用于图构建/诊断/后续 reverse-closure；Query 自身也会复用 deps 做触发收敛。
      deps: q.deps as any,
      resource: q.resource.id,
      triggers,
      debounceMs: q.debounceMs,
      concurrency:
        q.concurrency === "exhaust" ? "exhaust-trailing" : q.concurrency,
      key: (state: any) =>
        q.key(
          state.params,
          // 避免“仅为了传参而读取 ui”导致 deps-trace 误报：
          // - dev/test：使用 lazy proxy，仅在 key 真正读取 ui 时才会记录读取路径；
          // - production：直接传 state.ui，避免额外 Proxy 开销。
          isDevEnv() ? makeLazyUiProxy(state) : state.ui,
        ),
    })
  }

  return out as Logix.StateTrait.StateTraitSpec<any>
}
