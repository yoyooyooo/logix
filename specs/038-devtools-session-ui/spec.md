# Feature Specification: Logix Devtools Session-First 界面重设计

**Feature Branch**: `[038-devtools-session-ui]`  
**Created**: 2025-12-26  
**Status**: Draft  
**Input**: User description: "基于 07/08 的构想，重新设计 Devtools 的界面（Session First + Advisor + 脉冲/收敛）。"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 以「交互会话」为入口定位问题 (Priority: P1)

作为使用 Logix 的业务开发者，我希望 Devtools 默认不是一条“流水账时间线”，而是把一次用户操作（或一次外部触发）聚合成一条「交互会话（Interaction Session）」。

我进入 Devtools 后，能立刻看到最近的会话列表（按时间倒序），每条会话都有一个清晰的“健康信号”（例如：提交次数过多、耗时过长、影响范围过大），并能在点击后进入该会话的详情工作台，从而快速定位“哪里不健康、为什么不健康”。

**Why this priority**: 这是 07/08 的范式转换核心；没有会话聚合与健康信号，用户仍会被事件噪音淹没，无法在 10 秒内建立直觉与方向。

**Independent Test**: 仅实现“会话列表 + 会话详情概览（指标/状态）”即可形成最小可用：开发者无需读全量事件就能定位一次操作的成本与结果。

**Acceptance Scenarios**:

1. **Given** 应用中启用了 Devtools 且 Devtools 面板打开，**When** 用户触发一次可识别的入口操作（例如一次 action 派发），**Then** 会话列表中新增一条会话，包含标题（入口标签）、状态（Running/Settled）、耗时、提交次数、渲染次数与健康等级（ok/warn/danger）。
2. **Given** 会话列表中存在一条 warn/danger 会话，**When** 用户点击该会话，**Then** 右侧详情页展示该会话的概览：触发源（入口）、结果（状态变更摘要/最终状态快照入口）、成本（提交次数/耗时/渲染次数）与可下钻的二级视图入口（Timeline/Canvas）。

---

### User Story 2 - Devtools 给出“处方”，而不是只给数据 (Priority: P2)

作为开发者，我希望 Devtools 不仅告诉我“发生了什么”，还能根据会话中的模式自动给出可执行建议（Convergence Advisor），并明确展示证据。

例如：出现多次提交（疑似 waterfall）、出现写入影响面不可判定（dirty_all/unknown_write）、出现 converge 预算止损（degraded），Devtools 应提示“可能原因”与“优先处理动作”，而不是要求我自己猜。

**Why this priority**: 07 强调“Active Prescription”；在复杂场景下，数据展示的边际价值很快递减，处方能显著降低排障门槛。

**Independent Test**: 仅基于会话指标与已有的诊断事件/证据，产出一条 Advisor 卡片（含证据 + 建议）即可独立验证价值。

**Acceptance Scenarios**:

1. **Given** 某次会话满足“提交次数 > 1”或“存在 degraded/dirty_all 类证据”，**When** 用户打开该会话详情，**Then** Advisor 面板至少展示 1 条 Finding，包含：结论、证据摘要（可引用具体指标/次数/字段），以及 1 条以上可执行建议。

---

### User Story 3 - 在不丢失细节的前提下降噪 (Priority: P3)

作为开发者，我仍然需要在必要时查看底层事件与状态快照，但这些细节应当是“二级视图”，并能与会话聚合保持一致（点击会话即可自动过滤到对应范围）。

**Why this priority**: 保持可解释性与可信度：当 Advisor 或概览提示异常时，用户要能快速自证与下钻。

**Independent Test**: 在会话详情中提供 “Timeline（过滤）+ 状态 Inspector（过滤）” 即可验证；不要求首先实现完整画布。

**Acceptance Scenarios**:

