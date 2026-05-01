# Feature Specification: O-008 调度平面统一（Scheduling Surface）

**Feature Branch**: `098-o008-scheduling-surface`
**Created**: 2026-02-25
**Status**: Planned
**Input**: 用户要求统一 `txnQueue + TickScheduler + ConcurrencyPolicy` 的决策面，保证队列/tick/并发策略同源，并让 backlog/degrade 诊断事件与真实调度行为一一对应。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-9, NS-10
- **Kill Features (KF)**: KF-5, KF-8

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 单一调度策略面（Priority: P1）

作为 runtime 维护者，我希望 txn queue、tick 调度与并发限制使用同一份调度策略快照，这样我可以在一个地方理解“为什么这次退化/背压发生”。

**Traceability**: NS-9, KF-5

**Why this priority**: 这是 O-008 的主目标；如果策略面仍然分裂，后续诊断与调优链路无法闭合。

**Independent Test**: 构造同一批高压输入，验证 queue/tick/concurrency 三处观测到一致的策略字段与作用域来源，且行为一致。

**Acceptance Scenarios**:

1. **Given** 模块存在 runtime_default + runtime_module + provider 三层覆盖，**When** 一笔事务进入调度链路，**Then** queue/tick/concurrency 使用同一份解析结果并遵守同一优先级。
2. **Given** 策略在事务边界之间发生更新，**When** 下一笔事务开始，**Then** 新事务完整使用新策略，已在执行中的事务不出现半途策略漂移。

---

### User Story 2 - backlog/degrade 语义与行为对齐（Priority: P1）

作为可观测性使用者，我希望 backlog/degrade 事件能严格映射真实调度动作（等待、降级、强制 yield、恢复），避免“看见事件但解释不了行为”。

**Traceability**: NS-10, KF-8

**Why this priority**: O-008 的验收核心就是“事件与行为一一对应”，否则运维与调优会误判。

**Independent Test**: 在可复现压测中采集调度事件与执行轨迹，验证每次 backlog/degrade 事件都能对应到唯一调度事实，且不存在无行为事件或无事件行为。

**Acceptance Scenarios**:

1. **Given** 入口积压超过阈值触发 backlog，**When** 事件产出，**Then** 必须存在对应的等待/背压事实，并可回链到稳定标识（instanceId/txnSeq/opSeq）。
2. **Given** tick 因预算或饥饿保护触发 degrade，**When** 事件产出，**Then** 必须存在对应 boundary 变化（microtask→macrotask 或等价退化）且原因一致。
3. **Given** 系统恢复到稳态，**When** 事件流继续输出，**Then** 不得持续重复输出与当前行为不一致的 degrade/backlog 噪声事件。

---

### User Story 3 - 调优与迁移可交接（Priority: P2）

作为业务开发者，我希望获得统一的调度配置心智模型和迁移说明，能够从旧的分散配置平滑切换到统一策略面，并用同一套诊断字段完成调优。

**Traceability**: NS-9, NS-10, KF-5, KF-8

**Why this priority**: 没有清晰迁移路径会导致并行任务继续写入旧入口，破坏 forward-only 演进目标。

**Independent Test**: 按 quickstart 执行“默认策略→模块覆盖→provider 覆盖→压测诊断”流程，验证文档、事件字段、代码行为一致。

**Acceptance Scenarios**:

1. **Given** 旧配置入口用户升级到新版本，**When** 按迁移说明替换配置，**Then** 可在不加兼容层的前提下得到等价或更强的调度控制能力。
2. **Given** 用户只阅读中文文档与诊断事件，**When** 进行一次调优，**Then** 可以用统一术语定位问题并完成参数调整。

---

### Edge Cases

