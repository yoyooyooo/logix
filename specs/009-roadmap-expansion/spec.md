# Feature Specification: 事务 Patch/Dirty-set 一等公民

**Feature Branch**: `[009-roadmap-expansion]`  
**Created**: 2025-12-15  
**Status**: Draft  
**Input**: User description: "好现在我们把 docs/reviews/99-roadmap-and-breaking-changes.md 展开细节，梳理一个新需求"

## User Scenarios & Testing *(mandatory)*

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

### User Story 1 - 事务增量化（只做必要工作） (Priority: P1)

作为业务模块作者/运行时使用者，我希望每次事务更新都能生成字段级的 `dirty-set`（必要时可附带 `patch`），从而让运行时只对“受影响的派生/校验/刷新”做增量计算，避免因为小改动触发全量收敛，且不会引入额外的负优化。

**Why this priority**: 这是把性能压力压到最低的核心支点；没有 Patch/Dirty-set，后续的 trait/事务体系、React 批处理、Devtools 因果分析都会退化为“全量扫描 + 事后猜测”。

**Independent Test**: 在一个包含多条派生/校验步骤的模块中，只更新一个字段，系统能证明：只执行受影响步骤，并输出对应的 dirty-set（以及可选 patch）；当更新触发“未知写入/无法精确定位”时，系统必须显式降级并可解释原因。

**Acceptance Scenarios**:

1. **Given** 某事务只写入 `profile.name`，且存在 100 个派生/校验步骤，**When** 提交事务，**Then** 运行时只执行依赖 `profile.*` 的步骤（或其父根），不会执行无关步骤。
2. **Given** 某写入无法推导精确路径（例如“未知写入”），**When** 提交事务，**Then** 运行时必须显式标记为“dirtyAll/全量收敛（可解释）”，并给出导致降级的来源信息。

---

### User Story 2 - 统一最小 IR（可合并、可冲突检测） (Priority: P2)

作为平台/Devtools/Alignment Lab 的集成者，我希望事务的增量信息能够 100% 降解为统一的最小 IR（Static IR + Dynamic Trace），并支持一致的冲突检测与合并（例如路径重复定义、覆盖优先级、单写者规则），从而让平台只认 IR 而不依赖并行真相源。

**Why this priority**: 没有统一 IR，平台/工具链将无法稳定消费（尤其是“全双工”场景的回放与解释）；同时也无法做可靠的冲突检测与合并。

**Independent Test**: 通过静态声明构建一份最小 Static IR，并在运行时产生 Dynamic Trace；对任意一次事务，IR 侧能够复现 dirty-set 与 patch（若启用），并能对冲突/重复写入给出确定性裁决。

**Acceptance Scenarios**:

1. **Given** 两个规则/trait 写入同一路径，**When** 构建 Static IR，**Then** 必须稳定失败或给出明确的覆盖优先级裁决（不可“看谁先跑就算谁赢”）。
2. **Given** 一次事务产生 dirty-set（以及可选 patch），**When** 输出 Dynamic Trace，**Then** trace 中包含稳定标识与输入/变更快照，使平台可回放与解释。

---

### User Story 3 - 可诊断且低开销（默认不拖慢） (Priority: P3)

作为开发者与运行时维护者，我希望每次事务的“派生/刷新/丢弃”都能提供：稳定标识、触发原因、输入快照、状态变更记录；且在关闭诊断时几乎零额外成本，从而既能把性能压到最低，也能解释“为什么发生”。

**Why this priority**: 事务与 trait 的增量化一旦出错，会导致极难排查的“缺更新/多更新/串因果”；必须把解释链路变成默认能力，同时保证不开诊断时不负优化。

**Independent Test**: 对同一事务分别在“诊断关闭/诊断开启（full）”运行，关闭时开销接近基线，开启时能输出完整可序列化 trace，且能把每个执行步骤与原因关联起来。

**Acceptance Scenarios**:

1. **Given** 事务触发了若干派生/刷新步骤，**When** 开启诊断并查看 trace，**Then** 每个步骤都能解释“由哪个 dirty-root/依赖触发”，并能定位到输入/变更记录。

---

### User Story 4 - 变更前后性能可对比（基线与极限） (Priority: P4)

作为运行时维护者，我希望在改造 Patch/Dirty-set/增量调度相关热路径之前，就准备好可复现的性能基线（Before）与压力极限（Worst-case/Limit），并在改造后用同一套脚本/用例对比出差异，从而避免“追求增量化却引入负优化”。

**Why this priority**: 本特性会触及事务提交与 trait converge 的核心路径；没有基线与极限用例，任何“更快/更慢”的结论都不可复现，也无法指导进一步的优化取舍。

**Independent Test**: 在同一台机器、同一 Node 版本下，用同一套脚本分别记录 Before/After 的结果，输出包含至少一类可量化指标（耗时/执行步数/分配），并能稳定重跑获得接近的中位数结果。

**Acceptance Scenarios**:

1. **Given** 存在一套覆盖典型场景与极限场景的基准脚本/测试用例，**When** 在改造前运行，**Then** 会记录可复现的 Before 基线（含运行环境元信息）。
2. **Given** 同一套脚本在改造后再次运行，**When** 对比 Before/After，**Then** 能明确指出关键指标差异，并对“是否回归/是否达到目标”给出可判定结论。

---

### Edge Cases

