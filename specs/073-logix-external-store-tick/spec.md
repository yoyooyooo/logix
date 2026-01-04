# Feature Specification: ExternalStore + TickScheduler（跨外部源/跨模块强一致，无 tearing）

**Feature Branch**: `073-logix-external-store-tick`  
**Created**: 2026-01-04  
**Status**: Draft  
**Input**: 来自 Router/Query 集成讨论（“ABCD 多外部源依赖”“Logix-as-React”“避免 tearing”）的裁决收敛：同时推进 Level 1（模块内强一致 ExternalStore Trait）与 Level 2（跨模块 TickScheduler + React 单一订阅点）。

## Context

当前 Logix 在“外部数据源接入 + 多模块依赖”的一致性上存在两个结构性短板：

1. **外部推送源接入仍偏胶水**：典型写法是 `$.use(Service)` + `$.on(service.changes).mutate(...)` 把外部事件写回 state；再通过 `$.onState(...).runFork(() => $.traits.source.refresh(...))` 触发下游 source/query。写法可行但模板代码多、依赖图不可解释、且容易出现初始化竞态（`getSnapshot` 与订阅之间漏事件）。
2. **React 侧“多 ExternalStore”导致跨模块 tearing**：当前 `@logix/react` 是“每个 ModuleRuntime 一个 ExternalStore”，组件同时读多个模块时可能在同一 render/commit 中观察到不同步的快照（跨模块 tearing）。这会破坏 “Route → State → Query” 等链路的心智一致性，也让 Devtools 的 causal chain 不稳定。

本特性目标是把 Logix 推进到 “logic like react”：外部源接入/跨模块联动/React 渲染一致性都统一归一化到 **Tick** 这个调度与解释单位。

## Goals / Scope

### In Scope

- **Level 1（模块内强一致）**：引入统一的外部输入抽象 `ExternalStore<T>`，并提供 `StateTrait.externalStore` 将其 declaratively 接入 State Graph（可参与 txn 窗口的收敛、可诊断、可复放）。
- **Level 2（跨模块强一致 + React 无 tearing）**：引入 Runtime 级 `TickScheduler` 与 `RuntimeStore`（单一订阅点），保证一次 React render 读取到的多个模块状态来自同一个 tick 快照（无 tearing=同 tickSeq 快照一致）；并提供可解释的 tick 诊断与预算/降级策略。

### Out of Scope

- 跨进程/跨 Tab 的一致性（例如 BroadcastChannel 同步）。
- 将任意“黑盒 Effect/Process.link”提升为强一致：黑盒仍允许存在，但强一致模式只对 declarative IR 生效；若存量业务依赖黑盒在同 microtask 内同步生效，该行为不再保证，属于 breaking（见 migration）。
- 在同步事务窗口内执行 IO（严格禁止）。
- 不提供 SSR 的“自动注水/序列化/rehydrate”工具链；但本特性提供 SSR 所需的最小契约（`ExternalStore.getServerSnapshot`）与对应 React 适配口径，宿主需自行保证 server/client 初始快照一致以避免 hydration mismatch。

## Terminology

- **ExternalStore<T>**：可同步读取 current snapshot 且可订阅变化的外部输入源（对齐 React `useSyncExternalStore` 心智）。
- **ExternalStore Sugar**：把 service / SubscriptionRef / Stream 等形态归一到 ExternalStore 的便捷构造器。
- **StateTrait.externalStore**：StateTrait 的一种 entry，声明“某个 state fieldPath 的值来自某个 ExternalStore<T>”。
- **Tick**：一次运行时一致性批次（默认以 microtask 为边界），从“外部输入/dispatch/trait 派生/跨模块 declarative link”收敛到一次对外可观察的 flush。
- **TickScheduler**：Runtime 级调度器，负责合并/排序/稳定化（fixpoint）并产出 tick 诊断证据。
- **Lane（urgent/nonUrgent）**：TickScheduler 的内部优先级通道。**urgent** 用于输入/交互等必须尽快 flush 的更新；**nonUrgent** 用于可延后/可合并的派生与后台更新，预算超限时允许推迟到后续 tick。
- **RuntimeStore**：React 订阅的唯一 ExternalStore；其 snapshot 包含 `tickSeq` 与各模块快照视图。
- **tickSeq**：单调递增、稳定的 tick 标识（不允许随机/时间默认），用于跨模块/跨诊断事件关联。
- **ModuleInstanceKey**：`${moduleId}::${instanceId}`，用于分片订阅与诊断锚点（单例只是 instanceId 固定的特例）。

