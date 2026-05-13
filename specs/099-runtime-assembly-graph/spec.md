# Feature Specification: O-006 Runtime Assembly Graph

**Feature Branch**: `[099-runtime-assembly-graph]`
**Created**: 2026-02-25
**Status**: Planned
**Input**: User description: "O-006 Runtime 装配链路减层：去掉过深 Layer/FiberRef patch 体操，用显式 assembly graph 替代多段 build/merge/patch，RootContext ready/merge 流程显式化；验收是冷启动路径可视化且 boot 失败定位更快。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: 本特性暂不新增/改写 NS 编号，后续如需绑定以现有 SSoT 编号为准。
- **Kill Features (KF)**: 无。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 冷启动链路可解释化 (Priority: P1)

作为 Runtime 维护者，我需要在一次冷启动中看到完整且显式的装配图（阶段、依赖、顺序、状态），这样在启动失败时可以直接定位失败阶段，而不是反复在 build/merge/patch 隐式链路里猜测。

**Why this priority**: O-006 的核心价值是“启动可解释性”和“故障定位效率”，这是其余优化的前提。

**Independent Test**: 在成功启动与故障注入两类场景下，都能输出可视化的装配路径与失败锚点；仅实现该能力即可独立交付核心价值。

**Acceptance Scenarios**:

1. **Given** Runtime 进入冷启动，**When** 装配完成，**Then** 系统输出完整装配图摘要（阶段顺序、依赖关系、阶段耗时、RootContext ready/merge 状态）。
2. **Given** 冷启动在某装配阶段失败，**When** 维护者查看启动证据，**Then** 可以直接得到失败阶段、上游依赖和失败原因分类，不需要二次推断。

---

### User Story 2 - 启动稳定性与可回归验证 (Priority: P2)

作为 Runtime 维护者，我需要装配链路在同输入下具有稳定结构和稳定标识，确保冷启动回归测试与性能对比可复现。

**Why this priority**: 没有稳定结构与标识，性能基线和故障复盘都会漂移，无法形成可持续优化闭环。

**Independent Test**: 在同配置下重复执行冷启动，装配图结构、阶段序、关键标识与基线统计保持稳定且可比。

**Acceptance Scenarios**:

1. **Given** 相同模块拓扑与配置，**When** 连续执行多次冷启动，**Then** 装配图结构和关键锚点保持一致。
2. **Given** 关闭诊断模式，**When** 执行冷启动，**Then** 启动行为保持一致，且诊断附加成本满足预算。

---

### User Story 3 - 迁移与对外行为稳定 (Priority: P3)

作为使用 Runtime 的业务开发者，我希望本次改造不改变现有业务使用方式；如果出现破坏性变化，必须有明确迁移说明而非兼容层。

**Why this priority**: 该优化应集中在 Runtime 内核可维护性，不应把复杂性转嫁给业务侧。

**Independent Test**: 在不改业务调用的情况下跑通既有启动路径；若触发破坏性变化，则可按迁移文档完成切换。

**Acceptance Scenarios**:

1. **Given** 业务代码沿用现有 Runtime 使用方式，**When** 升级到本特性版本，**Then** 业务启动路径不需要额外改造即可工作。
2. **Given** 改造引入破坏性行为变更，**When** 团队执行迁移说明，**Then** 可在无兼容层前提下完成迁移并通过验收。

---

### Edge Cases

