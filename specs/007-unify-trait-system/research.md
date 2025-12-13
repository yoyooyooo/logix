# Research: 007 Trait 系统统一（Form 形状 × Kernel 性能 × 可回放）

**Branch**: `007-unify-trait-system`  
**Source Spec**: `specs/007-unify-trait-system/spec.md`  
**Source Plan**: `specs/007-unify-trait-system/plan.md`

> 目标：把 007 的“对外行为约束”落到一组可实现、可验证、可交接的技术决策上，并为 Phase 1 的 `data-model.md` / `contracts/*` / `quickstart.md` 提供依据。

## 0. 现状盘点（代码事实）

- `packages/logix-core/src/state-trait.ts` 已有最小 DSL（`computed/source/link/build/install`），但当前：
  - `computed/source` 依赖字段并不要求显式声明，`StateTrait.build` 也不会为 computed/source 构建可用于最小触发的 deps；
  - `installComputed` 以 `onState((s) => s)` 监听全量 state，属于“全量重算”形态；
  - `installSource` 仅注册刷新入口，且直接写回 raw result，不具备快照状态机/竞态门控/并发策略。
- 事务主线已存在：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 提供 `begin/updateDraft/commit/abort`，具备“一次事务一次 SubscriptionRef 写入”的基础能力。

上述事实意味着：007 要求的“显式 deps → 依赖图 → 最小触发/反向闭包/诊断解释/回放重赛”仍需要在 StateTrait/Runtime 层做结构性升级；这与 006 的方向一致。

## 1. Decisions

### D01 — 显式依赖（deps）作为对外硬约束

**Decision**: 以 004/007 为准，`computed/source/check` 必须显式声明 `deps: FieldPath[]`；运行时 watcher/Graph/诊断解释仅以 deps 作为依赖事实源。  
**Rationale**: 可解释性、可生成性与“最小触发”都要求依赖边可被静态构建；避免从函数体/运行时访问轨迹反推依赖导致不可比对与不可回放。  
**Alternatives considered**:
- 动态依赖收集（运行时追踪 getAtPath）：实现复杂、可回放与可比对困难；
- 静态 AST 分析：对 TS/闭包/高阶函数脆弱，维护成本高。

### D02 — 依赖图（Dependency Graph）+ 反向闭包（Reverse Closure）

**Decision**: Graph 同时维护 forward edges 与 reverse adjacency；`validate(target)` 的最小执行集合 = `ReverseClosure(target)`（包含直接/间接依赖 target 的规则节点）。  
**Rationale**: scoped validate 的“绝对最小计算量”需要反向传播能力；reverse adjacency 是实现反向闭包与诊断解释的最小结构。  
**Alternatives considered**:
- 全量校验：无法满足 007 的最小触发与 10x 性能红线；
- 只跑 target 自身：无法覆盖联动链（computed→check 的级联）。

### D03 — Operation Window 0/1 次提交：事务 + 批处理

**Decision**: 以 `StateTransaction` 作为“单次操作窗口”的唯一提交边界；窗口内一切派生/校验/资源状态写回都写入事务草稿，最终 0/1 次对外提交。必要时对同一 microtask 内的触发做批处理合并。  
**Rationale**: 006 的一致性红线要求可观察提交次数可控；事务是统一收敛点，也是 Devtools 按 txn 聚合解释的基础。  
**Alternatives considered**:
- watcher 每步直接写 SubscriptionRef：会导致多次可观察提交，破坏 0/1 commit；
- 只靠 React 批处理：不可移植且无法覆盖非 React 消费者。

### D04 — 异步资源：快照状态机 + keyHash 门控 + 并发策略

**Decision**: source 写回统一为 `ResourceSnapshot` 状态机（idle/loading/success/error），并将“相等性/去重/竞态判断”的唯一依据固定为 `keySchema normalize → keyHash`；写回前必须做 stale 门控。并发策略至少支持：
- 默认“最新优先”（可选取消但不依赖取消，旧结果写回前必丢弃）；
- “单飞 trailing”（in-flight 期间抑制触发，记录最后一次，结束后补一次）。  
**Rationale**: 弱网/乱序返回下保证正确性与可回放；“取消能力”不可靠，必须以 keyHash 门控兜底。  
**Alternatives considered**:
- 以对象引用或 JSON.stringify 做相等性：不稳定且不可跨环境回放；
- 仅靠取消避免乱序：无法覆盖不可取消的 IO。

### D05 — keySelector 变空必须同步 idle 清空

**Decision**: 当 keySelector 结果为 `undefined`（禁用/无效 key）时，必须在同一次可观察更新中同步写回 `{ status: "idle", data: undefined, error: undefined }`（或等价语义），禁止延后到 microtask 导致 tearing。  
**Rationale**: React 并发渲染/订阅推送中会观察到非法中间态；同步清空是最小约束且易验证。  
**Alternatives considered**:
- microtask 异步置 idle：会产生 tearing 风险；
- 保留旧 data 但标记 disabled：语义复杂且容易引入第二套事实源。

