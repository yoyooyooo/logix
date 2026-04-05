# 基于 Effect（effect-ts）的状态管理 / 副作用管理上层封装调研

目标：回答“是否存在基于 Effect（effect-ts / `effect`）的开源状态管理、副作用管理等上层封装？它们分别解决什么问题，怎么选？”

适用范围与已验证边界：

- 本调研聚焦 **Effect v3 生态（`effect`）** 及其上层库/框架；内容以公开资料（README/文档）为主，不包含系统性 benchmark 与深度试用。
- 结论按“定位/能力边界/适用场景”整理；每个条目都给出“仓库 + 关键文件路径”，便于复查。

## TL;DR（最短结论）

- 有，而且已经形成一套“Effect-native 的状态/副作用组织方式”：**Atom/Rx（带 Scope 生命周期）**、**Stream/Ref/SubscriptionRef（响应式数据源）**、**Reactivity keys（声明式失效/刷新）**、以及围绕 **HttpApi/RPC/Query** 的集成层。
- 如果你要在 React 做“全局状态 + 副作用 + 依赖注入 + 生命周期自动清理”，目前最接近成熟方案的是：`tim-smart/effect-atom`（`@effect-atom/atom-react`）。
- 如果你要的是“请求态缓存/并发去重/重试”而不想引入一整套全局状态：`effect-query`（TanStack Query × Effect）更贴近现有工程习惯。
- 如果你要“细粒度响应式状态（signals-like）”：Effect 内建 `SubscriptionRef`；也可以看 `@typed/lazy-ref`（更偏惰性计算 + 依赖传播的状态容器）。
- 如果你要“离线优先 + 同步 + 本地数据库即状态”：`livestorejs/livestore` 更像“数据层替代 Redux/MobX”，而不是轻量 store。
- 如果你希望“状态/请求/缓存/队列/状态机”等可组合积木更“官方化”：`@effect/experimental` 内已经包含 `Reactivity`、`Persistence`、`PersistedCache`、`PersistedQueue`、`Machine` 等模块（但稳定性取决于它们的 experimental 定位）。

## 1) 生态地图（按“状态/副作用抽象层级”分组）

### 1.1 Atom / Rx：面向应用状态（含副作用、依赖注入、生命周期）

#### effect-atom：Effect-native 的 Atom 状态管理（含 React hooks）

- 仓库：https://github.com/tim-smart/effect-atom
- 定位：Reactive state management for Effect；支持 derived、effectful atoms（返回 `Result`）、Scope finalizers、基于 Layer 的 service 注入（`AtomRuntime`）、Stream/分页 pull、并提供 React hooks（`useAtomValue` / `useAtomSet` / `useAtom` 等）。
- 特别值得关注的能力（适合“副作用管理 + 状态管理一体化”）：
  - **effectful Atom**：把 Effect 直接作为 Atom 的值来源，并用 `Result` 表达失败/缺值等状态。
  - **Scope + Finalizer**：Atom 的订阅生命周期天然挂钩资源释放（例如取消 fiber、关闭订阅等）。
  - **Reactivity keys**：声明式失效/刷新（尤其适合“mutation 完成后让 query 自动刷新”的模式）。
  - **HttpApi / RPC 集成**：提供 query/mutation 的封装入口。
- 与“传统 React 状态库”的差异：更像把“state + side effects + DI + lifecycle”统一到一套 Effect 语义里，而不是把 Effect 当作 thunk/side-effect helper。

代码层可追溯要点（用于快速验证其“React 绑定怎么做的”）：

- `@effect-atom/atom-react` 使用 `React.useSyncExternalStore` 绑定 registry 的订阅与 snapshot（对 React 18+ 的外部 store 订阅友好）
  - 关键文件：`tim-smart/effect-atom/packages/atom-react/src/Hooks.ts`

跨框架/数据层绑定（说明它不仅是 React 方案）：

