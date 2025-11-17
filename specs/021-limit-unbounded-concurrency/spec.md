# Feature Specification: 并发护栏与预警（限制无上限并发）

**Feature Branch**: `021-limit-unbounded-concurrency`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: 用户希望允许在 Logic/watcher 中并发执行，但担心“无上限并发”导致不可控/不可检测/不可预警/崩溃；本需求按“默认安全 + 显式放开 + 可观测/可预警 + 最佳实践”落地。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 默认安全的并行 watcher（Priority: P1）

作为业务开发者，我可以在需要时开启“并行处理事件”的 watcher，而不必担心因为突发事件或任务量过大导致应用卡死/崩溃。

**Why this priority**: 这是最基础的安全性保障；一旦失控，影响面是“整应用不可用”。

**Independent Test**: 在一个最小模块中构造高频事件触发并行处理，验证系统会自动限制并发并给出可定位的告警，同时模块仍可继续处理后续事件。

**Acceptance Scenarios**:

1. **Given** 默认配置启用并行 watcher，**When** 突发触发大量事件（明显超过默认并发上限），**Then** 同时运行的任务数不会无限增长，系统持续可用。
2. **Given** 事件处理速度持续低于事件产生速度，**When** 等待积压超过预警阈值，**Then** 系统产生结构化诊断信号并提示优化路径。
3. **Given** 业务 action/关键 task 通道为“必达（不能丢）”，**When** 积压达到系统的背压上界，**Then** 系统通过背压让入口/触发变慢而不是继续堆内存；所有事件最终都会被处理，且不会出现静默丢失。

---

### User Story 2 - 显式启用无上限并发（Priority: P2）

作为业务开发者，当我确实需要“无上限并发”（例如短时批处理、一次性 fan-out）时，我可以显式打开该能力，并在运行时获得风险提示与可追踪证据。

**Why this priority**: 允许少量高级用法，但必须避免“默认踩坑”。

**Independent Test**: 在同一最小模块中显式启用无上限并发，验证系统会记录一次高严重度提示，并且该设置可被观测/审计。

**Acceptance Scenarios**:

1. **Given** 开发者显式启用无上限并发，**When** 运行并行 watcher，**Then** 系统产生一次高严重度诊断提示，且可定位到模块与触发源。

---

### User Story 3 - 可观测与调优闭环（Priority: P3）

作为运行时维护者/高级用户，我希望能通过统一的诊断信号快速回答：是否存在并发失控、瓶颈在何处、应该用什么调优动作（调整并发上限/更换触发策略/拆分任务）。

**Why this priority**: 只有“限流”不足以排障；需要能解释“为什么慢/为什么积压”。

**Independent Test**: 在一个可复现的压力用例中，验证诊断信号包含最小但足够的上下文（模块、触发源、阈值、观测值），并给出可执行的提示。

**Acceptance Scenarios**:

1. **Given** 发生并发积压或任务过多，**When** 系统产生诊断信号，**Then** 该信号能在不查看源码的情况下指导开发者完成一次有效的调优动作。

---

### Edge Cases

- 并行任务包含长耗时或永不结束的任务时，系统如何避免等待/积压无限增长？
- 并行任务中部分失败、部分成功时，系统如何保证错误不丢失且不会拖垮整个模块？
- 模块销毁/挂起/恢复时，运行中的并行任务如何收敛，避免泄漏与“幽灵回写”？
- 并发嵌套（并行 watcher 内再启动并行 fan-out）时，系统如何保证观测与预警仍有效？
- 多模块同时高并发时，是否会出现“某个模块占满资源导致其他模块饥饿”的情况？
- 当业务通道触发背压时，调用方若持续“fire-and-forget”（不 await）会产生大量挂起 fiber；系统如何给出可解释诊断并提供最佳实践（batch/await/节流）？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为“并行事件处理模式”提供默认并发上限，默认值为 **16**，且默认启用（默认安全）。
- **FR-002**: 系统 MUST 提供与既有控制面一致的配置入口：运行时默认（全局）、按模块标识的覆盖（局部模块）、以及局部作用域覆盖（例如子树/会话）；覆盖配置必须是显式的，并可被诊断信号观察到。
- **FR-003**: 系统 MUST 为覆盖定义确定性优先级与生效时机：`provider（scope_override） > runtime_module > runtime_default > builtin`，且配置从**下一笔事务/操作窗口**开始生效（不得打断半笔执行）。
- **FR-004**: 系统 MUST 支持显式启用“无上限并发”模式；启用时必须产生一次高严重度诊断提示，并包含风险说明与替代建议。
- **FR-005**: 系统 MUST 在发生“并发压力异常”时产生结构化诊断信号，至少覆盖：并发上限、当前并发、等待积压（数量或时间）、触发源标识、模块标识，以及**生效配置来源**（`configScope`）。
- **FR-006**: 系统 MUST 提供可配置的预警阈值（默认：等待积压超过 **1000** 或持续超过 **5s** 触发预警），并避免重复刷屏（同一触发源在冷却窗口内合并/降噪）。
- **FR-007**: 系统 MUST 保证并行任务的失败不会被静默吞掉；当错误未被业务显式处理时，必须转化为可定位的错误/诊断事件。
- **FR-008**: 系统 MUST 在模块生命周期结束时收敛该模块启动的并行任务，避免资源泄漏与销毁后的回写。
- **FR-009**: 系统 MUST 提供迁移说明：对依赖“默认无限并发语义”的既有用法，给出可选路径（显式开启无上限 / 调整上限 / 改用其他触发策略）。
- **FR-010**: 系统 MUST 提供一份面向业务开发者的最佳实践文档，解释何时使用顺序/最新/排他/并行，以及如何用诊断信号完成调优闭环。
- **FR-011**: 系统 MUST 将“业务 action / 关键 task 触发”定义为**必达通道（不能丢）**：不得丢弃、不得静默跳过；当达到背压上界时，必须通过背压等待实现“必达 + 有界”，不得以 “queue full” 等错误形式拒绝。
- **FR-012**: 系统 MUST 保证背压等待不发生在 StateTransaction 事务窗口内；若需要等待，必须发生在事务窗口之外（例如入口外侧，或事务 commit 之后的 post-commit 阶段）。
- **FR-013**: 系统 MUST 将诊断/Devtools/Trace 等非关键通道视为可降级通道：允许采样/降噪/降级以避免反向拖垮业务；但必须提供可观测的采样/丢弃计数与原因，确保可解释。