### D06 — 数组虚拟身份层（Virtual Identity Layer）

**Decision**: 对外保持 index 语义（与 RHF 心智对齐），对内允许引入 RowID 映射层：Graph/缓存节点以 RowID 定位，index 变化只更新映射；并在 DSL 预留 `identityHint/trackBy` 以支持极端规模优化。  
**Rationale**: 同时满足“易用性（index）”与“性能稳定性（避免全量 cache miss）”。  
**Alternatives considered**:
- 对外改成稳定 id 语义：破坏既有心智与 004 目标；
- 不做虚拟层：头插/重排会导致大量无谓重算，难达 10x 指标。

### D07 — Query：外部查询引擎（默认 TanStack Query）+ Logix 语义兜底

**Decision**: Query 的缓存、in-flight 去重、重试/取消等请求层复杂度允许委托给外部引擎；默认采用 TanStack Query（`QueryObserver`）作为实现方案。Logix 侧仍必须负责：
- 触发语义（onMount/onValueChange/manual）与并发策略选择；
- keySchema/keyHash 规范化与写回 stale 门控；
- 产出可回放事件与可解释诊断（外部引擎行为不得成为事实源）。  
并且通过 effect 的 DI 注入外部引擎实例：`@logix/query` 暴露 `QueryClientTag` 并提供 `Query.layer(queryClient)`，由宿主在全局 Runtime Layer 注入。  
**Rationale**: 复用成熟引擎以降低工程成本，同时保住“可回放/可解释/生成友好”的核心价值。  
**Alternatives considered**:
- 手写缓存/去重引擎：成本高且偏离 007 目标；
- 只用 fetchQuery（无 Observer）：更像手写监听与触发，语义容易散落。

### D08 — Replay：重赛（re-emit）而非重发请求

**Decision**: Replay Mode 下不发真实网络请求；回放以事件日志中记录的资源结果与快照变化“重赛（re-emit）”为准，确保跨时间/弱网差异仍可复现。  
**Rationale**: 解决“回放悖论”，避免破坏外部系统与引入不可控环境差异。  
**Alternatives considered**:
- 回放时重新请求：无法复现历史 bug，且可能造成外部副作用。

### D09 — Schema 解码错误归属：errorMap 逃生舱

**Decision**: 在 `@logix/form` 提供 `errorMap: (schemaError) => FieldPath[]` 纯函数钩子，用于复杂 transform 无法自动逆向时将错误归属到具体字段集合。  
**Rationale**: “结构变形越复杂，责任越要下放”，否则错误无法稳定展示与回放。  
**Alternatives considered**:
- 仅自动映射：对复杂 transform 不可用；
- 运行时猜测归属：不可预测且不可测试。

### D10 — 包边界：Trait（内核）→ StateTrait（可选支点）→ Domain（Form/Query）→ UI

**Decision**: 维持分层：
- `@logix/core`：Trait/StateTrait 内核、Resource/事务/诊断/回放基础能力；
- `@logix/form` / `@logix/query`：领域 DSL + 默认 logics + helper（只编译到 kernel，不引入第二套运行时）；
- `@logix/react`：UI 适配（订阅投影 + 事件派发）；`@logix/form/react` 仅作为薄糖。  
**Rationale**: 保持 SRP 与可替换性，符合 007 的“链路分层 SSoT”。  
**Alternatives considered**:
- 领域能力塞进 core：会扩大 core 表面积、降低可替换性与可维护性。

### D11 — TraitLifecycle：Form/Query 的统一下沉接口

**Decision**: 将 “install / Ref / scoped validate / scoped execute / cleanup” 固化为 kernel 归属的 `TraitLifecycle`：Form 与 Query 的默认 logics 都必须基于它实现；领域包可以为 DX 做 re-export，但语义与演进所有权属于 kernel。  
**Rationale**: 让 Form 与 Query 共享同一套“下沉到 Trait IR 的桥接语义”，避免各领域各造一套 glue，确保诊断/回放口径一致且可维护。  
**Alternatives considered**:
- 每个领域包各自实现 install/refs/validate/cleanup：会导致语义漂移与调试成本指数级上升。

### D12 — 领域糖（Rules/Error/Result）必须可降解且不改变事实源

**Decision**: `Form.Rule.make` / `Form.Error.*` / `Query.Result` 等领域糖只负责“组织与可读性”，其产物必须可完全降解为 StateTraitSpec/Trait IR，并继续受同一套冲突检测、合并、诊断与回放口径约束；领域糖不得引入第二套 store/第二套状态事实源。  
**Rationale**: 业务侧需要高表达但稳定的 API，同时必须避免出现“Form 与 Store 何时同步”的双事实源难题。  
**Alternatives considered**:
- 直接要求业务写 StateTrait/Trait：门槛高且易写错；  
- 在领域糖中引入独立 store：会破坏可回放与长期维护性。