1. **Given** 用户已选中某条会话，**When** 用户切换到该会话的 Timeline 视图，**Then** 只展示该会话范围内的事件（并提供“显示全部”回到全局视角），且事件顺序与会话耗时一致。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- 没有任何可观测会话时（无运行中 Runtime / 无入口事件），应提供清晰空态与引导。
- 同时存在多个 Runtime / Module / Instance 时，会话必须按当前选择进行范围约束；切换选择后会话列表/详情应同步更新。
- 会话内缺失关键字段（例如没有 txnId、事件被裁剪/丢弃）时，仍应生成会话但标注“证据不足”，Advisor 也应能解释缺口。
- 会话持续较长（存在异步链路）时，应表现 Running→Settled 的状态变化，不应将其拆成多个不可关联的碎片。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Devtools MUST 将观测数据按「交互会话（Interaction Session）」聚合，并将会话列表作为默认主视图。
- **FR-002**: 每条会话 MUST 提供：标题（入口标签）、状态（Running/Settled）、开始/结束时间、持续时间、事件数、提交次数（txn/commit count）、渲染次数（view impact）以及健康等级（ok/warn/danger）。
- **FR-003**: Devtools MUST 支持“Live 跟随模式”与“Pinned 固定模式”：Live 模式下列表自动滚动并高亮新会话；Pinned 模式下不会被新会话打断，并提供“Back to live”回到实时视角。
- **FR-004**: 会话详情页 MUST 是一个“诊断工作台（Master-Detail）”，至少包含：
  - 概览：入口、成本摘要、结果摘要；
  - Advisor：Findings 列表（结论/证据/建议）；
  - 二级视图入口：Timeline（过滤）与状态 Inspector（过滤）。
- **FR-005**: Devtools MUST 将 Timeline/Inspector 与会话范围联动：选中会话后默认只展示该会话范围内的数据，并允许一键回到全局视角。
- **FR-006**: Devtools MUST 提供可解释的健康等级判定：当等级为 warn/danger 时，必须能在详情中解释触发原因（基于指标阈值或证据事件）。
- **FR-007**: Devtools MUST 在会话内展示“提交脉冲（commit/txn pulses）”的可视化（形式不限定），让用户直观看到一次会话内发生了多少次提交以及它们的时间分布。
- **FR-008**: Advisor MUST 基于至少以下模式给出处方（可逐步扩展）：
  - 提交次数过多（疑似 waterfall）；
  - 收敛预算止损/降级（degraded）；
  - 写入影响面不可判定（dirty_all/unknown_write 或等价信号）。
- **FR-009**: Devtools MUST 继续支持多 Runtime/Module/Instance 的选择与过滤，并将会话与详情严格限定在当前选择范围内。
- **FR-010**: Devtools MUST 支持导入/导出“证据包（evidence package）”用于离线查看；离线查看时必须保留会话聚合、健康等级与 Advisor 的一致性。

### Assumptions

- 会话的事实源以“入口操作（例如 action 派发）”为主；当缺失入口时允许退化为基于时间窗口的聚合，但必须在 UI 中标注退化原因。
- 会话的健康阈值提供默认值（可配置，但不作为本 spec 的强制范围）：提交次数阈值、渲染影响阈值、耗时阈值。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: System MUST define performance budgets for the affected hot paths
  and record a measurable baseline (benchmark/profile) before implementation.
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

- **Interaction Session**: 一次入口触发到系统稳定（Settled）的聚合单元，包含范围、指标、健康等级与下钻入口。
- **Session Metric**: 会话成本与结果的可比较指标（提交次数、耗时、渲染影响、事件量等）。
- **Advisor Finding**: 由规则识别的诊断结论，包含证据摘要与可执行建议。
- **Evidence Package**: 可导入/导出的离线证据载体，用于复现会话聚合与诊断视图。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在一次典型交互后（产生至少 1 次提交），Devtools 会话列表能在 200ms 内出现该会话，并展示提交次数与健康等级。
- **SC-002**: 当一条会话被标记为 warn/danger 时，详情页能明确指出触发原因（阈值命中或证据事件），无需用户阅读全量 timeline。
- **SC-003**: 对于 500 条规模的离线证据包，打开 Devtools 并切换会话/视图时 UI 不应出现 >200ms 的卡顿（单次交互冻结）。
- **SC-004**: Advisor 至少覆盖 3 类高价值问题模式（提交次数过多 / 收敛降级 / 写入影响面不可判定），并在匹配时提供可执行建议。
- **SC-005**: 在 Devtools 关闭或禁用的情况下，系统诊断开销保持近零（不会因 UI 重设计引入新的强制观测成本）。
- **SC-006**: 同一份证据包在导入后，生成的会话数量、会话范围与会话指标应保持确定性（结果可被自动化测试验证）。