## Clarifications

### Session 2026-01-04（plan-deep auto-resolve）

- AUTO: Q: 引入 RuntimeStore 后，React 订阅是否可以直接订阅“全局 store”？ → A: 不允许；必须通过 `RuntimeStore.topic(topicKey)` facade 做分片订阅（至少按 `ModuleInstanceKey`），避免跨模块 O(N) selector 执行。
- AUTO: Q: topic facade 是否会增加内存压力？ → A: 只在存在订阅者时分配；按 `(runtime, topicKey)` 缓存；listeners=0 必须 detach + `Map.delete`；更细粒度 topic（如 `readsDigest`）必须有上限策略（LRU/按需存在）。
- AUTO: Q: module 的单例/多例在订阅分片上如何处理？ → A: topicKey 必含 `instanceId`（即 `ModuleInstanceKey`）；单例只是 “instanceId 固定的特例”。
- AUTO: Q: ExternalStore 的 `getSnapshot()` 是否允许做 coalesce/延迟？ → A: 不允许；`getSnapshot()` 永远返回 raw current；coalesce 必须在 ExternalStoreTrait 写回层实现（pending/raw 与 committed 分离），并保证 committed 才能进入 state/RuntimeStore snapshot（避免“未 notify 但可观测值已变”的 tearing）。
- AUTO: Q: TickScheduler 软降级是否意味着放弃强一致？ → A: 超预算仅推迟 nonUrgent backlog，urgent 必须当 tick flush；本次 tick 允许 partial fixpoint，但必须通过 `trace:tick.result.stable=false`（或等价字段）可解释。
- AUTO: Q: `retainedHeapDeltaBytesAfterGc` 的门禁含义？ → A: 限制常驻增长（泄漏/缓存膨胀）；若要限制分配率/GC 压力，另加 `allocatedBytes`/`peakHeapDeltaBeforeGc` 等指标（可选）。
- AUTO: Q: blackbox `Process.link` 与 declarative IR 的一致性边界？ → A: strong consistency 仅对 declarative IR 生效；blackbox 写入为 Next Tick best-effort，并必须可解释标注边界。
- AUTO: Q: 同一模块内无关字段变化是否会触发模块内 O(N) selector re-run？ → A: ReadQuery static lane 允许按 `selectorId/readsDigest` 进一步分片；dynamic selector 回退到 module-level topic，并用 `useSyncExternalStoreWithSelector` 的 equality 兜底正确性（不承诺零开销）。
- AUTO: Q: Root Reset 与 external-owned 字段冲突如何处理？ → A: Root Reset 不直接覆盖 external-owned 字段；externalStore trait 以当前 `getSnapshot()` 为准保持外部值（避免 reset 写入逃逸与 UI 闪烁）。
- AUTO: Q: 高频外部 emit 是否会导致队列风暴/任务积压？ → A: ExternalStore 的 listener 必须是 **Signal Dirty（Pull-based）**：幂等地点亮 dirty 并确保同一 microtask 内最多调度一次 tick；tick flush 时统一 `getSnapshot()` pull 最新 raw（不得把每次 emit 变成 payload task 入队）。
- AUTO: Q: `ExternalStore.fromStream` 若缺少 `initial/current`，是 Type Error 还是 Runtime Error？ → A: 必须 fail-fast 为 **Runtime Error**（TS 仅作辅助）。
- AUTO: Q: `Runtime.batch(...)` 是否允许 async/await 观察中间态？ → A: 不支持；batch 仅作为同步边界，扁平化语义只在 outermost 结束时 flush（文档警告）。
- AUTO: Q: nonUrgent external input 因降级被推迟时是否有提示？ → A: diagnostics=light/full 必须给出显式 Warn 证据（tick/deferred 摘要 + primary sample）；diagnostics=off 不引入成本。
- AUTO: Q: `ExternalStore.fromSubscriptionRef(ref)` 是否允许副作用/IO？ → A: 不允许；`getSnapshot()` 必须纯读、无 IO；fromSubscriptionRef 仅适用于纯 ref（否则视为 defect/不支持）。
- AUTO: Q: SSR 下 `getServerSnapshot` 未提供时默认行为？ → A: React adapter 使用 `getServerSnapshot ?? getSnapshot` 作为 server snapshot（fallback；宿主负责 hydration 一致性）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 多外部源驱动下游 source/query，UI 无 tearing (Priority: P1)