- 模块层/服务层存在重复声明或冲突时，装配图必须体现冲突节点并终止装配。
- RootContext ready 与 merge 顺序异常（未 ready 即 merge，或重复 ready）时，必须有结构化失败信号。
- 诊断信息包含不可序列化内容时，必须降级为 Slim 可序列化摘要并标注降级原因。
- 诊断关闭模式下，装配链路不得因为观测逻辑改变启动结果。
- 任何装配改造都不得引入“事务窗口内 IO/等待”路径。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 将 Runtime 冷启动装配表达为显式 assembly graph，并包含可识别的阶段节点、依赖边与执行顺序。
- **FR-002**: 系统 MUST 显式建模 RootContext 的 ready/merge 生命周期，并保证其状态转换可观测且可校验。
- **FR-003**: 系统 MUST 为每次冷启动提供可消费的装配报告（至少含阶段顺序、依赖关系、阶段结果、失败锚点）。
- **FR-004**: 系统 MUST 在 boot 失败时输出结构化失败信息，包含失败阶段、直接原因分类、相关上下文锚点与上游阶段信息。
- **FR-005**: 系统 MUST 将现有多段 build/merge/patch 体操收敛到单一可解释装配路径，避免隐式分叉行为。
- **FR-006**: 系统 MUST 提供面向测试与回归的只读启动证据接口，以支持冷启动路径可视化和失败复现。
- **FR-007**: 系统 MUST 保持装配图和启动证据中的关键标识稳定可复现，不依赖随机值或时间戳生成核心锚点。
- **FR-008**: 系统 MUST 默认保持业务使用层（Runtime 入口与核心使用姿势）不变；若无法保持，必须输出迁移说明。
- **FR-009**: 系统 MUST 将迁移路径文档化为显式步骤，并以迁移说明替代兼容层与弃用期。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 必须定义冷启动性能预算并给出可复现基线（至少包含冷启动耗时与分配成本的 before/after/diff 证据）。
- **NFR-002**: 诊断能力必须分级且有成本预算；`diagnostics=off` 时额外开销接近零，`diagnostics=light/full` 的开销需可量化。
- **NFR-003**: 装配相关诊断事件必须为 Slim 且可序列化（JSON 可导出），不可序列化信息必须显式降级并携带原因码。
- **NFR-004**: 关键锚点必须使用稳定标识语义（instanceId/txnSeq/opSeq 及装配阶段稳定序号），禁止随机化标识。
- **NFR-005**: 必须严格遵守事务窗口约束：事务窗口内禁止 IO/等待；装配改造不得引入跨边界写回逃逸。
- **NFR-006**: 冷启动失败定位链路必须可解释，维护者在诊断视图中定位失败阶段的步骤数应显著下降并可度量。
- **NFR-007**: 若产生破坏性变化，必须同步提供中文迁移说明（plan/spec 及相关用户文档落点），且不引入兼容层。

### Key Entities _(include if feature involves data)_

- **AssemblyGraphNode**: 表示一次启动装配中的阶段节点（阶段标识、阶段类型、状态、耗时、关联锚点）。
- **AssemblyGraphEdge**: 表示阶段间依赖或顺序关系（上游节点、下游节点、依赖类型）。
- **RootContextLifecycleRecord**: 表示 RootContext 在启动过程中的 ready/merge 生命周期状态与时序。
- **BootFailureDiagnostic**: 表示启动失败的结构化诊断摘要（失败阶段、原因码、关联锚点、降级信息）。
- **BootAssemblyReport**: 表示可导出/可对比的启动装配证据包（图结构摘要 + 诊断摘要 + 预算指标）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在成功启动与故障注入两类场景中，冷启动装配路径可被完整可视化，阶段覆盖率达到 100%。
- **SC-002**: 在预设启动故障集里，失败阶段定位的中位步骤数相较现状下降至少 40%。
- **SC-003**: 冷启动性能回归满足预算门槛（p95 冷启动耗时回归不超过 5%，并具备可复现实验记录）。
- **SC-004**: 在 `diagnostics=off` 下，观测开销接近零并满足预算门槛（以基线对比结果为准）。
- **SC-005**: 装配诊断事件的可序列化校验通过率为 100%，不存在不可导出事件泄漏。
- **SC-006**: 既有业务使用路径在不改调用方式下通过回归验证；若存在破坏性变化，迁移说明可独立完成升级并通过验收。