- `@effect-atom/atom-vue`：Vue 3 绑定（`computed` / `watchEffect` / `shallowRef`）
  - 关键文件：`tim-smart/effect-atom/packages/atom-vue/src/index.ts`
- `@effect-atom/atom-livestore`：与 LiveStore 的绑定（Store layer/runtime atom、query atom、commit writable 等）
  - 关键文件：`tim-smart/effect-atom/packages/atom-livestore/src/AtomLivestore.ts`

历史线索（旧命名）：

- 仓库：https://github.com/tim-smart/effect-rx
- 说明：社区信息显示该路线后来迁移/更名为 effect-atom（供追溯用，优先以 effect-atom 为准）。

### 1.2 Ref / SubscriptionRef / Stream：面向响应式状态与流

#### SubscriptionRef：Effect 内建“可订阅 Ref”

- 文档：https://effect.website/docs/state-management/subscriptionref/
- 定位：在 `Ref` 基础上提供 `changes: Stream`，可以用来建模“共享状态 + 多观察者订阅”。

#### @typed/lazy-ref：惰性 + 响应式的状态容器（Effect 生态）

- 仓库：https://github.com/TylorS/typed-lazy-ref
- 定位：Reactive state management library for Effect；强调 lazy evaluation + reactive propagation + Stream changes + 并发安全更新（`runUpdates`）+ Tag/DI 集成。
- 更适合：需要“细粒度派生/计算图 + 惰性求值”的场景（例如大量 derived state、昂贵计算、希望只在需要时计算）。

### 1.3 异步数据状态（Loading/Refreshing/Optimistic）

#### @typed/async-data：异步数据状态机（Effect-native）

- 仓库：https://github.com/TylorS/typed-async-data
- 定位：用 `NoData/Loading/Success/Failure/Refreshing/Optimistic` 六态建模异步数据，并与 Effect 生态（含 `Cause`）集成；提供与 `@typed/lazy-ref` 的组合用法。
- 更适合：UI 请求态、乐观更新、刷新态管理需要“可组合、可类型化”的抽象（比手写 `isLoading/data/error` 更结构化）。

### 1.4 请求态缓存/并发去重：TanStack Query × Effect

#### effect-query：把 Effect 直接作为 TanStack Query 的 `queryFn`/`mutationFn`

- 仓库：https://github.com/voidhashcom/effect-query
- 定位：Integration of Effect with TanStack Query；适合 React 里沿用 TanStack Query 的缓存/重试/并发语义，同时把业务逻辑写成 Effect（并保持错误类型可匹配）。
- 更适合：已经用/计划用 TanStack Query 的工程，且只想把“副作用层/服务层”升级为 Effect，而不想引入新的全局状态模型。

#### effect-db-collection：TanStack React DB × Effect（实验性）

- 仓库：https://github.com/timzolleis/effect-db-collection
- 定位：把 Effect 接入 `@tanstack/react-db` 的 collection 形态（README 明确标注“highly experimental”）。
- 更适合：想把“数据集合 + CRUD 副作用 + 并发批处理（`Effect.all`）”统一到一套可组合的 reactive data 层，但能接受 API 快速变化。
- 关键文件：`timzolleis/effect-db-collection/README.md`

### 1.5 数据层（离线/同步/SQLite）：把“状态”提升到本地数据库

#### LiveStore：Reactive SQLite + 内建 sync 的“状态管理框架”

- 仓库：https://github.com/livestorejs/livestore
- 定位：client-centric data layer（替代 Redux/MobX 等）；核心是 reactive SQLite（本地状态）+ event-sourcing + sync engine。
- 更适合：协作/多端/离线优先/本地即真相源的应用（用“数据层”统一应用状态，而不是在 UI 层维护复杂 store）。

### 1.6 官方 experimental 积木：Reactivity / Persistence / Machine / Durable-ish state

> 这类模块不一定等价于“UI 状态库”，但它们提供了上层状态/副作用管理常用的基础积木（失效、持久化、队列、状态机、持久化缓存等）。