- 同时出现 `allowUnbounded=true` 与严格 backlog 限制时，系统如何定义优先行为并给出可解释事件。
- 高并发下策略解析结果如果在一个调度窗口内被重复读取，如何保证“同源快照”而非多次漂移解析。
- backlog 阈值刚好在边界附近抖动时，如何避免 degrade/backlog 事件抖动刷屏并保持因果可解释。
- 在事务窗口内禁止 IO 约束下，等待/让出行为必须发生在事务外侧，避免引入不可回放的不确定性。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-9, KF-5) 系统 MUST 提供统一的 scheduling policy surface，覆盖队列、tick、并发三个决策面，三者读取同一语义集合。
- **FR-002**: (NS-9, KF-5) 系统 MUST 定义单一策略解析优先级与来源标记（provider > runtime_module > runtime_default > builtin），并在调度事件中可见。
- **FR-003**: (NS-9) 系统 MUST 保证一个调度决策窗口内使用同一份策略快照，避免 queue/tick/concurrency 各自二次解析造成漂移。
- **FR-004**: (NS-10, KF-8) 系统 MUST 统一 backlog 与 degrade 事件语义：事件类型、原因字段、阈值字段与行为事实之间一一对应。
- **FR-005**: (NS-10, KF-8) 系统 MUST 为 backlog/degrade 事件提供可序列化 slim 载荷，并包含稳定锚点字段（instanceId/txnSeq/opSeq/moduleId）。
- **FR-006**: (NS-10) 系统 MUST 在冷却窗口内做事件降噪，且降噪不得掩盖关键状态转变（触发/恢复/再次触发）。
- **FR-007**: (NS-9) 系统 MUST 保持事务窗口禁止 IO 的边界：调度等待与 host yield 等异步动作只能在事务外执行。
- **FR-008**: (NS-9, KF-5) 系统 MUST 提供面向业务开发者的统一调度配置入口与迁移说明，不保留兼容层。

### Scope

**In Scope**:

- 统一 queue/tick/concurrency 的策略决策面与解析优先级。
- 统一 backlog/degrade/recover 诊断语义与字段口径。
- 补齐与策略一致性的自动化测试与最小性能证据。
- 同步中文文档与迁移说明（forward-only）。

**Out of Scope**:

- 引入第二套新运行时或替换 Effect 执行模型。
- 新增与 O-008 无关的业务 DSL 能力。
- 为历史行为保留兼容层或弃用窗口。

### Assumptions & Dependencies

- **Assumption**: 现有 runtime 已具备稳定标识链（instanceId/txnSeq/opSeq）并可挂载到诊断事件。
- **Assumption**: 现有诊断基础设施支持 slim 可序列化事件并可被 Devtools 消费。
- **Dependency**: 需要复用并扩展现有并发策略解析与 tick 调度入口，避免并行真相源。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-9) 触及 runtime 核心路径时 MUST 提供 before/after 性能基线（至少覆盖吞吐、p95 延迟、内存/分配趋势），并保证默认配置下回归不超过 5%。
- **NFR-002**: (NS-10, KF-8) 诊断事件 MUST 默认为 slim 且可序列化；诊断关闭或低级别时开销应接近零，不得成为热路径主成本。
- **NFR-003**: (NS-10) 诊断链路 MUST 使用稳定标识（instanceId/txnSeq/opSeq），禁止随机或 wall-clock 作为主锚点。
- **NFR-004**: (NS-9) scheduling policy surface 的字段语义 MUST 在 Runtime 配置、诊断事件、文档示例中保持一致，避免术语漂移。
- **NFR-005**: (NS-9) 如产生破坏性变更，MUST 在 plan/quickstart/PR 中提供迁移说明，且不引入弃用期兼容分支。

### Key Entities _(include if feature involves data)_

- **SchedulingPolicySurface**: 统一调度策略视图，描述并发上限、backlog 容量/阈值、tick 退化边界、告警冷却等字段及其来源。
- **SchedulingDecisionWindow**: 一次可解释的调度决策范围（事务入口到调度动作完成），要求读取同一策略快照。
- **SchedulingDiagnosticEvent**: 调度诊断事件（backlog/degrade/recover），载荷 slim、可序列化、可回链稳定锚点。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在压测样例中，queue/tick/concurrency 三处采集到的策略来源与关键字段一致率达到 100%。
- **SC-002**: backlog/degrade 事件与调度事实（等待/退化/恢复）双向对齐准确率达到 100%，不存在孤立事件或无事件行为。
- **SC-003**: 新增回归测试至少覆盖：backlog 触发、degrade 触发、策略覆盖优先级一致性，且在 CI 中稳定通过。
- **SC-004**: 默认策略下性能基线回归满足：吞吐下降 ≤ 5%，p95 延迟上升 ≤ 5%，内存峰值增长 ≤ 5%。
- **SC-005**: 中文文档与 quickstart 完成同步，用户可在 30 分钟内按文档复现实验并定位一次 backlog/degrade 事件成因。
