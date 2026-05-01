# Feature Specification: Runtime-Scoped Observability for Diagnostics Hot Path

**Feature Branch**: `[097-runtime-scoped-observability]`
**Created**: 2026-02-25
**Status**: Planned
**Input**: User description: "O-004 观测链路去全局单例：改为 runtime-scoped 事件总线 + 分层编码；每 runtime 独立 ring/buffer；热路径仅写 slim envelope；重投影与大对象裁剪异步化按需化；验收是 diagnostics 开启后事务主链附加耗时显著降低。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-10
- **Kill Features (KF)**: KF-8

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 诊断开启时仍保持主链低开销 (Priority: P1)

作为 Runtime 维护者，我希望在开启 diagnostics（light/full）时，事务主链只做轻量写入，不再被全局聚合与大对象编码拖慢，从而让线上可观测能力与吞吐稳定性同时成立。

**Traceability**: NS-10, KF-8

**Why this priority**: 这是 O-004 的核心价值，直接决定“能否在生产开启诊断而不明显拖垮主链”。

**Independent Test**: 在同一基准场景下，对比“改造前”与“改造后” diagnostics=light/full 的事务提交路径附加耗时与分配量，验证显著下降。

**Acceptance Scenarios**:

1. **Given** diagnostics=light 且高频状态写入，**When** 连续运行基准事务流，**Then** 主链仅写 slim envelope，不执行重投影/大对象裁剪，并满足目标性能预算。
2. **Given** diagnostics=full 且存在复杂 payload，**When** 事务提交，**Then** 主链不进行大对象编码，重投影在异步阶段按需执行。
3. **Given** diagnostics=off，**When** 运行同样负载，**Then** 不产生额外观测异步任务，主链开销保持接近零增量。

---

### User Story 2 - 多 Runtime 观测隔离与可解释 (Priority: P2)

作为 Devtools/排障使用者，我希望同一进程中的多个 runtime 互不串扰，每个 runtime 都有独立事件窗口和计数，保证时间线解释准确。

**Traceability**: NS-10, KF-8

**Why this priority**: 去全局单例的首要收益是隔离性与可解释性，没有隔离就无法保证诊断证据可信。

**Independent Test**: 同时启动多个 runtime 并高频产生日志，检查每个 runtime 的事件窗口、丢弃计数、最新状态索引均独立且可追踪。

**Acceptance Scenarios**:

1. **Given** 同进程内 2 个以上 runtime，**When** 同时触发 action/state 更新，**Then** 每个 runtime 的 ring/buffer 仅包含自身事件。
2. **Given** 某 runtime ring 满载，**When** 新事件进入，**Then** 仅该 runtime 按自身策略裁剪，其他 runtime 不受影响。
3. **Given** runtime 销毁，**When** 后续出现迟到事件，**Then** 事件被标记或丢弃且不重建该 runtime 的 latest 缓存。

---

### User Story 3 - 按需重投影与大对象裁剪可追踪 (Priority: P3)

作为性能与诊断负责人，我希望大对象裁剪与重投影改为异步按需执行，同时保留明确降级原因与证据，避免“快了但不可解释”。

**Traceability**: NS-10, KF-8

**Why this priority**: 在性能改造后仍要保留可诊断性，否则会形成新的黑盒。

**Independent Test**: 注入不可序列化或超大 payload，验证主链继续快速提交，异步侧给出可序列化结果与稳定降级码。

**Acceptance Scenarios**:

1. **Given** 事件含不可序列化对象，**When** 进入观测流水线，**Then** 主链仅记录 slim envelope，异步阶段输出 `downgrade.reason=non_serializable`。
2. **Given** 事件体积超过预算，**When** 导出可消费事件，**Then** 输出 `downgrade.reason=oversized` 且保留稳定锚点字段。
3. **Given** 未请求重投影视图，**When** 系统运行，**Then** 不触发重投影计算与额外内存占用。

---

### Edge Cases

- 单个 runtime 在短时间内事件暴增导致 ring 满载，必须只影响该 runtime，且裁剪行为可解释。
- runtime 已销毁但异步重投影任务尚未完成，必须丢弃结果或标记 orphan，禁止写回已销毁 runtime 状态。
- 诊断事件中出现循环引用/大对象/Error cause，必须保证可序列化导出且不阻塞事务提交。
- diagnostics 在运行期切换（off/light/full）时，必须保证 ID 连续性与事件口径不漂移。

## Scope & Non-Goals

### In Scope

