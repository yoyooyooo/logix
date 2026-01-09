# References: Query 领域规划（与 Form 平行的第二大领域）

> 目的：把 Query 作为与 Form 平行的第二大领域一起规划，用来压力测试 004 的链路是否自洽：  
> **Trait（内核）→（可选）StateTrait（支点）→ 领域包（Form/Query）→ UI 适配层**。  
>
> 约束：本文件是“与 Form 同粒度的规划”，但不抢主文（`spec.md/quickstart.md/data-model.md`）的主体叙事；主文仍以 Form 为主，Query 的详细内容都外链到 `references/*`。

---

## 1. Positioning（Query 的定位）

Query 的核心不是“提交草稿”，而是：

- 声明式描述“**参数 → 异步数据**”的依赖关系（resourceId + key）；
- 以最小心智处理“竞态、缓存、去重、触发策略、错误语义”；
- 把 UI 层常见的“loading/error/空态/重试/刷新/分页”等状态纳入全双工链路（`state.ui` 可回放），并在 Devtools 上可解释。

实现选择（用于验证“集成第三方包”的能力）：

- `@logixjs/query` **内部使用 TanStack Query**（建议基于 `@tanstack/query-core` 作为内核，React 侧用 `@tanstack/react-query` 适配层），由其负责缓存、in-flight 去重、staleTime/gcTime 等缓存策略；
- Logix Trait/Runtime 不重复实现缓存，但仍负责：
  - keySchema 规范化 + keyHash（稳定可回放、可比较）；
  - 触发语义（onMount/onKeyChange/manual）与并发策略（switch/exhaust）；
  - 把“快照（QuerySnapshot）”写回 state，作为全双工事实源与 time travel 的可回放依据；
  - EffectOp timeline 的可解释性（为什么触发/为什么丢弃/为什么取消）。

Query **不是**：

- 一套新的运行时（仍然回落到 StateTrait 的 `source + computed/check`）；
- 一套与 Resource 体系并行的“自建缓存/自建请求层”。

一句话：`@logixjs/query` 是 **Resource/StateTrait 的领域糖 + 最佳实践协议**，与 `@logixjs/form` 平行。

---

## 2. API Surface（最小集合）

### 2.1 Kernel（归属 `@logixjs/core`）

Query 与 Form 共享：

- `StateTrait`：`computed/source/link/check` + `node/list/$root`
- `TraitLifecycle`：通用桥接 helper（install/ref/scoped execute/cleanup）
- `Resource`：`Resource.make` / `Resource.layer` / keySchema 规范化 + keyHash 约束（见 004 data-model）

> Query 不要求 kernel 新增“query 专属 kind”。若出现需要，优先尝试把它表达为：
> - `source`：异步快照写回
> - `computed/check`：从快照派生 UI 视图或错误
> - `TraitLifecycle`：把 UI 事件桥接为触发/刷新/取消/清理

### 2.2 Query 领域包（归属 `@logixjs/query`）

建议的最小表面积（与 Form 对齐但不共享语义）：

- `Query.make(...)`：产出 QueryBlueprint（组合 Module + 默认 logics + traits/bridge wiring），作为业务侧默认入口（参见 `references/07-query-business-api.md`）
- `Query.traits(schema)(spec)`：可选语法糖，输出可 spread 的 `StateTraitSpec` 片段
- `Query.Ref`：Ref helper（可选择性 re-export `TraitLifecycle.Ref`，但语义属于 TraitLifecycle）
- `Query.Result`：结果视图 helper（从 ResourceSnapshot 提取 `data/error/loading`）
- `Query.Key`：key 组织最佳实践 helper（可选；也可只在文档给最佳实践，不做 API）
- `Query.TanStack`：TanStack Query 集成层（QueryClient 注入、fetchQuery/ensureQueryData 的 Effect 封装、invalidate helpers）
- （可选）`Query.install = TraitLifecycle.install`：为 DX 做 re-export，但所有权仍在 kernel

---

## 3. User Stories（Query 侧的真实人群）

### US-Q1 · 搜索页开发者（P1）

作为业务开发者，我希望：