作为业务开发者，我希望在同一 Runtime 中接入多个外部源（推送/拉取混合），并形成依赖链（例如 `A/B/C → D(query/source)`），在 React UI 同时读取 A 与 D 时不出现 tearing 或“中间态闪动”。

**Why this priority**: 这是“Logix-as-React”的核心用户价值；如果 UI 仍会 tearing，整个强一致推进失去意义。

**Independent Test**: 在一个最小 React demo 中，用 `ExternalStore.fromStream({ initial })` 或 `fromSubscriptionRef` 模拟外部推送 A/B/C；D 通过 `StateTrait.source` 依赖 `inputs` 计算 key 并刷新。组件同时 `useSelector(A)` 与 `useSelector(D)`，外部源快速变化时 UI 始终只看到“同 tick 的一致组合”。

**Acceptance Scenarios**:

1. **Given** 组件在一次 render 中同时读取 `inputs` 与 `dResource`，**When** 外部源 A/B/C 在同一 microtask 内连发多次变更，**Then** 该 commit 中 `inputs` 与 `dResource.status/keyHash` 必须来自同一 `tickSeq`，不允许出现旧 D + 新 inputs 的 tearing 组合。
2. **Given** `dResource.key` 在某次变更后变为 `undefined`（失活），**When** tick 收敛，**Then** 同一次可观察 flush 中 `dResource` 必须同步回收到 idle（清空 data/error），不得延后到下一次 tick。

---

### User Story 2 - 外部输入接入是 declarative 的，且初始化无竞态 (Priority: P1)

作为 Logix 模块作者，我希望把外部推送源接入 state 的过程从“手写订阅胶水”升级为 `StateTrait.externalStore` 声明：初始化与订阅建立是原子语义，不会在 `getSnapshot()` 与 subscribe 之间漏事件。

**Why this priority**: 这是把外部源纳入 State Graph 的前提，否则强一致只能停留在“最佳实践”层面。

**Independent Test**: 构造一个会在订阅建立前立刻 emit 的外部源，验证接入后模块 state 不丢第一帧更新，且 commit 次数满足 0/1 语义。

**Acceptance Scenarios**:

1. **Given** `StateTrait.externalStore` 已安装，**When** 首次订阅发生在 `getSnapshot()` 之后且中间外部源发生一次变更，**Then** 模块必须能观测到该变更（不漏事件），且对外最多产生一次额外 notify。

---

### User Story 3 - 超预算/循环时软降级，但必须可解释 (Priority: P2)

作为平台/维护者，我希望当跨模块依赖导致 tick 稳定化超过预算（时间/步数/事务次数）时，系统可以软降级避免卡死，但必须产出 Slim、可序列化的诊断证据，Devtools 能解释“为什么这次没有完全稳定化”。

**Why this priority**: 强一致引入调度复杂度，必须具备可诊断与可回归的证据闭环，否则不可运营。

**Independent Test**: 构造一个带环的 declarative link（或故意抖动的 external input），触发预算门槛，验证降级策略与 `trace:tick` 证据输出。

**Acceptance Scenarios**:

1. **Given** tick 稳定化超过预算，**When** flush 发生，**Then** 必须记录 `trace:tick`（含 `tickSeq`、预算口径、降级原因、剩余 backlog 指标），且在 diagnostics 关闭时不引入可观测开销。
2. **Given** tick 因预算超限推迟了 nonUrgent backlog（例如跨模块联动/派生），**When** 本次 flush 对外可观察，**Then** 允许暴露 **partial fixpoint**（例如 A(新)+B(旧)），但必须在 `trace:tick.result.stable=false`（或等价字段）中显式标注，并保证后续 tick 继续追赶直到最终一致（除非持续超预算，需持续给出可解释证据）。

### Edge Cases