#### @effect/experimental/Reactivity：基于 keys 的“查询/失效”机制

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/Reactivity.ts`
- 价值点：
  - `invalidate(keys)`：按 key 失效，触发订阅端重新执行
  - `query(keys, effect)` / `stream(keys, effect)`：把 effect 变成可重复触发的 mailbox/stream（并在 Scope 内自动 cleanup）
  - `mutation(keys, effect)`：在 mutation 完成后自动 invalidate（对“写后刷新”非常直接）

#### @effect/sql：与 Reactivity 打通的“Reactive SQL Query”

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/sql/src/SqlClient.ts`
- 价值点：`SqlClient.reactive(...)` / `SqlClient.reactiveMailbox(...)` 明确依赖 `@effect/experimental/Reactivity`，把 DB query 直接变成“可失效/可刷新”的 reactive 结果源。

#### @effect/experimental/Persistence：面向结果/值的持久化（KV / 内存 / Redis / LMDB）

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/Persistence.ts`
- 适用点：
  - 可作为“缓存/请求结果持久化”的抽象层（底层可落到 `@effect/platform/KeyValueStore` 等）
  - 内置多种 backing（例如 Redis、LMDB）作为可追溯落点：
    - `Effect-TS/effect/packages/experimental/src/Persistence/Redis.ts`
    - `Effect-TS/effect/packages/experimental/src/Persistence/Lmdb.ts`

#### @effect/experimental/PersistedCache：持久化缓存 + 内存热缓存

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/PersistedCache.ts`
- 价值点：`get(key)` 先查持久化 store，再 fallback 到 lookup，并在内存 cache 里做容量/TTL；提供 `invalidate(key)`。

#### @effect/experimental/PersistedQueue：带重试/幂等 id 的持久化队列抽象

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/PersistedQueue.ts`
- 价值点：`offer`（可自定义 id 幂等）+ `take`（失败自动重试、可配置 maxAttempts），并提供内存 store layer（示例实现）。

#### @effect/experimental/Machine：Actor-like 的状态机/过程驱动（含序列化快照）

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/Machine.ts`
- 价值点：提供 “Actor / send / state changes stream / snapshot+restore” 等概念，对“复杂交互/流程”的状态演化建模更贴近 state machine。

#### @effect/experimental/RequestResolver：DataLoader/请求持久化缓存（实验性）

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`Effect-TS/effect/packages/experimental/src/RequestResolver.ts`
- 价值点：
  - `dataLoader({ window, maxBatchSize })`：按时间窗聚合请求并批处理（类似 DataLoader 的 batching 语义）
  - `persisted({ storeId, timeToLive })`：把 request 结果落到 `ResultPersistence` 并复用（偏“请求级缓存/持久化”）

### 1.7 副作用编排与应用层集成（更偏“工程基础设施”）

#### @effect/workflow：Durable workflows（长任务/可恢复）

- 仓库：https://github.com/Effect-TS/effect
- 关键路径：`packages/workflow/README.md`
- 定位：用 Effect 定义可持久化/可恢复的 workflow（适合长耗时步骤、可靠执行、补偿、暂停/恢复）。

#### effect-trpc：tRPC × Effect（服务注入 + tracing）

- 仓库：https://github.com/mikearnaldi/effect-trpc
- 定位：在 tRPC procedures 内用 Effect generator 写逻辑，通过 `ManagedRuntime` 注入服务，并提供 tracing 相关封装。

#### Effect App：面向服务端/全栈的“框架化默认值”

- 文档仓库：https://github.com/effect-app/docs（关键文件：`README.md`）
- 框架仓库：https://github.com/effect-ts-app/libs（适合作为实现落点复查）
- 定位：更多是“应用架构/资源/存储适配器/Schema 单一事实源”的框架，而不是 UI 状态库；但属于“副作用组织、依赖注入、工程形态”层面的上层封装。

#### effect-ui：基于 Effect 的 UI 框架（偏实验/研究）

