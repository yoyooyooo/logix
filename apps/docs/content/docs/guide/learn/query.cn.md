---
title: 查询（Query）
description: 用 @logixjs/query 构建可回放的查询模块，并按需接入缓存/去重引擎。
---

`@logixjs/query` 把“查询参数 → 资源加载 → 结果快照”收口成一个普通模块：`params/ui/结果快照` 都存放在模块 state 上，因此可以被订阅、被调试、被回放。

## 0) 心智模型（≤5 关键词）

- `单一入口`：所有 Query 相关能力都从 `@logixjs/query` 进入。
- `同形 API`：`Query.make(...)` + controller 句柄扩展（与 `@logixjs/form` 的使用方式同构）。
- `显式注入`：外部引擎通过 `Query.Engine.layer(...)` 注入；启用 `Query.Engine.middleware()` 但缺失注入会显式失败（避免静默退化）。
- `可替换引擎`：默认推荐 TanStack，但引擎是可替换的契约（Engine）。
- `可回放诊断`：查询链路输出 Slim 且可序列化的证据，用于解释与回放。

## 0.1 成本模型（粗粒度）

- 每次刷新都会走一次 `key(...depsValues) -> keyHash` 的门控；当 `key` 为 `undefined` 时刷新会被跳过（no-op）。
- 自动触发的“频率上限”由 `deps` + `debounceMs` 决定：`debounceMs` 越大，越能把高频输入收敛成更少的真实刷新。
- `concurrency` 决定竞态语义：`switch` 会中断旧 in-flight（并通过 `keyHash` gate 丢弃旧结果），`exhaust`/trailing 会把中间变化合并到尾部一次执行（减少无意义写回）。
- 启用外部引擎 + middleware 后：命中缓存时可以避免重复执行 `ResourceSpec.load`；diagnostics=off 的额外开销预算为 p95 ≤ +1%，diagnostics=full/light 预算为 p95 ≤ +5%。

## 0.2 诊断字段（可解释链路）

当 diagnostics 打开时，查询快照/事件链路会携带至少这些信息，用来回答“为什么触发/为什么写回”：

- `resourceId`：资源标识（来自 `ResourceSpec.id`）
- `keyHash`：稳定键（由 key 计算得出）
- `concurrency`：并发策略（例如 `switch`、`exhaust-trailing`）
- `status`：`idle/loading/success/error`

## 1) 最小用法：定义 Query Module

```ts
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Query from '@logixjs/query'

export const SearchSpec = Logix.Resource.make({
  id: 'demo/user/search',
  keySchema: Schema.Struct({ q: Schema.String }),
  load: ({ q }) => /* Effect.Effect<...> */,
})

export const SearchQuery = Query.make('SearchQuery', {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: '' },

  // ui：交互态命名空间（例如开关/面板状态），可参与 deps/key 计算
  ui: { query: { autoEnabled: true } },

  queries: ($) => ({
    list: $.source({
      resource: SearchSpec,
      deps: ['params.q', 'ui.query.autoEnabled'],
      triggers: ['onMount', 'onKeyChange'],
      concurrency: 'switch',
      key: (q, autoEnabled) => (autoEnabled && q ? { q } : undefined),
    }),
  }),
})
```

要点：

- `params` 用于业务参数；`ui` 用于交互态（没有预设形状，但应保持可序列化/可回放）。
- 每条 query 的结果会写回到模块 `state.queries[queryName]`（`ResourceSnapshot`：`idle/loading/success/error` + `keyHash`）。
- TanStack v5 的 `status:"pending"` + `fetchStatus` 语义不直接搬进快照：Logix 只用 `ResourceSnapshot.status` 表达四态；“禁用/手动/参数未就绪”等由 `params/ui`（以及 `key(...depsValues)` 返回 undefined）表达。
- `deps` 必须显式声明：它既是触发收敛的依据，也是调试/解释链路的一部分。

## 2) 把 Query 当成普通子模块组合（推荐）

Query 模块可以像其他模块一样被 `imports` 引入。React 中推荐通过父模块实例的 scope 解析子模块 runtime，避免串实例：

- 参考：[跨模块协作（imports / $.use / useImportedModule）](./cross-module-communication)

## 3) 外部引擎（缓存/去重）+ middleware（接管点）

当你希望把“缓存 / in-flight 去重 / 失效 / 可选快读（避免 loading 抖动）”交给外部引擎时：

```ts
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'
import * as Query from '@logixjs/query'
import { QueryClient } from '@tanstack/query-core'

export const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, Query.Engine.layer(Query.TanStack.engine(new QueryClient()))),
  middleware: [Query.Engine.middleware()],
})
```

组合语义（“引擎注入 × middleware”）：

- 不注入 + 不启用：直接执行 `ResourceSpec.load`（无缓存/去重）。
- 只注入：不接管 fetch（通常不推荐作为默认）。
- 只启用：配置错误并提示注入（避免静默退化）。
- 同时启用：启用缓存/去重（推荐，TanStack 为默认适配器）。

