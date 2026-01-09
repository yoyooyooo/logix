# Feature Specification: E2E Latency Trace（端到端：action → txn → notify → commit）

**Feature Branch**: `092-e2e-latency-trace`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 补齐端到端可观测链路：让一次用户交互/Async Action 的稳定标识（txnId/linkId/opSeq）贯穿到外部存储通知、React commit 与可选的 paint 采样；Devtools 必须能解释“卡在 IO / 事务收敛 / 调度等待 / 渲染提交”的因果链路，并提供可复现的性能预算与采样策略。

## Context

“协调”如果不可解释，就无法形成可回归的工程能力。当前我们能看到零散的 runtime 诊断事件，但缺少端到端链路，导致：

- 不知道一次交互到底卡在 IO、事务收敛、通知调度，还是 React 渲染提交。
- 无法把性能门禁从“拍脑袋”变成“可复现证据”（尤其是诊断开销与采样策略）。

本特性把“端到端时间线”做成 Devtools 可消费的事实源：以 088 的 ActionRun 稳定标识为锚点，串联 089/090 的关键链路，并落到 React commit（可选 paint）级别的观测。

## Terminology

- **E2E Trace**：一条从触发源到 UI 可见结果的可解释时间线。
- **Segment**：时间线上的阶段片段（例如 IO、事务提交、notify、commit、paint）。
- **Sampling**：为了控制开销，对 trace/segment 的采样策略（开关、比例、白名单）。

## Assumptions

- 依赖 088：ActionRun 是 E2E trace 的主锚点；没有统一 action，就无法解释“这次 trace 属于哪次交互”。
- 依赖 089/090：optimistic/resource 的关键事件必须能挂到同一 action 链路，才能解释“为什么变快/为什么变慢”。
- 诊断默认近零成本：`diagnostics=off` 时不得引入显著开销；采样策略必须显式。

## Clarifications

### Session 2026-01-10

- AUTO: Q: E2E trace 的最小 segment 集合是什么？ → A: 最小集合固定为：`action:pending`、`io:wait`、`txn:commit`、`notify:scheduled`、`notify:flush`、`react:commit`、`action:settle`；`paint` 为可选增强（必须可关且默认不采集）。
- AUTO: Q: 时间线的时间源是什么？ → A: segment 的 start/end/duration 必须基于单调时钟（浏览器/Node 的 `performance.now()` 或等价单调源）；exportable 事件的 `timestamp` 字段可继续使用既有 epoch ms，但不得用它计算 segment 时间线（避免跳变与不可比）。
- AUTO: Q: 采样默认值与控制面是什么？ → A: 默认关闭；开启时至少支持 `enabled` + `sampleRate` + allowlist（按 `actionId`/`moduleId` 白名单）；采样关闭时必须接近零成本。
- AUTO: Q: React StrictMode/并发渲染下如何避免重复计费/误导？ → A: 只记录 commit 级别事件（不记录 render 次数），并以“快照锚点变化”去重（同一 commit 只记一次）；必要时在事件中附带去重信息以便解释。
- AUTO: Q: commit 与 action 的关联规则是什么？ → A: commit 事件必须关联到本次 commit 中的“主 action 链路 id”（来自 088 的 `linkId`）；若同一 commit 合并了多个链路，允许记录 `linkIds`（Slim、截断）并标注 `droppedLinkIdCount`。
- AUTO: Q: ring buffer 容量与体积控制的默认口径？ → A: 复用 DevtoolsHub 的有界 ring buffer（可配置容量）；trace 事件必须 Slim/可裁剪，体积控制优先靠采样与截断（不靠无限 buffer）。

### Session 2026-01-12

- Q: ring buffer 的默认容量是多少？ → A: 默认 `capacity=1000` events。

## Out of Scope

- 完整 profiler（火焰图/CPU profile）能力；本 spec 只交付结构化时间线与可解释链路。
- 把 paint 采样做成强依赖（浏览器 API 支持差异大）；paint 作为可选增强，必须可关且可采样。

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

### User Story 1 - 一眼看出卡在哪里（Priority: P1）

作为开发/排障人员，我能从 Devtools 中看到一次交互的端到端时间线，并明确“卡在 IO / 事务收敛 / 通知调度 / React commit”的主要原因与对应稳定标识。

**Why this priority**: 没有这个能力，所有“默认异步/optimistic/busy”最终都会变成黑盒体验，无法回归与定位。

**Independent Test**: 在示例中分别制造 IO 慢、收敛慢、notify 慢、commit 慢四种瓶颈，Devtools 时间线能区分主要段并给出可解释链路。

**Acceptance Scenarios**:

1. **Given** 某 action run 期间发生了 IO 与事务提交，**When** 查看 E2E trace，**Then** 能看到 IO 段与 txnCommit 段的耗时，并能关联到 action 链路 id 与 txnId。
2. **Given** notify 被低优先级延后，**When** 查看 E2E trace，**Then** 能看到 notifyDelay 段并解释原因（priority/合并/预算）。

