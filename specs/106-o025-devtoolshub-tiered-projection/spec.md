# Feature Specification: O-025 DevtoolsHub 投影分层（off/light/full）

**Feature Branch**: `106-o025-devtoolshub-tiered-projection`  
**Created**: 2026-02-26  
**Status**: Planned  
**Input**: User description: "O-025 DevtoolsHub 投影分层（off/light/full），让 mode 只影响观测深度：off 关闭观测、light 保留最小摘要并声明 degraded 语义、full 维护重资产。"

## Source Traceability

- **Backlog Item**: O-025
- **Source File**: `docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md`
- **Source Link**: [/docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md](/Users/yoyo/Documents/code/personal/logix.worktrees/refactor__todo-optimization-items/docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## User Scenarios & Testing _(mandatory)_

### User Story 1 - light 模式最小投影（Priority: P1）

作为 runtime 性能维护者，我希望 light 模式只写入最小摘要，显著降低高频事件写入压力。

**Why this priority**: O-025 主要收益来自 light 写路径减负。  
**Independent Test**: 在同负载对比 light/full 写入开销与字段差异。

**Acceptance Scenarios**:

1. **Given** off 模式，**When** 业务流程运行，**Then** 禁用导出观测路径但业务语义保持一致。
2. **Given** light 模式，**When** 高频事件到来，**Then** 只维护最小摘要与降级原因。
3. **Given** full 模式，**When** 高频事件到来，**Then** 继续维护完整投影资产。

---

### User Story 2 - degraded 语义可解释（Priority: P2）

作为 Devtools 消费端开发者，我希望在 light 模式读取到 degraded 信息时能正确理解，而不是误判故障。

**Why this priority**: 防止“数据减少被误判为错误”。  
**Independent Test**: 验证消费端在 degraded 场景不崩溃且提示准确。

**Acceptance Scenarios**:

1. **Given** light 模式输出 degraded 摘要，**When** 消费端渲染，**Then** 展示“降级”而非“缺失异常”。
2. **Given** snapshotToken 更新，**When** 比对可见字段，**Then** 一致性规则成立。

---

### User Story 3 - 消费端迁移收口（Priority: P3）

作为平台维护者，我希望 Devtools/Replay/Evidence 消费逻辑完成 staged 迁移后再切默认策略。

**Why this priority**: breaking 面在消费端默认假设。  
**Independent Test**: 三端在 degraded 场景的测试矩阵通过。

**Acceptance Scenarios**:

1. **Given** 三端消费逻辑，**When** 切换到分层投影，**Then** 都能正确处理 degraded summary。
2. **Given** 默认策略切到 light，**When** 回放与导出执行，**Then** 不发生协议崩溃。

### Edge Cases

- snapshotToken 变化但 full 字段缺失时，必须由 degraded reason 显式解释。
- consumer 未升级时，必须有明确失败提示而不是 silent mismatch。
- light/full 切换瞬间的状态读写必须保持一致性。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 支持 DevtoolsHub 统一 mode：off / light / full 三档。
- **FR-002**: light 模式 MUST 仅维护最小摘要与降级原因，不维护重资产投影。
- **FR-003**: full 模式 MUST 保持完整投影行为，作为高保真路径。
- **FR-004**: `snapshotToken` 与可见字段一致性规则 MUST 明确并可测试。
- **FR-005**: consumer MUST 支持 degraded 语义并避免误判缺失为故障。
- **FR-006**: 必须提供 staged 迁移路径：消费端先适配，再切默认策略。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: light 模式写入成本相较 full 显著下降（以同场景对比报告证明）。
- **NFR-002**: 诊断与导出载荷保持 Slim、可序列化。
- **NFR-003**: 分层策略不得引入并行真相源或锚点漂移。
- **NFR-004**: degraded 语义必须可解释并可追踪到原因码。

### Key Entities _(include if feature involves data)_

- **ProjectionMode**: 观测档位定义（off/light/full）。
- **ProjectionSummary**: light 模式摘要实体。
- **ProjectionDegradeReason**: 降级原因码实体。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: off/light/full 三档行为和字段差异在合同文档中明确且可测试。
- **SC-002**: light 模式写入开销显著下降并达到预算目标。
- **SC-003**: degraded 场景 consumer 测试矩阵通过。
- **SC-004**: 默认切换到 light 后，Devtools/Replay/Evidence 无协议回归。
