# Feature Specification: Trait 收敛 Dirty Checks 的 Time-slicing（显式 Opt-in）

**Feature Branch**: `043-trait-converge-time-slicing`  
**Created**: 2025-12-27  
**Status**: Done  
**Input**: User description: "Traits 收敛 dirty checks 的 time-slicing（帧/间隔节流）与可解释证据"

## Assumptions

- 默认不启用：未配置时保持现有行为（每个操作窗口内即时收敛、对外 0/1 commit）。
- time-slicing 只影响“是否在本窗口做收敛检查/执行”的调度策略；不改变单次收敛内部语义（等价于把部分工作移动到后续窗口）。
- “可延迟 trait”允许短暂读到过期值；是否可延迟必须由业务显式声明（禁止自动推断/猜测）。
- 事务窗口禁止 IO/async 仍是红线；延迟执行发生在后续独立操作窗口中，并拥有自身稳定标识链路（`instanceId/txnSeq/opSeq` 等）。

## Out of Scope

- 不在本特性中实现 `specs/039-trait-converge-int-exec-evidence/` 的“整型执行链路打穿”；本特性只解决“高频窗口 O(N) 检查/触发”的调度策略。
- 不自动推断 trait 的重要性/可延迟性；不提供“自动分级”的魔法策略。
- 不提供跨模块的全局优先级系统（priority inversion/多队列调度等）；只定义最小可验收闭环。

## Dependencies

- 可复现的浏览器基准场景：可构造 1000+ traits，其中绝大多数属于 UI 装饰/可延迟类，用于验证“跳过检查/合并触发”的收益。
- Devtools/trace 能消费并展示 Slim 的 trait 证据（沿用既有 `trait:*` 事件链路）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 高频输入下仍流畅 (Priority: P1)

作为业务开发者，我希望在 traits 数量很大（例如 1000+）的表单/交互场景中，连续输入时系统不会因为每次变更都全量检查/收敛所有 traits 而产生卡顿。

**Why this priority**: “每次窗口 O(N) 全量检查”在大 N 下会成为硬上限，直接限制 Trait 系统可用规模。

**Independent Test**: 构造“大量 traits + 高频事务”场景，对比开启前后单次操作窗口 p95 时间；关键字段（即时 traits）仍在同窗口收敛。

**Acceptance Scenarios**:

1. **Given** 一个含 1000 traits 的模块，其中 90% 标记为可延迟，**When** 连续触发高频输入，**Then** 每次操作窗口内仅对“即时 traits”做收敛检查/执行，并将可延迟 traits 合并到后续调度窗口中。
2. **Given** 同一初始状态与相同输入序列，**When** 重复运行多次，**Then** 最终可观察状态一致，且延迟 traits 的最大滞后不超过一个可配置的上界。

---

### User Story 2 - 延迟策略可解释 (Priority: P2)

作为运行时维护者，我希望当某个 trait 没有在当前窗口被收敛时，Devtools/证据能解释“为什么被跳过、何时会被补算、是否出现饥饿/积压”。

**Why this priority**: 没有可解释链路的自动策略会把性能收益转化为调试成本与不信任。

**Independent Test**: 触发跳过/补算/积压三类场景，验证每个窗口都能输出可序列化摘要，且包含稳定标识与原因字段。

**Acceptance Scenarios**:

1. **Given** 某次窗口只触发了延迟 traits 的依赖，**When** 诊断开启，**Then** 证据中能看到：延迟策略生效、跳过数量/类别、以及下一次计划执行的窗口摘要信息。
2. **Given** 连续多次窗口都在积压（例如输入极频繁），**When** 达到上界，**Then** 系统会触发一次可解释的“强制收敛”或“降级策略”，并产出对应原因摘要。

---

### User Story 3 - 默认行为不变 (Priority: P3)

作为业务仓库维护者，我希望不开启本特性时，行为与性能不发生回归，不引入新的对外心智模型。

**Why this priority**: 本特性引入的是“可选策略”，默认路径必须保持稳定，否则会造成全仓不确定性。

**Independent Test**: 在关闭特性时，所有既有测试与性能基线不回归。

**Acceptance Scenarios**:

1. **Given** 未启用 time-slicing，**When** 运行既有回归与基线，**Then** 行为与性能在可接受误差内一致。

---

### Edge Cases

- 延迟 traits 依赖即时 traits 时，延迟窗口是否需要包含其所有依赖的补算？
- 同一 trait 被不同策略标记（模块级 vs trait 级）时，优先级如何裁决？
- 如果连续窗口都被合并导致延迟窗口饥饿，如何保证上界与可解释降级？
- 延迟执行窗口触发时，如果发现配置错误/运行时错误，如何保证不污染主状态且证据可解释？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统必须支持显式 opt-in 的“延迟收敛策略”，允许把部分 traits 从“每窗口立即检查/执行”降级为“按调度窗口合并执行”。
- **FR-002**: 系统必须保证默认行为不变：未启用时仍满足“每操作窗口内完成收敛、0/1 commit、事务窗口禁止 IO、稳定标识、最小 IR”。
- **FR-003**: 系统必须支持 traits 至少分为“即时（immediate）”与“可延迟（deferred）”两类，且分类来源必须是显式声明（禁止自动推断）。
- **FR-004**: 系统必须提供“最大滞后上界”与“饥饿保护/降级策略”，确保 deferred traits 不会无限期不收敛。
- **FR-005**: 系统必须在诊断证据中解释：本窗口为何跳过 deferred 部分（策略、数量、原因摘要）以及补算窗口的触发/执行摘要。
- **FR-006**: 系统必须提供显式开关，可在模块/实例维度启用或禁用本策略，并允许在运行期被覆盖（用于排查与回退）。
- **FR-007**: 系统必须保证策略不会“吞掉静态配置错误”（cycle/multiple writers 等）——错误仍必须按既有规则硬失败或可解释降级。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统必须为“dirty checks/收敛触发”定义性能预算，并在实现前记录可复现的浏览器基线。
- **NFR-002**: 诊断关闭时，本特性引入的额外开销必须接近零（不得因“策略可用性”引入常驻分配/计时）。
- **NFR-003**: 诊断与证据必须使用稳定标识（例如 `instanceId/txnSeq/opSeq`）；不得引入 random/time default 作为锚点。
- **NFR-004**: 必须保持同步事务边界：事务窗口内禁止 IO/async；任何延迟执行发生在后续独立窗口中，并可被证据链路解释。
- **NFR-005**: 若引入新的自动策略（time-slicing），必须同步更新对外文档口径（心智模型/成本模型/优化梯子），并保持与证据字段一致。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在浏览器“大 N + 高频输入”基线下，启用 time-slicing 后单次操作窗口 p95 时间相对“全部即时”基线提升 ≥ 2×，且无明显长尾回归。
- **SC-002**: immediate traits 的行为不变（仍在同窗口收敛），deferred traits 的最大滞后不超过配置上界（p95）。
- **SC-003**: 未启用本特性时，既有基线与回归无回归（时间/分配开销在阈值内）。
- **SC-004**: Devtools 能解释一次“跳过/补算/降级”事件的原因链路（至少包含策略、生效范围摘要、是否触发饥饿保护）。

## Notes

- 与 `specs/039-trait-converge-int-exec-evidence/` 的关系：039 不改变对外语义，只优化执行链路；本特性改变触发/调度语义，因此必须独立交付并提供 opt-in 与迁移说明。
