# Quickstart: 007 Trait（内核）→（可选）StateTrait（支点）→ Form/Query（领域包）→ UI

> 本 quickstart 以 004 Quick Start 的主体方案为蓝本：
>
> - Form/Query 都以 Blueprint/Controller 为业务默认入口；
> - UI 只做订阅投影 + 事件派发；
> - 所有事实源（errors/resources/ui）都写回 `state`/`state.ui` 并可回放。
>
> 说明：示例代码以“目标 API 形状”为准；最终以 `@logixjs/core` / `@logixjs/form` / `@logixjs/query` 实现为准。

## 0. Form：从 Blueprint 到 React（最小可用）

### 0.1 Blueprint（组件外定义）

```ts
import * as Form from "@logixjs/form"
import { Schema } from "effect"

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    email: Schema.String,
  }),
})

export const EmailForm = Form.make("EmailForm", {
  values: ValuesSchema,
  initialValues: { profile: { email: "" } },
  rules: {
    "profile.email": Form.Rule.make<string>({
      deps: [],
      validateOn: ["onBlur"],
      validate: {
        required: (email) => (email ? undefined : "必填"),
        format: (email) => (/^\\S+@\\S+$/.test(email) ? undefined : "邮箱格式不正确"),
      },
    }),
  },
})
```

要点：

- 业务默认只使用 `@logixjs/form` 的领域入口（`Form.make({ rules, fieldArrays, derived })` + `Form.Rule/Form.Error/Form.Trait`），无需直接接触 StateTrait/Trait；
- 所有高层声明会 **完全降解** 到统一的最小中间表示（Trait IR），并在降解后仍执行一致的冲突检测与合并；
- touched/dirty 等交互态写入 `state.ui`，不在组件内自建事实源；`check` 会回落为“写错误树”的派生语义糖。

### 0.2 React（薄投影 + 事件适配）

```tsx
import React from "react"
import { useForm, useField } from "@logixjs/form/react"
import { EmailForm } from "./emailForm"

export function EmailFormView() {
  const form = useForm(EmailForm)
  const email = useField(form, "profile.email")

  return (
    <div>
      <input
        value={email.value}
        onChange={(e) => email.onChange(e.target.value)}
        onBlur={email.onBlur}
      />
      {email.error ? <div>{email.error}</div> : null}
    </div>
  )
}
```

约束：

- 自动校验/自动触发应由 Blueprint 默认 logics + runtime 约束提供；UI 层不应通过 `useEffect` 再造一套触发逻辑。
- FormBlueprint 是“特殊的 Module”：你可以像普通模块一样通过 `imports` 组合它，从根上避免“Form 与 Store 何时同步”的双事实源问题。
- 默认桥接（update `state.ui` + scoped validate/cleanup）由 `TraitLifecycle.install`（kernel 归属）承载，Form 只做领域语义与 DX 封装。

### 0.3 AppRuntime 组合（imports，同源）

```ts
const RootImpl = Root.implement({
  initial: { /* ... */ },
  imports: [EmailForm.impl],
})
```

> `EmailForm.impl` 是 `EmailForm.module.implement({ initial: EmailForm.initial(), logics: EmailForm.logics })` 的等价默认实现；Form 不单独拥有 Runtime。

## 1. Query：搜索 + 详情联动（对照组）

### 1.1 定义 ResourceSpec（真实 IO 的唯一入口）

```ts
import { Resource } from "@logixjs/core"
import { Effect, Schema } from "effect"

export const SearchResource = { id: "SearchResource" } as const

export const SearchSpec = Resource.make({
  id: SearchResource.id,
  keySchema: Schema.Struct({
    q: Schema.String,
    page: Schema.Number,
  }),
  load: (key: { readonly q: string; readonly page: number }) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`/api/search?q=${key.q}&page=${key.page}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      },
      catch: (e) => e,
    }),
})
```

### 1.2 QueryBlueprint（组件外定义）

```ts
import { Query } from "@logixjs/query"
import { Schema } from "effect"

const ParamsSchema = Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  selectedId: Schema.NullOr(Schema.String),
})

export const SearchQuery = Query.make("SearchQuery", {
  params: ParamsSchema,
  initialParams: { q: "", page: 1, selectedId: null },

  ui: { query: { autoEnabled: true } },

  queries: {
    search: {
      resource: SearchResource,
      deps: ["params.q", "params.page", "ui.query.autoEnabled"],
      autoRefresh: { onMount: true, onDepsChange: true, debounceMs: 200 },
      concurrency: "switch",
      key: (state) =>
        (state.ui.query.autoEnabled
          ? { q: state.params.q, page: state.params.page }
          : undefined),
    },
  },
})
```

### 1.3 React（只做投影与参数更新）

```tsx
import React from "react"
import { useLocalModule, useSelector } from "@logixjs/react"
import { SearchQuery } from "./searchQuery"

export function SearchPage() {
  const runtime = useLocalModule(SearchQuery.module, {
    initial: SearchQuery.initial(),
    logics: SearchQuery.logics,
  })
  const query = SearchQuery.controller.make(runtime)

  const params = useSelector(runtime, (s) => s.params)
  const search = useSelector(runtime, (s) => s.queries.search)

  return (
    <div>
      <input
        value={params.q}
        onChange={(e) => query.setParams({ ...params, q: e.target.value })}
      />
      <button onClick={() => query.refresh()}>刷新</button>

      {search.status === "loading" ? <div>Loading...</div> : null}
      {search.status === "success" ? (
        <pre>{JSON.stringify(search.data, null, 2)}</pre>
      ) : null}
    </div>
  )
}
```

### 1.4 AppRuntime 组合（imports，同源）

```ts
const RootImpl = Root.implement({
  initial: { /* ... */ },
  imports: [SearchQuery.impl],
})
```

### 1.5 Runtime 注入（全局 Layer）：注册资源 + 注入 Query.Engine

> Query 领域通过 effect 的 DI 获取 Query.Engine；建议在应用 Runtime 层一次性注入。

```ts
import { Layer } from "effect"
import { Resource } from "@logixjs/core"
import { QueryClient } from "@tanstack/query-core"
import * as Query from "@logixjs/query"

export const AppLayer = Layer.mergeAll(
  Resource.layer([SearchSpec]),
  Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
)
```

## 2. 关键语义核对（实现验收清单）

- deps：`computed/source/check` 必须显式声明 deps；Graph/诊断只以 deps 为事实源。
- scoped validate：`validate(target)` 的最小执行范围 = Reverse Closure(target)。
- 数组：对外 index；对内可 RowID 映射；预留 `identityHint/trackBy`。
- 资源竞态：keySchema normalize + keyHash；写回前 stale 门控；取消不是正确性前提。
- key 变空：必须同步写回 idle 并清空 data/error（避免 tearing）。
- 回放：Replay Mode 重赛（re-emit）录制结果，不重发请求。
