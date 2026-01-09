# References: Query Data Model（与 Form 平行）

> 本文固化 Query 领域在 004 链路上的关键实体与约束，风格与 `specs/004-trait-bridge-form/data-model.md` 对齐，但仅聚焦 Query。

---

## 1. QuerySnapshot（结果快照）

Query 的运行时事实源仍然是 `ResourceSnapshot`（或等价结构）。建议统一命名为 `QuerySnapshot`（领域别名），但不要发明第二套状态机。

```ts
type QuerySnapshot<Key, Data, Err> =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly key: Key; readonly keyHash: string }
  | { readonly status: "success"; readonly key: Key; readonly keyHash: string; readonly data: Data }
  | { readonly status: "error"; readonly key: Key; readonly keyHash: string; readonly error: Err }
```

约束：

- `keyHash` MUST 来自 `keySchema normalize + stable hash`（与 004 data-model 一致）。
- 所有去重、竞态丢弃、缓存索引 MUST 以 `keyHash` 为唯一依据。

---

## 2. QueryKey（keySchema 规范化）

QueryKey 的来源通常是“参数对象”（filters/pagination/sort/searchText…）。

约束：

- key MUST 通过 `ResourceSpec.keySchema` 规范化（decode/normalize）；
- 规范化后的 key 才能进入快照（便于回放/对比/诊断）；
- UI 层可以持有“未规范化的草稿参数”，但进入请求的 key 必须规范化。

---

## 3. 缓存与作用域（runtime 维度）

实现选择：`@logixjs/query` 内部使用 TanStack Query 作为缓存/去重引擎（QueryClient）。

因此缓存作用域建议与 ResourceRegistry 一致（并与 QueryClient 的作用域对齐）：

- 同一 runtime 作用域内：`resourceId` 必须唯一；同一 `resourceId + keyHash` 的 in-flight SHOULD 去重；
- 跨 runtime：允许同名 `resourceId`（不同实现/不同缓存），不视为冲突。

> 这让 Query 很自然地支持：多 RuntimeProvider 子树隔离缓存（比如不同页面/不同租户/不同权限域）。

职责边界：

- TanStack Query 负责：cache（staleTime/gcTime）、in-flight dedup、重试策略（可选）、以及（在 queryFn 支持 AbortSignal 时的）取消；
- Logix Runtime 仍必须：在把结果写回 state 时做 `keyHash` 门控（stale 丢弃），保证“只认最新”的正确性与可回放语义。

---

## 4. 触发与并发（triggers + concurrency）

沿用 004 data-model 的约束：

```ts
type QueryTrigger = "manual" | "onMount" | "onKeyChange" | "onBlur"
type QueryConcurrency = "switch" | "exhaust"
```

补充约束（Query 语义）：

- `manual` MUST 独占（不与其他触发混用），避免“既自动又手动”的歧义；
- `onKeyChange` 可以配置 `debounceMs`；`onMount` 通常不需要；
- 并发策略不改变正确性：stale 丢弃必须做；并发策略只影响“是否取消/是否合并触发”的体验与成本。

---

## 5. InvalidateRequest（失效/刷新）

Query 需要一个可组合的“失效/刷新请求”概念，供 TraitLifecycle/中间件/Devtools 使用：

```ts
type InvalidateRequest =
  | { readonly kind: "resource"; readonly resourceId: string }
  | { readonly kind: "key"; readonly resourceId: string; readonly keyHash: string }
  | { readonly kind: "tag"; readonly tag: string }
```

语义：

- `resource`：失效该资源下所有 key
- `key`：仅失效某个 keyHash
- `tag`：以 meta.tags 为索引批量失效（仅影响诊断/组织，不影响执行语义）

---

## 6. Query UI 全双工状态（state.ui.query）

Query 的 UI 状态建议进入 `state.ui.query`（结构由领域包定义），典型字段：

- `autoEnabled: boolean`（是否允许自动触发）
- `lastTriggeredBy: "mount" | "valueChange" | "manual" | "retry"`
- `submitCount: number`（手动触发次数）
- `pendingParams?: unknown`（未规范化参数草稿；或仅用于输入框）

约束：

- UI 层不维护第二套不可回放事实源；
- 需要复现“为什么没触发/为什么触发太频繁”的问题时，Devtools 应能基于 `state.ui.query + EffectOp timeline` 给解释。