- 输入（关键词/筛选条件/分页）变化时能自动触发请求，并处理竞态（只认最新）；
- 能一眼看懂“什么时候触发、为什么触发、为什么没触发、为什么被取消/丢弃”；
- 不需要在组件里手写一堆 `useEffect + abort + stale guard`。

### US-Q2 · 需要强缓存/复用的数据页（P1）

作为开发者，我希望：

- 同一个 QueryKey 在同一个 runtime 里能去重/复用（避免重复请求）；
- 能显式控制刷新与失效（invalidate/refetch）；
- 能把“缓存命中/失效原因”在 Devtools 上看清楚。

### US-Q3 · 架构师/平台维护者（P2）

作为维护者，我希望：

- Query 的行为仍落在 EffectOp Timeline 与 StatePatch 里，能回放；
- Query 的 IR 与 Form 共享 kernel 心智，未来扩展其它领域 trait 也有模板。

---

## 4. Functional Requirements（Query 侧的关键约束）

> 命名约定：本文件的 FR-Qxx 是“对齐 004 的补充规划”，主 spec 仍以 FR-xxx 为主；后续若把 Query 提升为独立 spec，可迁移这些条目。

- **FR-Q01 · Query 结果快照（ResourceSnapshot）**  
  Query 的异步结果 MUST 使用 `ResourceSnapshot`（或等价）落盘到 state（通常在 `state.*` 的某个字段），并满足：idle/loading/success/error 四态。

- **FR-Q02 · keySchema + keyHash（唯一相等性）**  
  Query 的去重、竞态丢弃（stale）、缓存索引 MUST 基于 `keySchema normalize + keyHash`，不得依赖对象引用相等或不稳定 stringify。

- **FR-Q02a · 缓存职责（TanStack Query）**  
  Query 的缓存与 in-flight 去重 SHOULD 由 TanStack Query 负责；Logix Runtime 不重复实现缓存层，仅在写回 state 时做 keyHash 门控（stale 丢弃）。

- **FR-Q03 · 触发策略（triggers + debounce）**  
  Query MUST 支持触发语义：
  - `onMount`：用于初始同步（已有参数时）
  - `onKeyChange`：参数变化触发（可 debounce）
  - `manual`：仅手动触发（独占）
  UI 层事件（onChange/onBlur/enter/submit）由 UI 适配层映射到“参数变化/手动触发”。

- **FR-Q04 · 并发策略（switch/exhaust）**  
  Query MUST 至少支持：
  - `switch`：只认最新（尽量取消旧请求；无法取消也必须 stale 丢弃）
  - `exhaust`：in-flight 合并触发（结束后补一次最新）

- **FR-Q05 · 缓存作用域（runtime 内唯一、跨 runtime 允许复用）**  
  resourceId 在同一 runtime 作用域 MUST 唯一；跨 runtime 允许复用同名 resourceId（不同实现不冲突）。这必须在文档上明确，避免误用。

- **FR-Q06 · 失效/刷新（invalidate/refetch）**  
  Query MUST 提供“可组合”的失效/刷新机制：可以按 `resourceId`、按 keyHash、按 tag/group（meta）触发刷新。  
  注意：这不要求新增 kernel kind；可通过 TraitLifecycle + ResourceRegistry + EffectOp middleware 实现。

补充：在“TanStack Query 作为缓存内核”的实现选择下，invalidate/refetch 的执行载体是 QueryClient（invalidateQueries/refetchQueries），Logix 只负责把其变成可回放的领域事件与可观测的 EffectOp。

- **FR-Q07 · UI 全双工（state.ui.query）**  
  Query 的交互态（例如 lastTriggeredBy、isAuto、submitCount、selection、pending params）SHOULD 进入 `state.ui`，以便可回放与 Devtools 解释。

---

## 5. Quickstart（见外链）

- 具体示例代码：`specs/004-trait-bridge-form/references/04-query-quickstart.md`

---

## 6. Data Model（见外链）

- Query 的核心实体（QueryKey/QuerySnapshot/InvalidateRequest）：`specs/004-trait-bridge-form/references/03-query-data-model.md`

---

## 7. TanStack Query 集成契约（见外链）

- `@logixjs/query` 与 TanStack Query 的职责边界与映射：`specs/004-trait-bridge-form/references/05-query-tanstack-integration.md`