### 3.1 失效（invalidate）与 tags（可选）

- `invalidate({ kind: "byResource", resourceId })` / `invalidate({ kind: "byParams", resourceId, keyHash })`：精确失效。
- `invalidate({ kind: "byTag", tag })`：按 tag 失效；为了避免退化为“全量刷新”，你可以在 query 配置里声明静态 `tags`：

```ts
queries: {
  list: {
    // ...
    tags: ["user"],
  },
}
```

### 3.2 竞态与取消（`switch` / `AbortSignal`）

- `StateTrait.source` 的默认并发是 `switch`：新 key 会中断旧的 in-flight fiber；即使取消未能传导到网络层，旧结果也会被 `keyHash` gate 丢弃，不会覆盖新结果。
- 如果你希望“网络层真正取消”（例如 axios 请求），请在 `ResourceSpec.load` 里使用 Effect 的 `AbortSignal`（例如 `Effect.tryPromise({ try: (signal) => axios.get(url, { signal }), catch: ... })`）。
- 详见：[可中断 IO（取消与超时）](../advanced/resource-cancellation)

> [!TIP]
> 这里的 `StateTrait.source` 属于 traits 体系的一部分；如果你对“能力声明/收敛/事务窗口”的关系还不熟，先读：
> - [Traits（能力声明与收敛）](../essentials/traits)

### 3.3 优化阶梯（从简单到复杂）

你可以按需“逐级增加能力”，而不是一开始就把所有复杂度引入：

1. **纯透传（最简单）**：只写 `Query.make(...)`，不注入引擎、不启用 middleware —— 每次刷新直接执行 `ResourceSpec.load`。
2. **缓存/去重（推荐默认）**：注入 `Query.Engine.layer(Query.TanStack.engine(new QueryClient()))` 并启用 `Query.Engine.middleware()` —— 获得缓存、in-flight 去重与失效能力。
3. **减少无意义刷新**：用 `key(...depsValues) => undefined` 表达“参数未就绪/禁用”，并确保 `deps` 只声明真正影响 key 的字段。
4. **避免 loading 抖动（缓存命中快读）**：当引擎提供 `peekFresh` 时，Query 默认逻辑会在 refresh 前尝试命中 fresh cache，直接写入 `success` 快照。
5. **真正取消/超时/重试**：在 `ResourceSpec.load` 中使用 `AbortSignal` + `Effect.timeoutFail` / `Effect.retry`，让 `switch` 不仅“丢弃旧结果”，还能真正取消网络层 IO。

### 3.4 长期运行进程的 cache 上限（TanStack engine）

如果你的 key 空间可能无界增长（例如长时间运行的搜索输入），可以为 TanStack engine 设置本地快缓存的上限：

```ts
Query.TanStack.engine(queryClient, { maxEntriesPerResource: 2000 })
```

## 4) 依赖其他模块触发 refetch（两种方式都需要）

### 4.1 推荐：由“拥有者模块”驱动 imports 子模块的刷新（作用域最稳）

当 `BModule` 通过 `imports` 引入了一个 `AQuery` 时，最稳的写法是：把“联动”写在 `BModule` 的 Logic 内（B 作为 owner），在 **B 的实例 scope** 下解析到被 imports 的 `AQuery` 句柄，然后显式触发刷新。

```ts
import { Effect } from 'effect'

export const BLogic = BModule.logic(($) =>
  Effect.gen(function* () {
    const q = yield* $.use(AQuery)

    // B 的某个状态变化 -> 更新 AQuery params（让默认 auto-trigger 生效）
    yield* $.onState((s) => s.filters.keyword).runFork((keyword) => q.controller.setParams({ q: keyword }))

    // 或者：强制 refetch（即使 params 未变化）
    yield* $.onState((s) => s.filters.forceReloadToken).runFork(() => q.controller.refresh())
  }),
)
```

经验法则：

- “谁 imports，谁负责驱动”：避免 Link/全局监听直接操纵子模块，导致多实例时刷错目标。
- 能用 `setParams/setUi` 表达就优先用它（可解释、与 deps/keyHash 主线一致）；需要强制拉取再用 `refresh`。

### 4.2 当触发源来自别的模块：Link 只负责转发信号，刷新仍由 owner 执行

如果触发源来自 `CModule`（不属于 B 的内部状态），可以用 `Link.make` 把信号转成 `B.actions.*`，再由 `BLogic` 在自己的 scope 内刷新 `AQuery`，保持封装与实例语义清晰。

### 4.3 高级：把 Query 快照字段收敛进主模块 state（需要更多手工接线）

当你强约束“所有状态都必须存在一个主模块里”（或需要把多个 query 快照字段与业务 state 同构建图）时，可以用 `Query.traits(...)` 生成 `StateTraitSpec`，把 query snapshot 字段收口到主模块的 `state.queries.*`；但触发/失效/控制器等 wiring 需要你自己显式组织，因此只建议在确有必要时使用。
