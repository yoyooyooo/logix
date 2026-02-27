# Feature Specification: O-023 Flow `run(config)` 命名收敛

**Feature Branch**: `104-o023-flow-run-config`  
**Created**: 2026-02-26  
**Status**: Planned  
**Input**: User description: "O-023 Flow run(config) 命名收敛，统一 run* 家族到单入口 run(config)，并完成别名迁移、语义矩阵与诊断映射。"

## Source Traceability

- **Backlog Item**: O-023
- **Source File**: `docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md`
- **Source Link**: [docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md](../../docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 单入口 `run(config)`（Priority: P1）

作为 Flow API 使用者，我希望只记住一个入口 `run(config)`，而不是多个 `run*` 变体。

**Why this priority**: 这是 O-023 的核心目标，直接降低 DSL 心智负担。  
**Independent Test**: 将 `runLatest/runParallel/runExhaust/run*Task` 典型调用迁移到 `run(config)`，验证行为等价。

**Acceptance Scenarios**:

1. **Given** 原 `runLatest` 调用，**When** 改写为 `run({ mode: 'latest' })`，**Then** 行为一致。
2. **Given** 原 `runExhaust` 调用，**When** 改写为 `run({ mode: 'exhaust' })`，**Then** 行为一致。

---

### User Story 2 - 并发语义矩阵可验证（Priority: P2）

作为 runtime 维护者，我希望并发策略由统一策略执行器承载，语义矩阵可测试、可解释。

**Why this priority**: 解决“多层重复实现导致语义验证困难”的核心痛点。  
**Independent Test**: 建立 latest/exhaust/parallel/task 语义矩阵测试并全部通过。

**Acceptance Scenarios**:

1. **Given** 相同触发负载，**When** 切换不同 `run(config)` 模式，**Then** 结果符合矩阵定义。
2. **Given** 语义冲突输入，**When** 执行 `run(config)`，**Then** 产生统一诊断事件与 hint。

---

### User Story 3 - 迁移与门禁收口（Priority: P3）

作为仓库维护者，我希望旧 `run*` 命名族被迁移并最终删除，文档与 lint/codemod 门禁一致。

**Why this priority**: forward-only 要求最终删除旧命名，不保留并行入口。  
**Independent Test**: 仓库检索中不再出现旧 `run*` 推荐调用。

**Acceptance Scenarios**:

1. **Given** 旧 run* 调用点，**When** 执行迁移，**Then** 全部替换为 `run(config)`。
2. **Given** 新增代码，**When** 使用 Flow API，**Then** lint/codemod 阻止旧命名回流。

### Edge Cases

- `config` 缺失 mode 时必须给出稳定默认策略与明确诊断。
- `latest` 与 `task` 组合冲突时，必须明确优先级与拒绝策略。
- alias 过渡期内必须保证诊断事件名和参数语义一致。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 以 `run(config)` 作为 Flow 执行唯一推荐入口。
- **FR-002**: 系统 MUST 将旧 `run*` 入口语义映射到统一配置模型，并保持行为等价。
- **FR-003**: 并发策略执行 MUST 收敛到统一策略执行器，避免多层重复逻辑。
- **FR-004**: latest/exhaust/parallel/task 语义矩阵 MUST 具备自动化回归覆盖。
- **FR-005**: 诊断事件与 `run(config)` 映射 MUST 一一对应且可解释。
- **FR-006**: docs/examples MUST 完成 `run(config)` 默认写法迁移。
- **FR-007**: 旧 run* 命名 MUST 最终删除，且无兼容层/无弃用期。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: `run(config)` 解析与执行开销回归 <= 5%。
- **NFR-002**: 统一诊断事件必须 Slim、可序列化，诊断关闭时接近零成本。
- **NFR-003**: 不得新增并行 IR 真相源；Flow trace 锚点保持单一来源。
- **NFR-004**: 稳定标识字段必须保持一致且可复现。
- **NFR-005**: 迁移合同必须定义旧 run* 删除步骤与门禁策略。

### Key Entities _(include if feature involves data)_

- **RunConfig**: 单入口执行配置实体，表达模式、并发策略和任务策略。
- **FlowRunPolicyDecision**: 策略执行器输出，描述本次调度决策。
- **FlowRunDiagnosticRecord**: 统一诊断载荷，记录模式、决策与锚点。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 仓库默认 Flow 写法统一为 `run(config)`。
- **SC-002**: 语义矩阵测试覆盖 latest/exhaust/parallel/task 四类主模式并全绿。
- **SC-003**: 旧 run* 推荐用法从文档和示例中清除。
- **SC-004**: 热路径性能回归控制在预算内（<= 5%）。
- **SC-005**: 迁移合同明确且可执行，执行后不再保留旧命名入口。
