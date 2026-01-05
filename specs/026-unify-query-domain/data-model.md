# Data Model: Query 收口到 `@logix/query`（与 Form 同形）

**Date**: 2025-12-23  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/026-unify-query-domain/spec.md`

## Entities

### 1) Query Module（领域包入口 / 可组合子模块）

表示一个“Query 领域模块”的模块资产与默认行为集合，可直接被 Runtime/React 消费，也可通过 `imports` 方式组合进更大的应用模块。

**Fields**:

- `id`（string）：模块 id（用于诊断与组合）。
- `tag`（ModuleTag）：身份锚点（DI/Env 解析；也用于 imports scope）。
- `impl`（ModuleImpl）：可装配蓝图（Layer/imports/processes 等），供 Runtime/React 消费。
- `schemas/meta/dev.source`（可选）：反射/诊断用（不参与运行时语义）。
- `controller`（句柄扩展）：挂在 **ModuleHandle** 上的控制器扩展（见 Entity 3）。

**关键类型形状（与 Form 对齐）**：

- `Query.make(...)` 对外返回 `Logix.Module.Module`（不是 Blueprint）：这样 `useModule(QueryModule)` / `$.use(QueryModule)` / `$.self` 都能拿到“强类型 state + controller 扩展”。
- 但内部仍是两步：`Module.make → implement`；Query 只是把这两步封装在 `Query.make` 内，避免业务侧暴露“先定义再 implement”的样板。

**Relationships**:

- Query Module 依赖 `ResourceSpec`（Entity 5）定义“如何加载数据”。
- Query Module 通过 traits 降解到 StateTrait/Resource 主线（不维护第二套事实源）。

### 2) Query State（模块状态事实源）

Query 的 params/result/ui 必须全部落在模块 state 上，以保证可回放与可解释。

**Fields**（概念结构）:

- `params`：查询参数（由业务定义）。
- `ui`：交互态（例如 `ui.query.autoEnabled`）。
- `queries[queryName]`：每条 query 对应一个 `ResourceSnapshot`（idle/loading/success/error + keyHash + data/error）。

> 说明：多 query 场景下，每条 query 的 loading/error/success 都是**独立**快照字段；模块不默认提供“聚合 loading”，业务可按需派生（或由 controller/selector 层提供便捷 helper）。

> 关于 TanStack 的 `pending`/`loading`：TanStack v5 用 `status:"pending"` + `fetchStatus` 区分“无数据但未必在拉取”；本仓不把 `fetchStatus` 建模进事实源快照，`ResourceSnapshot` 只记录“写回结果”的四态（idle/loading/success/error）。是否“应触发但尚未触发/被禁用/手动模式”等，交由 `key(state)` 与业务 `params/ui` 表达（更声明式，也更可回放）。

**Reserved keys**:

- state 根字段 `queries` 为 Query 领域保留命名空间；业务不应将其挪作他用（避免与 Query 的快照模型冲突）。
- `queries` 的 key（queryName）必须是稳定可读的标识符（不允许包含 `.`）；并建议在定义期显式校验以避免产生不可解释的嵌套路径。
- Dev 诊断：StateTrait 全体系（computed/source/link/check）若声明的 `fieldPath/deps/link.from/check.writeback.path` 不存在于 `stateSchema`，dev 环境应给出可定位的 warning（不影响生产语义，且 diagnostics off 接近零成本）。例如：宿主模块忘了声明 `queries.<name>`（或 `queries` 命名空间被占用）时，应提前暴露配置错误而不是静默写出新字段。

**State transitions**（快照层面）:

- `idle → loading → success|error`：由底层 source 运行时控制，写回需满足 keyHash 门控。
- 当 key 不可用（返回 undefined）时，queryName 的快照最终应回收为 idle（回收策略由 kernel 保证）。

### 3) Query Controller（业务调用入口）

用于让业务在“可回放”的约束下表达意图：参数变化、交互态变化、手动刷新、失效请求。

**Fields**:

- `getState`：读取当前模块 state（包含 params/ui/各 query 快照）。
- `dispatch(action)`：派发 QueryAction（见 Entity 6）。
- `setParams(params)` / `setUi(ui)`：更新参数/交互态（触发自动逻辑）。
- `refresh(target?)`：触发一次显式刷新（可选指定 queryName；类型应收窄为 `keyof queries`）。
  - `refresh(queryName)`：只刷新目标 query；若 key 不可用则 no-op（并应可解释）。
  - `refresh()`：刷新模块内所有 query（等价于逐个刷新）。
- `invalidate(request)`：触发失效（必须事件化，见 contracts）。

### 4) Query Rule / QuerySourceConfig（规则声明 → 降解为 StateTrait）

每条 query 规则描述“依赖什么、何时触发、如何计算 key、并发如何处理”。

**Fields**:

- `resource`：资源引用（ResourceSpec 或 { id }）。
- `deps`：依赖字段路径数组（如 `params.q` / `ui.query.autoEnabled`），用于图构建与触发收敛；类型建议收窄为 `StateTrait.StateFieldPath<TState>`（`TState` 为模块 state；深度上限 4）。
- `triggers`：触发语义（`onMount` / `onKeyChange` / `manual`）。
- `debounceMs`（可选）：onKeyChange 的去抖（ms）。
- `concurrency`：并发语义（如 `switch` / `exhaust`）。
- `key(state)`：从模块 state 计算 key；返回 undefined 表示当前不应触发请求。

> 说明：`deps` 与 `key(state)` 的 `state` 根一致——`Query.make` 场景下是 Query 模块自己的 state（默认包含 `params/ui`）；`Query.traits` 场景下是宿主模块 state（因此可以直接读取宿主 state 的任意值）。

**Validation Rules**:

- `triggers=["manual"]` 必须独占（否则属于配置错误）。
- `deps` 必须显式声明，不允许隐式推导导致“不可解释依赖”。
- key 的结果必须可稳定 hash 为 `keyHash`（由 kernel/Resource.keyHash 统一口径）。

**Degradation (Query → StateTrait)**:

- 每条 Query Rule 必须能降解为一条 `StateTrait.source`，写回目标字段为 queryName（同构到模块 state 上）。
- keyHash/竞态门控由 kernel source 运行时保证；Query 领域逻辑只负责“何时 refresh / 何时 invalidate”。

### 5) ResourceSpec（资源定义）

用于定义 `resourceId + keySchema + load(key)`。

**Fields**:

- `id`：资源标识（resourceId）。
- `keySchema`：key 的形状约束（用于校验与 keyHash 口径）。
- `load(key)`：加载实现（返回 Effect；错误应进入业务错误通道）。

### 6) QueryAction / InvalidateRequest（领域事件）

Query 的意图入口必须可被记录、回放与诊断。

**QueryAction**（概念）:

- `setParams`
- `setUi`
- `refresh`
- `invalidate`

**InvalidateRequest**:

- `byResource`：按 resourceId 失效
- `byParams`：按 resourceId + keyHash 失效
- `byTag`：按 tag 失效（当无法从静态配置推导时允许退化为全量刷新）

### 7) External Query Engine（外部查询引擎实例）

外部引擎负责缓存策略与 in-flight 去重；Logix 保持触发/并发/写回门控与可回放事实源语义。

**Capabilities（概念）**:

- `fetch(queryKey, run, meta?)`：缓存/去重的统一入口；引擎决定是否复用缓存或执行 `run`。
- `invalidate(request)`：按 key/resource/tag 失效（如引擎支持）。
- `peekFresh?(queryKey)`：可选的只读快路径（CacheHook），用于在 refresh 前短路为 success，避免 loading 抖动；不得触发 IO。

**Not exposed by default**:

- `peekFresh` 默认仅用于 Query 默认逻辑的内部优化（写回 success snapshot），不作为 controller 的对外 API（避免把引擎缓存细节泄漏到领域句柄）。

**Injection**:

- 通过 `Query.Engine`（Effect Tag）+ `Query.Engine.layer(...)` 注入到 Runtime 作用域（见 `contracts/*`）。
- 若启用了需要外部引擎的能力但缺失注入，则必须作为配置错误失败并给出可操作提示。
