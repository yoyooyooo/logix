# Feature Specification: O-022 Action API 收敛到 ActionIntent（保留 `$.dispatchers` 一等入口）

**Feature Branch**: `103-o022-action-intent-api`  
**Created**: 2026-02-26  
**Status**: Planned  
**Input**: User description: "O-022 Action API 收敛：保留 $.dispatchers 为一等公开高频类型安全入口；ActionIntent 作为内部统一内核与动态入口；$.dispatch(type,payload) 作为兼容/低阶入口。"

## Source Traceability

- **Backlog Item**: O-022
- **Source File**: `docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md`
- **Source Link**: [/docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md](/Users/yoyo/Documents/code/personal/logix.worktrees/refactor__todo-optimization-items/docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## API Hierarchy Decision (裁决固化)

1. `$.dispatchers` = 一等公开高频类型安全入口（默认推荐）。
2. `ActionIntent` + `$.action(token)` = 内部统一执行内核 + 动态/桥接入口。
3. `$.dispatch(type, payload)` = 兼容/低阶入口，不作为推荐默认写法。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 业务默认走 `$.dispatchers`（Priority: P1）

作为业务开发者，我希望继续以 `$.dispatchers` 获得类型安全与高频 DX，不被字符串入口替代。

**Why this priority**: 这是 O-022 的核心裁决，必须优先稳定。  
**Independent Test**: 在典型 action 模块中使用 `$.dispatchers` 触发 action，确保类型提示与行为不退化。

**Acceptance Scenarios**:

1. **Given** 已声明的 action token，**When** 调用 `$.dispatchers.xxx(...)`，**Then** 能获得类型安全 payload 与正确 dispatch 行为。
2. **Given** 高频交互路径，**When** 使用 `$.dispatchers`，**Then** 不出现额外分配导致的可感知性能回归。

---

### User Story 2 - 内核统一到 ActionIntent（Priority: P2）

作为 runtime 维护者，我希望 token 识别、payload 构造、dispatch 调用统一进入 ActionIntent 内核，减少重复实现。

**Why this priority**: 内核统一是性能与诊断收敛的前提。  
**Independent Test**: 覆盖 `$.dispatchers`、`$.action(token)`、`$.dispatch` 三入口，断言都进入同一内核路径。

**Acceptance Scenarios**:

1. **Given** 不同入口触发 action，**When** 查看诊断锚点，**Then** 都指向同一 ActionIntent 执行链。
2. **Given** 动态 token 场景，**When** 使用 `$.action(token)`，**Then** 行为与内核契约一致。

---

### User Story 3 - 兼容入口降级管理（Priority: P3）

作为迁移维护者，我希望 `$.dispatch(type,payload)` 仅保留兼容/低阶定位，并有明确迁移策略。

**Why this priority**: forward-only 需要尽早收敛推荐路径并控制破坏面。  
**Independent Test**: 扫描文档与示例，确认默认写法不再推荐字符串入口。

**Acceptance Scenarios**:

1. **Given** 新增示例代码，**When** 编写 action 调用，**Then** 默认使用 `$.dispatchers` 或 `$.action(token)`。
2. **Given** 旧字符串入口使用点，**When** 执行迁移，**Then** 有明确替代路径与门禁。

### Edge Cases

- token/tag 未注册时，`$.action(token)` 与 `$.dispatch(type,payload)` 必须给出一致诊断格式；`$.dispatchers` 作为静态类型入口不承担未注册 key 的动态兜底。
- 字符串 `type` 与 token 名冲突时，兼容入口必须可解释地拒绝或降级。
- 在 diagnostics=off 档位下，入口层不得产生额外对象包装开销。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 保留 `$.dispatchers` 作为一等公开高频类型安全入口。
- **FR-002**: 系统 MUST 将 Action 执行统一到 `ActionIntent` 内核，并让 `$.dispatchers` 成为其薄门面。
- **FR-003**: 系统 MUST 保留 `$.action(token)` 作为动态/桥接入口，并委托到同一 ActionIntent 内核。
- **FR-004**: `$.dispatch(type,payload)` MUST 明确为兼容/低阶入口，不得在文档中作为默认推荐。
- **FR-005**: 三入口 MUST 共享统一诊断锚点与错误语义，避免分叉事件协议。
- **FR-006**: docs/examples MUST 完成 API 分层说明与迁移路径说明。
- **FR-007**: 类型推导与 IDE 提示 MUST 对 `$.dispatchers` 保持不退化。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 高频 dispatch 路径在 `$.dispatchers` 下必须保持零额外分配或接近零额外分配。
- **NFR-002**: Action 诊断事件必须 Slim、可序列化，并能解释入口来源与 ActionIntent 锚点。
- **NFR-003**: 不得新增并行 IR 或多套 action 真相源。
- **NFR-004**: 稳定标识（instanceId/txnSeq/opSeq）保持一致，不得随机化。
- **NFR-005**: 若移除或收紧字符串入口，必须提供迁移说明且不保留兼容层。

### Key Entities _(include if feature involves data)_

- **ActionIntent**: 统一执行内核对象，承载 token/type 到执行计划的归一过程。
- **DispatcherFacade**: `$.dispatchers` 公开门面，负责类型安全入口映射。
- **ActionDispatchDiagnostic**: Action 执行诊断记录，包含入口类型、锚点与决策结果。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 文档与示例默认调用路径为 `$.dispatchers`，动态场景使用 `$.action(token)`。
- **SC-002**: 三入口执行链在实现上统一到 ActionIntent，重复分支明显减少。
- **SC-003**: `$.dispatchers` 类型推导快照测试全绿，无提示退化。
- **SC-004**: Dispatch 热路径性能无超预算回归（<= 5%）。
- **SC-005**: 迁移说明明确字符串入口定位与后续去留策略。
