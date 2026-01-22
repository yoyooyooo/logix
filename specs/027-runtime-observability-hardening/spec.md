# Feature Specification: 运行时可观测性加固（事务链路贯穿 + Devtools 事件聚合器性能/内存 + 快照订阅契约）

**Feature Branch**: `[027-runtime-observability-hardening]`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "修复事务队列边界导致的链路断裂、优化 Devtools 事件聚合器的性能与内存、并提供外部订阅安全的 DevtoolsSnapshot 接口"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 事务链路贯穿（跨入口可追踪） (Priority: P1)

作为运行时使用者/调试者，我希望一次业务触发在经过 Flow、回写与事务入队等边界后，仍能被同一条“可解释链路”关联起来，并继承调用点的诊断作用域（例如运行时标签、诊断分档、局部追加的输出通道），从而在 Devtools 与证据包中能稳定复盘“发生了什么、为何发生、影响了哪里”。

**Why this priority**: 若链路与作用域在队列边界断裂，Devtools/诊断就无法建立因果链，问题定位会退化为“靠猜”，直接影响可诊断性这一核心能力。

**Independent Test**: 构造一个最小场景：从单次触发开始产生多笔入队事务与可观测事件；验证这些事件可以被同一链路聚合，并且调用点设置的局部诊断作用域对入队事务仍生效。

**Acceptance Scenarios**:

1. **Given** 已启用诊断采集，且存在一条已建立的链路，**When** 该链路触发入队事务并产生一组可观测事件，**Then** 事件应可被稳定归入同一条链路（不会“另起炉灶”或丢失关联）。
2. **Given** 调用点局部追加了诊断作用域（例如附加输出通道/标签），**When** 入队事务执行并发出事件，**Then** 这些局部配置对事件生效，且不会污染其他并行作用域。

---

### User Story 2 - Devtools 事件聚合器在高频事件下保持可用 (Priority: P2)

作为使用 Devtools 的开发者，我希望在高频输入/渲染/Flow 触发导致事件密集写入时，Devtools 事件聚合器的“事件窗口”不会因为窗口满而产生持续抖动或明显资源峰值，避免“为了诊断而拖垮业务”。

**Why this priority**: Devtools 需要在最坏情况下也可用；否则高频场景下诊断会成为性能噪音源，反向降低可解释性与信任度。

**Independent Test**: 生成稳定的高频事件流，在窗口已满时继续写入；对比不同窗口大小下的单位事件写入成本与整体耗时，验证写入开销不随窗口大小线性恶化。

**Acceptance Scenarios**:

1. **Given** 事件窗口已满，**When** 继续写入新事件，**Then** 窗口始终只保留最近 N 条事件且写入成本保持稳定（不随 N 增长而显著上升）。
2. **Given** 动态调整事件窗口大小，**When** 缩小或放大窗口，**Then** 事件窗口与订阅通知保持一致性，且不会出现明显长时间卡顿。

---

### User Story 3 - 长时间运行无泄漏 + 快照订阅契约不丢更新 (Priority: P3)

作为长时间运行的应用开发者/Devtools UI 开发者，我希望 Devtools 事件聚合器在模块实例被销毁后能回收与该实例相关的派生缓存，避免内存随历史实例累积；同时，消费方使用“基于快照变化检测更新”的订阅机制时，不会因为快照对象引用恒定而漏更新。

**Why this priority**: 内存泄漏会在长会话/自动化回归中逐步放大并掩盖真实问题；订阅漏更新会导致 UI 视图与事实源脱节，使诊断结论不可靠。

**Independent Test**: 反复创建/销毁大量实例，观察快照缓存规模是否随活跃实例收敛；同时模拟一个仅依赖“变更指示”判断是否重读快照的订阅者，验证不会漏更新。

**Acceptance Scenarios**:

1. **Given** 同一模块反复创建/销毁实例，**When** 实例销毁，**Then** 与该实例相关的最新状态/摘要缓存应被回收，缓存规模与当前活跃实例同阶。
2. **Given** 订阅者仅依赖快照的变更指示判断是否需要更新，**When** Devtools 事件聚合器发生对外可见的快照变化，**Then** 订阅者能可靠收到通知并观察到更新（允许合并通知，但不得静默丢失）。

---

### Edge Cases

