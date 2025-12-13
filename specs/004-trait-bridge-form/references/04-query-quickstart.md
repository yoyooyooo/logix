# Quickstart: Query（业务开发者视角）——搜索 + 详情联动（TanStack Query 内核）

> 本 quickstart 用“搜索 + 详情联动”把 004 的 Query 链路走通一遍：  
> **Query.make（Blueprint）→ Module 集成 → React（订阅投影 + 事件派发）→ 自动查询（QueryObserver）→ state 快照可回放**。
>
> 参考（同一事实源）：
> - Query 业务 API（Blueprint + Controller）：`specs/004-trait-bridge-form/references/07-query-business-api.md`
> - TanStack Query 集成契约（含 QueryObserver 方案）：`specs/004-trait-bridge-form/references/05-query-tanstack-integration.md`
> - Query 数据模型（QuerySnapshot/InvalidateRequest）：`specs/004-trait-bridge-form/references/03-query-data-model.md`

---

## 0. 端到端（业务开发者视角）：Blueprint → Module → React

### 0.1 定义 ResourceSpec（组件外，真实 IO 的唯一入口）

```ts
import { Resource } from "@logix/core"
import { Effect, Schema } from "effect"

type SearchKey = {
  readonly q: string
  readonly filters: ReadonlyArray<string>
  readonly page: number
}

type SearchResult = {
  readonly total: number
  readonly items: ReadonlyArray<{ readonly id: string; readonly title: string }>
}

export const SearchResource = { id: "SearchResource" } as const

export const SearchSpec = Resource.make({
  id: SearchResource.id,
  keySchema: Schema.Struct({
    q: Schema.String,
    filters: Schema.Array(Schema.String),
    page: Schema.Number,
  }),
  load: (key: SearchKey) =>
    Effect.tryPromise({
      try: async () => {
        const params = new URLSearchParams()
        params.set("q", key.q)
        params.set("page", String(key.page))
        for (const f of key.filters) params.append("filters", f)

        const res = await fetch(`/api/search?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as SearchResult
      },
      catch: (e) => e,
    }),
})
```

### 0.2 定义 QueryBlueprint（组件外定义，不在组件里写 useEffect）

```ts
import { Query } from "@logix/query"
import { Schema } from "effect"

const ParamsSchema = Schema.Struct({
  q: Schema.String,
  filters: Schema.Array(Schema.String),
  page: Schema.Number,
  selectedId: Schema.NullOr(Schema.String),
})

export const SearchQuery = Query.make("SearchQuery", {
  params: ParamsSchema,
  initialParams: { q: "", filters: [], page: 1, selectedId: null },

  // 说明：字段命名是“建议形状”，语义以 004 约束为准
  ui: { query: { autoEnabled: true } },

  queries: {
    search: {
      resource: SearchResource,
      // 004 硬语义：必须显式声明 deps（用于触发收敛/图构建/可解释性）
      deps: ["params.q", "params.filters", "params.page", "ui.query.autoEnabled"],
      triggers: ["onMount", "onValueChange"],
      debounceMs: 200,
      concurrency: "switch",
      key: (params, ui) =>
        ui.query.autoEnabled
          ? { q: params.q, filters: params.filters, page: params.page }
          : undefined,
    },

    detail: {
      resource: { id: "DetailResource" } as const,
      deps: ["params.selectedId"],
      triggers: ["onValueChange"],
      concurrency: "switch",
      key: (params) =>
        params.selectedId ? { id: params.selectedId } : undefined,
    },
  },
})
```

心智：

- Blueprint 产出一个“普通模块图纸”：`SearchQuery.module`，可被 `imports` 或 `useLocalModule` 使用；
- Query 的结果快照（QuerySnapshot/ResourceSnapshot）写回 Module state，作为可回放事实源；
- “自动触发/并发/去重/写回门控”等行为由 Query 默认 logics + runtime 约束共同保证，而不是组件内手写。

### 0.3 React（局部模块）：只做投影订阅 + 参数更新

```tsx
import React from "react"
import { useLocalModule, useSelector } from "@logix/react"
import { SearchQuery } from "./searchQuery"

