# References: `@logixjs/query` × TanStack Query 集成契约

> 目标：明确 “各司其职” 的边界：  
> - TanStack Query 负责缓存与请求层面的工程复杂度；  
> - Logix Trait/Runtime 负责可回放、可解释、可生成的全双工链路。  
> 这份契约用于验证 Trait 体系是否能优雅集成第三方包，而不是把所有能力都造一遍。

---

## 1. 职责分工（必须清晰）

### 1.1 TanStack Query（QueryClient）负责什么

- cache：`staleTime/gcTime`、缓存命中与回收
- in-flight 去重：同一 queryKey 的并发请求合并
- retry：重试策略（如需）
- cancel：在 queryFn 支持 `AbortSignal` 时的取消（可选，正确性不依赖它）

### 1.2 Logix（StateTrait + TraitLifecycle + EffectOp）负责什么

- keySchema 规范化与 keyHash：稳定、可回放、可比较
- triggers/concurrency：何时触发、触发频率、switch/exhaust 的体验语义
- 写回 state 的快照（QuerySnapshot / ResourceSnapshot）：作为全双工事实源
- stale 丢弃：写回前必须按 keyHash 门控（只认最新）
- Devtools 可解释性：每次触发/取消/丢弃/命中缓存都应落在可观测事件上（EffectOp timeline + state patch）

> 结论：即使 TanStack Query 有缓存与 dedup，Logix 仍必须做“写回门控”，否则无法保证“回放时语义一致”。

---

## 2. 映射规则（resourceId ↔ queryKey）

推荐映射（尽量简单、稳定、可诊断）：

- `resourceId`：作为 queryKey 的第一个段（namespace）
- `keyNormalized`：作为 queryKey 的第二段（结构化对象），用于可读性与调试
- `keyHash`：作为 queryKey 的可选第三段（当担心 keyNormalized 不稳定或体积过大时）

示意：

```ts
const queryKey = [resourceId, keyNormalized] as const
// 或
const queryKey = [resourceId, keyHash] as const
```

约束：

- 无论 queryKey 选择哪种形状，**stale 丢弃必须按 keyHash**（来自 keySchema 规范化）做门控；
- queryKey 的选择只影响缓存粒度与可诊断性，不应改变业务正确性。

---

## 2.1 `enabled` 与“queryKey 变化自动查询”怎么对齐

TanStack Query 的两个核心体验：

1) `enabled=false` 时不自动请求；  
2) `queryKey`（或 options）变化时自动请求。

在 004 的链路里两者都能做到，并且应当分别归属到：

- **领域语义（`@logixjs/query`）**：什么叫 enabled、何时算 queryKey 变化、是否要 debounce、是否要 manual；
- **kernel 正确性（Logix runtime）**：写回 state 前的 keyHash 门控（stale 丢弃）与可观测性（EffectOp + patch）。

推荐映射：

- `enabled`：由 `state.ui.query.autoEnabled`（或等价字段）作为全双工事实源；  
  - enabled 只控制“是否允许触发请求”，不必改变 key 的计算方式；  
  - 当 enabled=false 时：
    - **不触发新的请求**；
    - state 中的快照（QuerySnapshot）建议保持“最后一次可观测结果”（通常是 success/error），同时在 `state.ui.query` 中体现 enabled=false，避免把“缓存数据还在但禁用了触发”误表示成 `idle`。

- `queryKey` 变化：由 `keySchema normalize + keyHash` 判断变化（稳定、可回放、可诊断）；  
  - 在 enabled=true 且 keyHash 变化时，触发一次 `fetch/ensure`；
  - 并发语义（switch/exhaust）决定“是否取消旧请求/是否合并触发”，但不改变正确性：写回仍必须 stale 丢弃。

---

## 3. `@logixjs/query` 需要提供的最小集成点（建议）

> 这里只定义“领域包需要提供什么”，不规定具体代码结构。

### 3.1 引擎注入（Layer/Provider）

`@logixjs/query` SHOULD 提供：

- `Query.Engine`（Effect Context.Tag）
- `Query.Engine.layer(engine)`（在某个 runtime 作用域内提供 Engine 实例）

语义：

- 同一 runtime 作用域内一个 Engine（与 ResourceRegistry 的 scope 对齐）
- 跨 runtime 允许不同 Engine（缓存隔离）

### 3.2 Effect 封装（fetch/ensure/invalidate）

`@logixjs/query` SHOULD 提供把常用 QueryClient 操作封装为 Effect 的 helper，例如：

- `Query.TanStack.fetch({ resourceId, keyNormalized, keyHash, queryFn, options })`
- `Query.TanStack.invalidate({ resourceId | keyHash | tag })`

这些 helper 的返回值与错误语义应与 ResourceSpec.load/EffectOp 兼容。

---

## 4. 与 Trait 的配合点（source + 写回门控）

典型执行链路（概念）：

1) `StateTrait.source` 根据 `ctx.state` 推导 key（可能是 undefined=禁用）
2) Runtime 在触发 refresh 前：
   - `keySchema` decode/normalize 得到 `keyNormalized`
   - 计算 `keyHash`
3) 调用 `@logixjs/query` 的 TanStack helper：
   - QueryClient.fetchQuery 负责缓存/in-flight 去重
4) 结果返回后写回 state：
   - **必须先比较“当前最新 keyHash”**，不一致则丢弃（stale）
5) 记录 EffectOp + patch（可解释）

并发策略（switch/exhaust）：

- `switch`：尽量调用 QueryClient 取消旧请求（如 queryFn 支持 signal），但正确性不依赖取消；写回仍必须 stale 门控
- `exhaust`：运行时抑制 in-flight 期间的新触发，并记录一次 trailing；结束后补一次最新 key 的 refresh

---

## 4.1 “自动查询”的两种实现方式（推荐用 Observer）

### 方案 A（推荐）：QueryObserver（query-core）驱动自动行为

对每条 `StateTrait.source` 规则，在 runtime scope 内维护一个 `QueryObserver`：

- 当 state 变化导致 `enabled/keyHash` 变化时：`observer.setOptions({ enabled, queryKey, queryFn, ... })`
- TanStack Query 会自动决定是否 fetch（enabled + key 变化），并负责缓存与 in-flight 去重
- `observer.subscribe(result => ...)` 把结果转成 QuerySnapshot 写回 state（并通过 EffectOp 记录）
- 写回前仍做 keyHash 门控：避免“旧订阅回调”写回到新 key 的快照

优点：

- 最贴近 TanStack 心智（enabled/queryKey 自动）；
- 少样板代码：不用手写“监听 key 变化就 fetch”；
- 更利于后续 React 侧复用（同一个 queryKey 语义）。

### 方案 B：显式 fetchQuery（更直接，但更像手写）

每次检测到 keyHash 变化就调用 `queryClient.fetchQuery(...)`，把结果写回 state。

缺点：

- “自动性”依赖我们自己写监听与触发逻辑；
- 更容易把 debounce/exhaust/switch 的语义散落在各处。

结论：如果你要“像 TanStack 一样”，优先用方案 A。

## 5. 这件事如何反向验证 004 的链路

把 TanStack Query 作为内部缓存引擎有三个价值：

1) 验证 Trait/Runtime 的“第三方集成能力”是否自然：是否只需要 Layer + helper 即可，不需要侵入 kernel
2) 验证“全双工事实源”的原则是否稳：缓存不等于事实源，state 仍然是回放与解释的基准
3) 验证 triggers/concurrency 的必要性：TanStack 解决缓存，但不解决“何时触发/用户语义”，这仍是 TraitLifecycle/领域协议要做的