- Devtools/诊断关闭或处于最低分档时：仍需保持最小计数/标签正确，且新增机制不引入明显额外开销。
- 事件序列与实例销毁交错：销毁后可能仍有迟到事件/重放事件到达；允许事件进入窗口用于回放，但不得重新创建已回收的 per-instance 派生缓存，且必须保持确定性与可解释性。
- runtimeLabel 未提供或为空：聚合键仍应可预测（例如统一归类到 “unknown”）。
- 事件窗口大小为 0 或极小：系统应允许禁用窗口或退化为最小信息保留，不应导致异常或订阅死循环。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统必须在“事务入队 → 执行”的边界传播调用点诊断作用域（最少包含：链路标识、运行时标签、诊断分档、调用点局部追加的输出通道），并确保其在入队事务执行期间生效。
- **FR-002**: 当入队事务由某条已存在链路触发时，该事务产生的可观测事件必须归入同一链路；若无现有链路，系统必须生成新的链路标识并在该事务内保持一致。新增链路标识必须满足确定性与可回放：在同一 instance 内可由单调序号等稳定信息重建；禁止默认用随机数/时间戳作为唯一 id 源。
- **FR-003**: 调用点局部追加的诊断输出通道（例如 sinks/标签）必须对入队事务执行期间产生的事件生效，且不得污染其他并行作用域。
- **FR-004**: Devtools 事件聚合器必须维护一个有界“最近事件窗口”，并保证在窗口已满时追加与淘汰单条事件的均摊开销与窗口大小无关。
- **FR-005**: Devtools 事件聚合器必须在模块实例销毁后回收与该实例相关的“最新状态/摘要”等派生缓存，防止随历史实例无限增长。
- **FR-006**: Devtools 事件聚合器必须提供明确的“快照变更检测契约”，使订阅者即使在快照对象引用不变的情况下，也能可靠判断快照已发生对外可见变化（例如通过单调递增的变更令牌/版本号）。对外可见变化至少包括：事件窗口内容变化、实例计数变化、per-instance 最新状态/摘要变化、导出预算计数变化、实例标签等调试展示索引变化，以及清空窗口/切换 run/调整窗口大小等控制操作造成的视图变化。
- **FR-007**: Devtools 事件聚合器的订阅通知必须与快照变更一致：每次对外可见的快照内容发生变化时，订阅者必须至少收到一次通知（允许合并/节流，但不得永远不通知）。若提供变更令牌/版本号，则每次对外可见变化必须推动令牌单调变化；订阅通知允许合并，但不得出现“令牌已变化而订阅者永远不被通知”的情况。反向不变量同样成立：当令牌未变化时，快照的对外可见字段不得发生变化（避免外部订阅出现 tearing）。
- **FR-008**: Devtools/证据导出的事件与元数据必须保持可序列化且有上界控制，避免单条事件过大或无限累积导致崩溃/不可导出。

**Acceptance mapping**:

- User Story 1 覆盖：FR-001 – FR-003
- User Story 2 覆盖：FR-004、FR-008
- User Story 3 覆盖：FR-005 – FR-007

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 系统必须为受影响的高频路径（事务入队、事件记录、快照派生/清理）定义性能预算，并在实现前后记录可复现实验的基线数据（吞吐、延迟分位、内存曲线）。
- **NFR-002**: 当诊断关闭或处于最低分档时，本特性新增的上下文传播与缓存维护必须接近零额外开销，不得让高频路径退化为需要大对象拷贝/持续线性扫描。
- **NFR-003**: 诊断与回放面上的实例/事务/链路标识必须是确定性的、可回放/可对比的（禁止默认随机/时间作为唯一身份）。
- **NFR-004**: 系统必须维持同步事务窗口边界：事务窗口内禁止任何异步边界与外部 IO；任何需要 IO 的长链路必须通过多入口事务模式完成，避免死锁与不可解释链路断点。
- **NFR-005**: 本特性引入或调整的 Devtools 快照/订阅契约必须有明确文档：哪些字段是“窗口内视图”、哪些字段是“累计计数”，以及通知合并策略可能带来的观察延迟上界。
- **NFR-006**: 若需要跨模块/跨作用域传播诊断上下文或收敛缓存，应通过显式可注入的契约表达，并支持在测试中以最小依赖替换/模拟；对外导出应保持 slim 且可序列化，便于离线复盘。

### Assumptions

- 本特性不改变业务语义：状态结果、事务顺序与错误语义保持不变，仅提升可观测性与资源可控性。
- Devtools 事件聚合器仍可作为全局聚合器存在，但其内部缓存与窗口必须可控且可回收。

### Dependencies

- 依赖运行时已有的“链路标识/运行时标签/诊断分档”概念，并能被 Devtools/证据导出消费。
- 依赖现有的事件投影/裁剪能力以满足“可序列化 + 有上界”的约束。

### Key Entities _(include if feature involves data)_

- **链路标识（LinkId）**: 用于把一次触发产生的多笔边界操作/事务/事件串成同一条可解释链路的稳定标识。
- **诊断作用域（Diagnostics Scope）**: 调用点对运行时标签、诊断分档、输出通道等的局部配置集合。
- **DevtoolsSnapshot**: 面向调试 UI 的聚合视图，包含活跃实例计数、最近事件窗口、以及每实例的最新状态/摘要等派生视图。
- **快照变更令牌（Snapshot Token）**: 单调变化的轻量值，订阅者可用其判断快照是否发生对外可见变化。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在覆盖“单次触发 → 入队事务 → 状态提交 → 事件采集”的验收用例中，链路聚合正确率达到 100%（同一触发链路的事件均可稳定归入同一链路标识）。
- **SC-002**: 在合成负载中写入 100,000 条事件时，当事件窗口大小从 500 提升到 5,000，总写入耗时增长不超过 10%（体现“与窗口大小无关”的目标）。
- **SC-003**: 在反复创建/销毁 10,000 个模块实例的场景中，Devtools 事件聚合器的 per-instance 派生缓存条目数不会随历史实例线性增长，并在销毁后收敛到与当前活跃实例同阶。
- **SC-004**: 对于任何导致快照对外可见变化的操作（新增事件、最新状态变化、实例计数变化、清空窗口等），订阅者至少收到一次通知；基于变更令牌/版本号判断的订阅者漏更率为 0%。
- **SC-005**: 在 Devtools/诊断关闭或最低分档下，高频入口调用（例如 dispatch）吞吐相对基线回归不超过 2%。
- **SC-006**: 导出的证据包可被序列化与离线解析，且能从任一事务/边界事件回溯到其触发来源与链路标识（覆盖核心诊断字段）。