- dirty-set 过粗或过多：是否应触发“全量收敛”降级阀门以避免过滤本身负优化？
- 同一事务内对同一路径多次写入：patch 合并与最终值定义是什么？
- 列表/动态行（例如 items[]）更新：dirty-root 的归一化口径如何保证既正确又不退化？
- 关闭诊断时：哪些最小信息仍必须保留以保证正确性（例如 dirty-set 作为调度输入）？
- 基准脚本结果波动：如何以“重复运行取中位数/固定环境元信息”保证可复现对比？

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统必须在每次事务中生成 `dirty-set`（字段级或字段根级），并保证其生成复杂度与“写入量”近似线性（不得默认做全量 diff 推导）。
- **FR-002**: 系统必须支持在需要时生成 `patch`（可用于诊断/回放/合并），并能在“同一路径多次写入”时给出明确的合并与最终值定义。
- **FR-003**: 系统必须基于 `dirty-set` 驱动派生/校验/刷新步骤的增量调度，使“执行步骤数”与“受影响依赖范围”近似线性，而不是与“总步骤数”线性。
- **FR-004**: 当无法生成精确 dirty-set（未知写入等）时，系统必须显式降级为全量收敛，并提供可解释的原因信息（而不是静默退化）。
- **FR-005**: 系统必须提供统一最小 IR，使上述事务信息可完全降解到 Static IR + Dynamic Trace，并支持冲突检测与合并（路径重复定义、覆盖优先级、单写者规则）。
- **FR-006**: 系统必须为事务、步骤、派生结果提供稳定标识，并在 Dynamic Trace 中串起因果链（触发源 → dirty-set/patch → 执行步骤 → 状态变更）。
- **FR-007**: 系统必须强制“事务窗口禁止 IO”，任何 IO/异步必须在事务外被显式表达；违反时必须稳定失败并可解释。
- **FR-008**: 诊断事件必须 Slim 且可序列化；禁止把闭包/不可序列化对象作为事件载荷进入 trace/缓冲区。
- **FR-009**: 系统必须提供可复现的基准脚本/用例，并要求在改造前记录 Before 基线、改造后记录 After 对比（含运行环境元信息与结果摘要）。

#### Functional Acceptance Mapping

 - FR-001/FR-003/FR-004 的最低验收：满足 User Story 1 的两个 Acceptance Scenarios，并覆盖 “dirty-set 过粗/过多” Edge Case。
 - FR-005/FR-006 的最低验收：满足 User Story 2 的两个 Acceptance Scenarios。
 - FR-007/FR-008 的最低验收：满足 User Story 3 的 Acceptance Scenario，并验证“诊断关闭时无显著负优化”。
 - FR-009 的最低验收：满足 User Story 4 的两个 Acceptance Scenarios，并能稳定复跑得到接近的中位数结果。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在 dirty 模式下，事务调度与派生执行的开销必须随“写入量 + 受影响步骤数”近似线性增长，并且提供可复现的性能基线与对比数据。
- **NFR-002**: 在关闭诊断时，系统不得引入显著额外分配或全量扫描；在开启诊断时，成本必须可预估且可裁剪（例如 ring buffer 上限与裁剪策略）。
- **NFR-003**: 任何对外可见的标识必须确定性生成（禁止随机/时间作为默认唯一标识），并支持回放与对比。
- **NFR-004**: 默认行为必须避免负优化：当 dirty-set 过滤的成本可能超过收益时，应提供显式降级阀门并可解释。

### Assumptions & Scope Boundaries

- 该特性只聚焦“事务 IR + Patch/Dirty-set”与其最小可解释链路，不同时实现所有领域包（Form/Query/...）的全面迁移。
- 该特性的输出面向业务作者、运行时维护者与平台/Devtools 消费者；以“统一最小 IR”为桥梁，避免并行真相源。

### Key Entities *(include if feature involves data)*

- **Transaction**: 一次同步事务窗口内的状态更新单元（必须可解释且可回放）。
- **Dirty-set**: 描述本次事务“写了哪些路径/根”的最小集合，用于增量调度。
- **Patch**: 描述状态变更的结构化记录（可用于诊断、回放、合并/冲突检测）。
- **Static IR**: 可编译/可合并/可冲突检测的声明性表示（规则、依赖、写入声明等）。
- **Dynamic Trace**: 运行期时间线（txn/step/op），用稳定标识串起因果链。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在包含 ≥100 个派生/校验步骤的模块中，单字段更新触发的执行步骤数与“受影响依赖范围”近似线性增长（而不是接近全量）。
- **SC-002**: `dirty-set` 生成在常见写入模式下不依赖全量 diff，且其成本与“写入量”近似线性（通过可复现基线与对比数据验证）。
- **SC-003**: 对重复写入/冲突写入，系统能在构建或运行阶段给出确定性裁决（失败或明确优先级），且不会出现“顺序相关”的非确定性结果。
- **SC-004**: 在开启诊断时，开发者可以对任意一次事务在 10 分钟内回答：“触发源是什么/写了什么/为什么执行这些步骤/变更了什么”。
- **SC-005**: 在关闭诊断时，相对基线的性能回归不超过 15%（通过可复现测量验证）。
- **SC-006**: 至少 1 个“典型场景”与 1 个“极限场景”基准被固化为可复现脚本/用例，并记录 Before/After 结果（含环境元信息与中位数）。
