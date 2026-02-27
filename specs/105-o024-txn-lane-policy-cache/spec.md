# Feature Specification: O-024 Txn Lane 策略前移缓存

**Feature Branch**: `105-o024-txn-lane-policy-cache`  
**Created**: 2026-02-26  
**Status**: Planned  
**Input**: User description: "O-024 Txn Lane 策略前移缓存，在 capture context 预计算并缓存 policy，降低热路径 merge 税并更新 override 时序语义。"

## Source Traceability

- **Backlog Item**: O-024
- **Source File**: `docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md`
- **Source Link**: [docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md](../../docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 热路径复用缓存策略（Priority: P1）

作为 runtime 性能维护者，我希望在 capture 阶段预计算 `ResolvedTxnLanePolicy`，让热路径直接复用缓存，避免重复 merge。

**Why this priority**: O-024 的核心收益来自热路径减税。  
**Independent Test**: 在相同负载下比较改造前后 `merge.count/duration` 指标。

**Acceptance Scenarios**:

1. **Given** 高并发事务提交，**When** 使用前移缓存策略，**Then** merge 次数显著下降。
2. **Given** 常规事务路径，**When** 读取策略，**Then** 直接复用 capture 缓存结果。

---

### User Story 2 - 时序语义明确化（Priority: P2）

作为运行时使用者，我希望明确 override 在 capture 生效，运行中临时注入不再即时覆盖。

**Why this priority**: 这是 O-024 的主要 breaking 面。  
**Independent Test**: 构建 override/re-capture 场景，断言新时序行为可预测。

**Acceptance Scenarios**:

1. **Given** capture 后动态 override，**When** 不触发 re-capture，**Then** 运行中的策略不变。
2. **Given** capture 后触发 re-capture，**When** 重新运行，**Then** 新 override 正确生效。

---

### User Story 3 - 诊断与操作手册同步（Priority: P3）

作为调试维护者，我希望 `txn_lane_policy::resolved` 事件合同与 override 操作手册同步更新。

**Why this priority**: 时序收紧后必须保证可解释性。  
**Independent Test**: 检查诊断事件与文档是否能解释“为什么当前策略未即时变化”。

**Acceptance Scenarios**:

1. **Given** 策略缓存命中，**When** 查看诊断，**Then** 能明确识别 cache 来源与 capture 时点。
2. **Given** override 未生效投诉，**When** 阅读手册与事件，**Then** 可定位是未 re-capture。

### Edge Cases

- capture 上下文失效时必须有可解释回退，不得无提示重算。
- 多 provider 叠加 override 时，缓存优先级必须稳定且可测试。
- re-capture 失败时，必须有降级行为与错误诊断。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在 capture context 阶段预计算并缓存 `ResolvedTxnLanePolicy`。
- **FR-002**: 热路径策略解析 MUST 优先读取上下文缓存，不再重复多层 merge。
- **FR-003**: override 生效语义 MUST 收敛为“capture 生效 + re-capture 更新”。
- **FR-004**: 运行中临时注入 override MUST 不再即时覆盖当前缓存策略。
- **FR-005**: 必须更新 `txn_lane_policy::resolved` 事件合同与字段定义。
- **FR-006**: 必须提供 override/re-capture 操作手册与迁移说明。
- **FR-007**: 相关测试 MUST 覆盖缓存命中、re-capture、生效时序与失败降级。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: merge.count/duration 指标应显著下降，且调度 p95/p99 不回归（<= 5%）。
- **NFR-002**: 诊断事件保持 Slim 可序列化，diagnostics=off 时接近零成本。
- **NFR-003**: 不得新增并行策略真相源；策略锚点与 trace 单一来源。
- **NFR-004**: 稳定标识必须维持不随机化。
- **NFR-005**: breaking 语义必须通过迁移说明交付，无兼容层。

### Key Entities _(include if feature involves data)_

- **TxnLanePolicyCacheEntry**: capture 阶段产出的策略缓存条目。
- **TxnLanePolicyResolutionContext**: 策略决策上下文（provider/module/runtime/builtin 来源）。
- **TxnLanePolicyDiagnosticRecord**: 策略解析事件载荷（命中/重算/降级）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `merge.count/duration` 指标下降且在目标区间内。
- **SC-002**: override/re-capture 语义测试全绿并与文档一致。
- **SC-003**: `txn_lane_policy::resolved` 事件合同更新并可解释缓存行为。
- **SC-004**: 性能证据显示调度路径无超预算回归。
- **SC-005**: 迁移文档明确 breaking 面与操作步骤。