export function SearchPage() {
  const runtime = useLocalModule(SearchQuery.module, {
    initial: SearchQuery.initial(),
    logics: SearchQuery.logics,
  })
  const query = SearchQuery.controller.make(runtime)

  const params = useSelector(runtime, (s: any) => s.params)
  const search = useSelector(runtime, (s: any) => s.search)
  const detail = useSelector(runtime, (s: any) => s.detail)

  return (
    <div>
      <input
        value={params.q}
        onChange={(e) => query.setParams({ ...params, q: e.target.value })}
      />

      <button onClick={() => query.refresh()}>刷新</button>

      {search.status === "loading" ? <div>Loading...</div> : null}
      {search.status === "error" ? <div>加载失败</div> : null}
      {search.status === "success" ? (
        <ul>
          {search.data.items.map((it: any) => (
            <li key={it.id}>
              <button onClick={() => query.setParams({ ...params, selectedId: it.id })}>
                {it.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {detail.status === "loading" ? <div>Detail Loading...</div> : null}
      {detail.status === "success" ? <pre>{JSON.stringify(detail.data, null, 2)}</pre> : null}
    </div>
  )
}
```

### 0.4 AppRuntime（全局模块）：像普通模块一样 imports（可选）

```ts
const RootImpl = Root.implement({
  initial: { /* ... */ },
  imports: [SearchQuery.impl],
})
```

### 0.5 Runtime 注入（Layer）：注册 ResourceSpec + 提供 QueryClient

```ts
import { Layer } from "effect"
import { Resource } from "@logix/core"
import { QueryClient } from "@tanstack/query-core"
import { Query } from "@logix/query"

export const QueryRuntimeLayer = Layer.mergeAll(
  Resource.layer([SearchSpec /*, DetailSpec */]),
  Layer.succeed(Query.QueryClientTag, new QueryClient()),
)
```

约束：

- ResourceSpec 必须在 runtime scope 内注册（否则 `resourceId → load` 无法解析）；
- 同一 runtime scope 内一个 QueryClient（缓存与 ResourceRegistry 对齐）；
- 跨 runtime 允许不同 QueryClient（缓存隔离），行为仍按 keyHash 门控可回放。

---

## 1. 关键行为（为什么“像 TanStack”，但仍可回放）

### 1.1 自动查询：用 `QueryObserver` 驱动（方案 A）

本 spec 的选择是：**每条 `StateTrait.source` 规则在其 runtime scope 内各自维护一个 `QueryObserver`**：

- state 变化导致 `enabled/keyHash` 变化时，执行 `observer.setOptions({ enabled, queryKey, queryFn, ... })`；
- TanStack Query 决定是否 fetch（enabled + key 变化），并负责缓存与 in-flight 去重；
- `observer.subscribe(result => ...)` 把结果转成 QuerySnapshot 写回 state；
- 写回前仍做 **keyHash 门控**（避免“旧订阅回调”覆盖新 key 的快照），保证回放语义一致。

（详见：`specs/004-trait-bridge-form/references/05-query-tanstack-integration.md` 的 4.1）

### 1.2 并发语义：`switch` / `exhaust`（体验语义，不改变正确性）

- `switch`：只认最新；尽量取消旧请求（若 queryFn 支持 AbortSignal），但正确性不依赖取消；
- `exhaust`：in-flight 期间合并触发；结束后补一次最新 key 的刷新；
- 无论哪种并发策略，**写回都必须按 keyHash 丢弃 stale**。

### 1.3 触发语义：`onMount` / `onValueChange` / `manual`

Query 触发不再散落在组件 `useEffect`：

- `onMount`：用于初始同步（已有参数时）；
- `onValueChange`：参数变化触发（可 debounce）；
- `manual`：仅手动触发（通过 Controller.refresh / invalidate）。

---

## 2. 深入：Query.make 如何回落到 StateTrait/Resource（给实现者）

实现上，`@logix/query` 的 Blueprint/Controller/默认 logics 必须能被“降解”为同一条 kernel 主线：

- Query 的“依赖声明”最终回落到 `StateTrait.source`（resourceId + key）；
- Query 的“结果视图”最终回落到 `computed`（从快照派生 loading/error/data）；
- Query 的“手动刷新/失效”最终回落到 TraitLifecycle 的 scoped execute（并落在 EffectOp timeline 上可解释）。