- 观测链路从“全局单例聚合”迁移为 runtime-scoped 事件总线。
- 每 runtime 独立 ring/buffer、窗口裁剪计数与 latest 缓存。
- 事务热路径仅写 slim envelope，重投影/大对象裁剪异步化、按需化。
- 统一稳定标识：instanceId/txnSeq/opSeq（及可派生 txnId/eventId）在 runtime 维度可复现。
- 提供 forward-only 迁移说明，明确旧全局语义下线方式。

### Non-Goals

- 不在本特性内重做 Devtools UI 交互样式或可视化布局。
- 不引入新的业务 DSL/API（仅观测链路与运行时内部契约调整）。
- 不引入兼容层或弃用期来维持旧全局单例行为。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-10, KF-8) 系统 MUST 将观测事件聚合从进程级全局单例迁移为 runtime-scoped 事件总线。
- **FR-002**: 系统 MUST 为每个 runtime 维护独立 ring/buffer、latest 状态索引与导出预算计数。
- **FR-003**: 系统 MUST 在事务热路径仅写入 slim envelope（稳定锚点 + 最小可解释字段），不得在主链执行重投影和大对象裁剪。
- **FR-004**: 系统 MUST 将重投影与大对象裁剪放入异步按需流水线，并支持在无消费请求时跳过该流水线。
- **FR-005**: 系统 MUST 对导出事件强制 JsonValue 可序列化，出现降级时必须输出稳定 `downgrade.reason`。
- **FR-006**: 系统 MUST 保持稳定标识模型：instanceId/txnSeq/opSeq 可重建，且事件可派生稳定 eventId/txnId。
- **FR-007**: 系统 MUST 在 runtime 销毁时回收该 runtime 的观测缓存，并阻止迟到事件重建 latest 缓存。
- **FR-008**: 系统 MUST 提供 runtime 维度的观测查询/订阅能力，消费侧不得依赖全局共享可变状态。
- **FR-009**: 系统 MUST 在 diagnostics=off 时维持近零开销，不调度额外观测异步任务。
- **FR-010**: 系统 MUST 提供 forward-only 迁移说明，明确旧行为移除与新行为替代路径。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 建立可复现性能基线（before/after）并覆盖 diagnostics off/light/full 三档。
- **NFR-002**: 系统 MUST 使 diagnostics=light 时事务主链附加 p95 耗时相对改造前下降至少 40%。
- **NFR-003**: 系统 MUST 使 diagnostics=light 时事务主链附加分配量相对改造前下降至少 50%。
- **NFR-004**: 系统 MUST 在 diagnostics=off 时保持近零额外成本（相对 off 基线附加耗时 ≤5%，附加分配 ≤5%）。
- **NFR-005**: 系统 MUST 保证事务窗口禁止 IO/await，观测异步阶段不得回写事务内状态。
- **NFR-006**: 系统 MUST 保证诊断事件 Slim 且可序列化，禁止将闭包、Effect 本体或大型对象图写入 ring/buffer。
- **NFR-007**: 系统 MUST 记录并暴露观测裁剪/降级成本（例如 dropped/oversized/non_serializable）以支持解释链路。
- **NFR-008**: 系统 MUST 保持统一最小 IR 语义与稳定锚点，不得引入并行真相源。
- **NFR-009**: 若产生 breaking change，系统 MUST 提供迁移说明且不保留兼容层/弃用期（forward-only）。

### Key Entities _(include if feature involves data)_

- **RuntimeScopedEventBus**: 每个 runtime 独立的事件入口与分发上下文，负责隔离生命周期与序列号空间。
- **SlimEnvelope**: 事务热路径写入的最小事件包，包含 moduleId/instanceId/txnSeq/opSeq/kind/label 等稳定锚点。
- **RuntimeRingBuffer**: runtime 级有界事件窗口，维护事件列表、丢弃统计与 latest 索引。
- **ProjectionJob**: 异步按需重投影任务，负责大对象裁剪、可序列化转换与降级标注。
- **ObservabilityExportBudget**: 导出预算与降级计数的聚合实体，用于解释性能/可见性折中。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: diagnostics=light 下，事务主链附加 p95 耗时较改造前基线下降 ≥40%。
- **SC-002**: diagnostics=light 下，事务主链附加分配量较改造前基线下降 ≥50%。
- **SC-003**: 在同进程并发运行至少 10 个 runtime 的压力场景中，跨 runtime 事件串扰率为 0。
- **SC-004**: 导出到 Devtools/Evidence 的事件 100% 可序列化；所有被裁剪或降级事件均带稳定原因码。
- **SC-005**: diagnostics=off 场景下，无异步重投影任务产生，且附加性能开销保持在预算内（耗时与分配均 ≤5%）。
- **SC-006**: 文档与迁移说明完成，明确旧全局单例语义移除与新 runtime-scoped 语义切换方式。