### Scope

**In Scope**:

- 默认并发上限与可配置覆盖（运行时/模块级）。
- 显式启用“无上限并发”的入口与风险提示。
- 并发压力诊断与预警（含降噪/合并策略）。
- 业务 action/关键 task 通道的必达背压语义（不能丢、背压有界、事务窗口外等待）。
- 迁移说明与最佳实践文档更新。

**Out of Scope**:

- 自动改写/拦截业务代码内部的并发实现（仅提供默认安全策略与可观测/可预警能力）。
- 默认引入“丢弃/合并事件”这类语义变更（除非用户显式选择相应策略）。
- 对外部系统（第三方 API、数据库等）的全局限速策略。
- 对“非合作调用方”提供严格内存上界保证：若调用方持续 fire-and-forget 产生大量挂起 fiber，内存压力可能转移到调用方侧；本特性提供诊断与最佳实践，但不尝试在运行时强行吞并/丢弃业务事件。

### Assumptions & Dependencies

- **Assumption**: 项目已有统一的诊断事件通道与查看方式（日志或 Devtools），本需求只要求新增信号与解释，不强制新增完整 UI。
- **Assumption**: 诊断/Devtools/Trace 通道允许按环境采样或降噪（例如 prod 只保留错误及其前序 N 步），且采样事实可被观测。
- **Dependency**: 运行时支持注入/覆盖配置，并能稳定标识模块与触发源，用于诊断与预警定位。
- **Dependency**: 运行时存在明确的“配置作用域”概念（例如局部子树/会话范围），且该作用域能被审计为 `configScope`。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: System MUST 为受影响的热路径定义性能预算并记录可复现的基线（处理速度、尾部延迟、内存增长趋势），用于验证“默认限流/预警”不会引入不可接受的额外开销。
- **NFR-002**: System MUST provide structured diagnostic signals for key state /
  flow transitions, and diagnostics MUST have near-zero overhead when disabled.
- **NFR-003**: System MUST use deterministic identifiers for instances/transactions
  in diagnostic and replay surfaces (no random/time defaults).
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO/async
  work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes runtime performance boundaries or introduces
  an automatic policy, the project MUST update user-facing documentation to provide
  a stable mental model: (≤5 keywords), a coarse cost model, and an “optimization ladder”
  (default → observe → narrow writes → stable rowId → module/provider override & tuning → split/refactor).
  Vocabulary MUST stay aligned across docs, benchmarks, and diagnostic evidence fields.
- **NFR-006**: If this feature relies on internal hooks or cross-module collaboration
  protocols, the system MUST encapsulate them as explicit injectable contracts
  (Runtime Services) that are mockable per instance/session, and MUST support exporting
  slim, serializable evidence/IR for a controlled trial run in Node.js or browsers
  without relying on process-global singletons.

### Key Entities _(include if feature involves data)_

- **Concurrency Policy**: 表示“并发上限/预警阈值/是否允许无上限并发/降噪策略”等一组可配置的运行时策略（面向运行时与模块级别）。
- **Concurrency Diagnostic Signal**: 表示在并发压力异常时产出的结构化诊断信号，用于定位、预警与调优闭环（要求 slim、可序列化、可关联到模块与触发源）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在默认策略下，可验证“并行事件处理模式”的同时运行任务数不会超过默认并发上限（16）。
- **SC-002**: 当等待积压超过默认阈值（积压>1000 或持续>5s）时，系统在 **1s** 内产生至少一条可定位的预警诊断信号。
- **SC-003**: 诊断关闭时，在基准用例中引入的性能回归满足：处理速度与资源消耗相对基线 **≤ 2%**。
- **SC-004**: 开发者显式启用无上限并发时，系统必定产生一次高严重度提示，并可在日志/诊断流中检索到。
- **SC-005**: 文档提供的“调优梯子”至少覆盖 3 个常见场景（高频触发、长耗时任务、嵌套并发），且每个场景都有可复现步骤与可验证结果。
- **SC-006**: 在必达背压通道启用后，压力用例中不会出现业务事件静默丢失；当达到背压上界时入口延迟可观察上升，但内存中的积压不会无限增长（有明确上界或可证伪的趋势上界）。