---

### User Story 2 - 可回归的门禁与预算（Priority: P2）

作为维护者，我能为 trace 相关路径定义可复现的性能预算与回归门禁（包括 diagnostics on/off 的开销差异），并把证据落盘到 specs。

**Why this priority**: 端到端 trace 本身会带来开销；如果不量化，就会违反“诊断默认近零成本”的宪法。

**Independent Test**: 在同一 perf workload 下对比 diagnostics off/on，能得到可比的 before/after/diff，并且 off 下回归在预算内。

**Acceptance Scenarios**:

1. **Given** diagnostics=off，**When** 跑 perf workload，**Then** 不引入显著额外分配/耗时（阈值在 plan.md 固化）。
2. **Given** diagnostics=on（采样开启），**When** 跑 perf workload，**Then** 诊断开销可度量且在预算内，事件 payload Slim 且 ring buffer 有界。

---

### User Story 3 - 采样与隐私/体积控制（Priority: P3）

作为平台维护者，我能用采样策略控制 trace 的开销与体积：按比例/白名单/事件类型采样，并保证导出的数据可序列化、可裁剪。

**Why this priority**: 没有采样与体积控制，trace 会污染核心路径与 devtools 存储。

**Independent Test**: 设置采样率后，事件数量与体积按预期变化；采样关闭时不产出事件。

**Acceptance Scenarios**:

1. **Given** 采样关闭，**When** 触发 action，**Then** 不产出 trace 事件且无额外开销。
2. **Given** 采样开启（如 1%），**When** 触发大量 action，**Then** trace 事件数量与体积可控，且每条事件均可序列化。

### Edge Cases

- React StrictMode/并发渲染：同一 action run 可能触发多次 render/commit；trace 必须能解释并避免重复计费误导（commit 去重为硬门槛）。
- 取消/覆盖：被取消的 run 也应有可解释的 trace 终态（cancelled），避免悬挂。
- 多模块联动：同一 action 触发多个模块事务时，trace 如何聚合与 drill-down（保持 Slim）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 E2E trace 的稳定锚点：至少包含 action 链路 id（来自 088）与可关联的 `txnId/txnSeq/opSeq`（或等价字段）。
- **FR-002**: 系统 MUST 定义最小 segment 集合：至少覆盖 IO、txnCommit、notify、commit（paint 可选；不要求记录 render 次数）。
- **FR-003**: 系统 MUST 能将 segment 关联到可解释原因（例如 notifyDelay 的 priority/合并/预算；取消原因）。
- **FR-004**: 系统 MUST 提供采样控制面（开关/比例/白名单），且采样关闭时接近零成本。
- **FR-005**: 系统 MUST 输出 Slim、可序列化事件（JsonValue），并存储在有界 ring buffer 中。
- **FR-006**: Devtools MUST 提供最小可用展示：能从 action run drill-down 到对应的 segment 时间线，并能定位主要瓶颈段。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: diagnostics/off 的近零成本为硬门槛：采样关闭时不得引入显著额外耗时/分配；开启采样时开销必须可度量且在预算内。
- **NFR-002**: 事件 payload 必须 Slim/可序列化；不得包含不可序列化对象（函数/DOM/原生 Error 等），必须 downgrade 并标注原因。
- **NFR-003**: ring buffer 必须有界；必须可配置容量与采样率；默认容量固定为 `capacity=1000` events（可配置）；采样率等其余默认值在 plan.md 记录。
- **NFR-004**: 不得破坏 React 无 tearing：采样/事件记录不得引入双真相源或“render 读到不一致快照”。
- **NFR-005**: 若引入新的对外心智模型（E2E trace），MUST 同步补齐用户文档（≤5 关键词 + segment 解释 + 采样开关 + 常见瓶颈），并与诊断字段保持一致，避免术语漂移。

### Key Entities _(include if feature involves data)_

- **TraceId / ActionLinkId**：E2E trace 的主锚点（复用 088 链路）。
- **TraceSegment**：时间线片段（kind + start/end + reason）。
- **TraceSampleConfig**：采样配置（开关/比例/白名单）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对一个 action run，Devtools 能展示端到端时间线（IO/txnCommit/notify/commit）并能定位主要瓶颈段（可通过示例注入不同瓶颈进行断言）。
- **SC-002**: diagnostics=off（采样关闭）下 perf evidence 门禁达标：`pnpm perf diff` 的 `meta.comparability.comparable=true` 且 `summary.regressions==0`（门禁口径在 plan.md 固化）。
- **SC-003**: 采样开启后，事件数量与体积按配置可控（例如 1% 采样），且所有事件可序列化并存储在有界 ring buffer。