- Stream 语法糖：若仅提供 `Stream<T>` 且无 `initial/current`，必须 fail-fast 并提示替代写法（否则无法提供同步 `getSnapshot()`）。
- Stream 语法糖（stale start）：`fromStream(..., { initial })` 的 `initial` 可能因订阅时序而过期；必须在 quickstart/contracts 中显式警告，并推荐优先用 `fromService/fromSubscriptionRef` 获得可靠 current。
- 多个 externalStore 同时更新：需要 coalesce 策略，确保最终一次 flush 的稳定化可达（并有预算/证据）。
- 跨模块依赖环：必须有检测与软降级策略（不允许无限 tick/死循环）。
- 高频 push：允许通过 `equals`/`coalesceWindowMs` 降低 UI jitter，但不得导致“token 已变化而永远不通知”。
- Ownership：`StateTrait.externalStore` 写回的目标字段视为 **external-owned**；禁止业务 action/source 等并发写入同一路径（如需 override，使用独立字段 + computed 合并）。
- Legacy link：黑盒 `Process.link` 的写入不进入同 tick 的稳定化承诺；强一致只覆盖 declarative IR，黑盒写入视为 **Next Tick**（best-effort）。

## Requirements _(mandatory)_

### Functional Requirements

#### Level 1：ExternalStore + StateTrait.externalStore

- **FR-001**: 系统 MUST 定义 `ExternalStore<T>` 的归一化契约：`getSnapshot(): T`（同步、无 IO）+ `subscribe(listener): () => void`（或等价 Stream 形态）；为 SSR/Hydration 提供可选 `getServerSnapshot(): T`（同步、无 IO）。若 `getSnapshot()` 同步抛错，Runtime MUST 熔断该 trait（保留 last committed 值并记录诊断），不得崩溃整个 Runtime。
- **FR-002**: 系统 MUST 提供 ExternalStore 的构造语法糖：
  - fromService（Tag + mapping）
  - fromSubscriptionRef（或等价；ref 的读取必须是同步纯读、无 IO/副作用；否则不支持）
  - fromStream（必须显式提供 `initial/current`，否则以 Runtime Error fail-fast；并必须警告 `initial` 可能 stale，推荐优先使用可提供 current 的形态）
- **FR-003**: 系统 MUST 提供 `StateTrait.externalStore`，支持将 `ExternalStore<T>` 声明式写回到指定 `StateFieldPath`，并支持 `select/equals`（避免高频抖动）；同时 MUST 定义写回字段的 ownership：目标字段为 **external-owned**，除 externalStore trait 写回外禁止其它写入路径并发修改同一路径（冲突必须 fail-fast，并给出替代模式：独立字段 + computed 合并）。
- **FR-004**: `StateTrait.externalStore` 的安装 MUST 保证初始化与订阅建立的原子语义：不得在 `getSnapshot` 与 subscribe 之间漏事件。
- **FR-005**: 外部输入写回 MUST 遵守事务窗口边界：写回发生在同步事务窗口内（可收敛 computed/link/check），不得在事务窗口内执行 IO/异步阻塞。

#### Level 2：TickScheduler + RuntimeStore（React 无 tearing）