- 仓库：https://github.com/m9tdev/effect-ui
- 说明：仓库根目录暂无 `README.md`；目前 `packages/effect-ui/src/core/state.ts` 实现了一套“signals-like”的依赖追踪/订阅模型（基于 `effect/Ref` + 自维护 subscriptions），并非直接基于 `SubscriptionRef`。
  - 关键文件：
    - `m9tdev/effect-ui/packages/effect-ui/src/core/state.ts`
    - `m9tdev/effect-ui/packages/effect-ui/src/core/component.ts`

### 1.8 工具与可观测性（辅助副作用/状态调试）

#### Effect DevTools（VS Code 扩展）+ `@effect/experimental/DevTools`

- 扩展仓库：https://github.com/Effect-TS/vscode-extension
  - 关键文件：`Effect-TS/vscode-extension/README.md`
- 运行端模块（layer 提供）：https://github.com/Effect-TS/effect
  - 关键文件：`Effect-TS/effect/packages/experimental/src/DevTools.ts`
- 说明：它更偏“调试/可观测性”而不是 state store，但对“副作用链路可解释、问题定位”很关键，尤其在 Effect-heavy 代码里。

## 2) 选型建议（按目标快速收敛）

- React 全局状态 + 副作用/DI/生命周期一体化：优先评估 `effect-atom`（尤其当你希望用 Scope 自动管理订阅与资源）。
- React 主要痛点是请求态（缓存/并发/重试/失效），且已有 TanStack Query 心智：优先 `effect-query`；再考虑是否需要额外全局状态模型。
- 细粒度响应式（signals-like）、希望“状态变化 → 订阅者自动响应”：从 Effect 原生 `SubscriptionRef` 入手；需要更强的惰性/计算图时评估 `@typed/lazy-ref`。
- UI 请求态想要结构化六态与乐观更新：评估 `@typed/async-data`（尤其当你不想引入 TanStack Query）。
- 离线/同步/协作数据层：评估 LiveStore（它解决的是“数据层与同步”，不是轻量 store）。
- 长任务/可恢复流程：评估 `@effect/workflow`（它解决“可靠执行”，不是 UI 状态）。
- 需要“失效/刷新 + 持久化缓存/队列/状态机”这类积木，而不想引入第三方框架：优先评估 `@effect/experimental` 相关模块（但要接受 experimental 的演进速度）。

## 3) 关键文件索引（便于复查）

- `tim-smart/effect-atom`
  - `README.md`
- `tim-smart/effect-atom`（跨框架/绑定）
  - `packages/atom-react/src/Hooks.ts`
  - `packages/atom-vue/src/index.ts`
  - `packages/atom-livestore/src/AtomLivestore.ts`
- `tim-smart/effect-rx`（旧线索）
  - `README.md`
- `voidhashcom/effect-query`
  - `README.md`
- `timzolleis/effect-db-collection`
  - `README.md`
- `livestorejs/livestore`
  - `README.md`
- `TylorS/typed-lazy-ref`
  - `readme.md`
- `TylorS/typed-async-data`
  - `readme.md`
- `Effect-TS/effect`
  - `packages/workflow/README.md`
  - `packages/experimental/src/index.ts`
  - `packages/experimental/src/Reactivity.ts`
  - `packages/experimental/src/Persistence.ts`
  - `packages/experimental/src/PersistedCache.ts`
  - `packages/experimental/src/PersistedQueue.ts`
  - `packages/experimental/src/Machine.ts`
  - `packages/experimental/src/RequestResolver.ts`
  - `packages/sql/src/SqlClient.ts`
- `mikearnaldi/effect-trpc`
  - `README.md`
- `effect-app/docs`
  - `README.md`
- `effect-ts-app/libs`
  - `README.md`（建议进一步从 `packages/**` 查落点）
- `m9tdev/effect-ui`
  - `packages/effect-ui/package.json`
  - `packages/effect-ui/src/core/state.ts`
  - `packages/effect-ui/src/core/component.ts`
