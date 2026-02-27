# Feature Specification: O-021 Module 实例化 API 统一

**Feature Branch**: `102-o021-module-api-unification`  
**Created**: 2026-02-26  
**Status**: writeback  
**Input**: User description: "O-021 Module 实例化 API 统一，统一 live/implement/impl 到 build/createInstance，保持 runtime 装配契约、性能与诊断可追踪。"

## Source Traceability

- **Backlog Item**: O-021
- **Source File**: `docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md`
- **Source Link**: [docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md](../../docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A（本项为 runtime API 收敛）
- **Kill Features (KF)**: N/A

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 统一实例化入口（Priority: P1）

作为 runtime 使用者，我希望通过单一入口完成 Module 实例化，不再在 `live/implement/impl` 之间做心智切换。

**Why this priority**: 入口歧义是 O-021 的主问题，必须先消除。  
**Independent Test**: 在同一模块定义下，使用新入口创建实例并运行，结果与旧路径一致且类型推导可用。

**Acceptance Scenarios**:

1. **Given** 一个标准 Module 定义，**When** 使用统一入口实例化，**Then** 能得到可运行实例且不需要旧 API。
2. **Given** 原先使用 `live/implement/impl` 的调用点，**When** 迁移到统一入口，**Then** 行为保持一致。

---

### User Story 2 - 装配契约与诊断稳定（Priority: P2）

作为 runtime 维护者，我希望实例化路径收敛后，Runtime/AppRuntime 装配契约与诊断锚点保持稳定。

**Why this priority**: O-021 明确要求“契约不漂移、诊断可解释”。  
**Independent Test**: 对比迁移前后诊断事件字段，确认锚点与解释链不变。

**Acceptance Scenarios**:

1. **Given** 统一入口路径，**When** 发生实例化错误，**Then** 诊断事件仍提供稳定 `instanceId/txnSeq/opSeq` 与来源。
2. **Given** Runtime/AppRuntime 装配流程，**When** 使用统一入口，**Then** 不引入新的不可解释分支。

---

### User Story 3 - 迁移与文档收口（Priority: P3）

作为仓库维护者，我希望 examples/react/sandbox/runtime 文档统一使用新入口，并给出明确迁移说明。

**Why this priority**: forward-only 策略要求移除旧术语与旧入口。  
**Independent Test**: 在本阶段落点（`docs/ssot/runtime/logix-core/api/*` 与 `apps/docs/content/docs/api/core/*.cn.md`）搜索中不再出现 `live/implement/impl` 作为推荐写法。

**Acceptance Scenarios**:

1. **Given** 本阶段约定文档落点（runtime SSoT + API Core 中文文档），**When** 完成迁移，**Then** 默认写法全部改为统一入口。
2. **Given** 旧 API 使用者，**When** 阅读迁移说明，**Then** 可以按步骤完成替换。

### Edge Cases

- 仅传入最小参数时，统一入口必须给出确定性默认行为，不允许隐式分叉。
- 旧路径与新路径混用时，必须有明确诊断提示，避免同模块重复实例化。
- 动态模块工厂返回异常时，诊断事件仍需 Slim 且可序列化。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供单一公开推荐实例化入口（命名以实现阶段裁决为准），覆盖旧 `live/implement/impl` 的主能力。
- **FR-002**: 统一入口 MUST 使用共享构造内核（`buildImpl` + `createModule` 语义收敛），避免重复装配逻辑。
- **FR-003**: Runtime/AppRuntime 装配契约 MUST 保持不漂移，迁移后行为与旧入口等价。
- **FR-004**: 所有实例化相关诊断 MUST 绑定稳定锚点并保持可解释链路。
- **FR-005**: 本阶段文档落点（`docs/ssot/runtime/logix-core/api/*` 与 `apps/docs/content/docs/api/core/*.cn.md`）MUST 默认使用统一入口；全仓教程/examples 迁移由后续任务（T014-T016）继续推进。
- **FR-006**: 迁移方案 MUST 明确旧入口删除时点：`writeback` 阶段仅允许 legacy 入口用于迁移盘点并触发告警，进入 `done` 门禁前必须移除 legacy 公开可用面；不保留长期兼容层或跨阶段弃用期。
- **FR-007**: 统一入口 MUST 支持类型推导不退化，并提供类型回归测试。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在进入 `done` 门禁前，必须给出实例化热路径跨提交（before/after）性能基线，关键指标回归不得超过 5%。
- **NFR-002**: 诊断关闭时新增路径开销需接近零；诊断开启时事件仍为 Slim 可序列化载荷。
- **NFR-003**: 不得新增并行 IR 真相源；Static IR 与 Dynamic Trace 锚点保持一致。
- **NFR-004**: instanceId/txnSeq/opSeq 等稳定标识不得随机化。
- **NFR-005**: 破坏性变更通过迁移说明交付，不保留兼容层（forward-only）。

### Key Entities _(include if feature involves data)_

- **ModuleInstantiationIntent**: 对外统一实例化请求，描述输入模块、配置与来源。
- **ModuleInstantiationResult**: 统一入口输出，包含实例句柄、诊断上下文与契约版本。
- **InstantiationDiagnosticRecord**: 实例化阶段结构化事件（锚点 + 结果 + hint）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在 `logix-core` 公共 API 中，实例化主入口收敛为单一路径；在 `writeback` 阶段旧 `live/implement/impl` 不再作为推荐接口，在 `done` 门禁前完成彻底移除。
- **SC-002**: Runtime/AppRuntime 装配回归测试全绿，行为等价场景覆盖率达 100%。
- **SC-003**: 实例化相关诊断事件可解释性不下降，且字段满足 Slim/序列化约束。
- **SC-004**: 在 `done` 门禁前完成跨提交 before/after perf 报告并通过预算门槛（关键指标回归 <= 5%）；当前阶段允许同 commit 双采样作为链路证据。
- **SC-005**: 本阶段文档落点默认术语完成迁移，旧术语仅保留在迁移说明或未完成的后续迁移任务上下文。