- **FR-006**: 系统 MUST 引入 Runtime 级 TickScheduler，以 microtask 为默认 tick 边界，并支持显式 `Runtime.batch(...)` 作为更强边界。
- **FR-007**: 系统 MUST 提供 RuntimeStore 作为 **单一 snapshot 真理源**；React 侧 MUST 通过 topic-keyed ExternalStore facades 做分片订阅（至少按 `ModuleInstanceKey`；可选按 `ReadQueryStaticIr.readsDigest` 进一步细分），避免全局 O(N) 通知风暴；同一次 render 读取多个模块时 MUST 无 tearing（来自同一 tick 快照），且 snapshot 仍以同一 `tickSeq` 作为唯一一致性锚点。
- **FR-008**: Tick MUST 具备稳定标识 `tickSeq`，并能与模块内 `txnSeq/opSeq` 建立关联，用于诊断与回放链路。
- **FR-009**: 系统 MUST 提供 “强一致可识别”的跨模块 declarative 依赖表达（Declarative Link IR），并定义其与黑盒 `Process.link` 的语义边界：强一致仅对 declarative IR 生效；DeclarativeLinkIR 的写侧 MUST 可追踪且受限（只允许 `dispatch`，禁止 direct state write），且黑盒 `Process.link` 的写入不进入同 tick fixpoint（视为 Next Tick best-effort）。
- **FR-010**: 系统 MUST 定义 tick 稳定化（fixpoint）语义：同一 tick 内同步队列 drain 到空；超预算必须软降级但可解释（允许暴露 partial fixpoint，强一致降级为最终一致性，并必须通过 `trace:tick.result.stable=false` 或等价字段标注；必须避免无限循环冻结 UI（循环/超限时允许安全中断）；Devtools 默认呈现为 Warn）。
- **FR-011**: 系统 MUST 定义 Lane 的判定与对外入口：默认把输入/交互触发的 `dispatch/setState` 与 ExternalStoreTrait 写回视为 **urgent**；允许通过显式 API（如 `dispatchLowPriority`）与 `StateTrait.externalStore({ priority: "nonUrgent" })` 将“可延后”的链路降级为 **nonUrgent**。预算降级只允许推迟 nonUrgent backlog，urgent 不得被推迟。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 Runtime 核心路径（事务/订阅/React），MUST 建立可复现的性能基线与回归门禁：至少覆盖 tick flush、externalStore ingest、React notify 三条路径（diagnostics off/on 对比）。
- **NFR-002**: 诊断事件 MUST Slim 且可序列化；当 diagnostics/devtools 关闭时，新增开销应接近零（不引入常态对象分配/深拷贝）。
- **NFR-003**: 所有新增标识（tickSeq 等）MUST 去随机化：稳定、单调、可关联（禁止随机/时间默认）。
- **NFR-004**: 必须保持“事务窗口禁止 IO”；任何违反都必须在 plan.md 的 Constitution Check 中显式 ERROR 并给出替代设计。
- **NFR-005**: 若引入预算/自动调度策略（tick 稳定化、coalesce 等），MUST 提供可解释证据（事件 + 字段口径）与“优化阶梯”文档（默认 → 观察 → 收敛 deps/selector → 调参/拆分）。
- **NFR-006**: 若需要跨模块协作协议（tick/IR/link），MUST 封装为显式可注入的 Runtime Services，并可为测试提供 Mock/Stub。
- **NFR-007**: 若产生破坏性变更（例如 React 订阅模型从 per-module → runtime-store），MUST 提供迁移说明（forward-only：无兼容层/无弃用期）。
- **NFR-008**: RuntimeStore 的 topic facade 缓存 MUST 有界且可回收：facade 只在存在订阅者时存在；listeners=0 必须 detach 并从 cache 移除；更细粒度 topic（如 readsDigest）必须有上限策略（如 LRU/按需存在），并通过 `retainedHeapDeltaBytesAfterGc` 回归门禁守护。

### Key Entities _(include if feature involves data)_

- **ExternalStore<T>**: 外部输入源归一化接口（sync snapshot + subscribe）。
- **ExternalStoreTrait**: `StateTrait.externalStore` 的 trait entry（含写回 fieldPath、select/equals、诊断元数据）。
- **Tick / TickSeq**: Runtime 一致性批次与稳定标识。
- **RuntimeSnapshot**: RuntimeStore 对外暴露的快照视图（含 tickSeq + per-module snapshot 视图）。
- **DeclarativeLinkIR**: 可被 TickScheduler 识别与稳定化的跨模块依赖 IR（对齐 ReadQuery/static deps）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: React demo（多模块同时读取）在外部源高频更新下无 tearing：同一 commit 内观察到的模块快照 `tickSeq` 必须一致（自动化测试可断言）。
- **SC-002**: tickSeq 单调递增且可关联：任意 `trace:tick` 能关联到至少一个模块 txn 事件（或明确 “no-op tick”）。
- **SC-003**: 超预算时软降级可解释：必须产出结构化 evidence（预算口径、剩余 backlog、降级原因），且能在 Devtools 中展示为可解释链路。
- **SC-004**: diagnostics off 时性能回归门禁：tick flush + notify 的平均开销与分配满足预算（预算数值在 `plan.md#Perf Evidence Plan` 固化）。
