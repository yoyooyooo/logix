# Feature Specification: Async Coordination Roadmap（协调优先：从混乱到可验收闭环）

**Feature Branch**: `087-async-coordination-roadmap`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 建立一套 Async 协调路线的总控 Spec（group）：把 Logix 在 React 场景的异步体验（Transition/Suspense/Optimistic/Busy 指示/可诊断链路）拆成可并行推进的子 specs，并提供 registry/checklist 作为单入口。

## Context

React Conf 2024 的 “Async React” 强调：异步 UI 的核心难题不是“更快”，而是“协调”（中间态、反馈节奏、避免闪烁、可解释链路）。Logix 已经具备若干关键积木（事务窗口、优先级通知、RuntimeProvider 的 suspend/defer 策略、稳定锚点与 Slim 诊断事件），但仍缺少几块“框架层默认存在”的拼图，导致业务侧仍容易散落手写 loading/optimistic/取消/回滚等胶水。

本 group spec 的职责是：把这些缺口拆解为互斥、可并行、可验收的成员 spec，并提供统一的调度入口与门槛视图，避免并行真相源。

## Clarifications

### Session 2026-01-10

- AUTO: Q: 成员 spec 的“实施前产物齐全”门槛包含哪些？ → A: 统一要求齐全：`spec.md`、`plan.md`、`tasks.md`、`research.md`、`data-model.md`（允许写 N/A，但必须说明原因与替代门槛）、`contracts/README.md`（允许写 N/A，但必须说明原因）、`quickstart.md`、`checklists/requirements.md`。
- AUTO: Q: group 层是否允许复制成员实现任务/协议细节？ → A: 不允许；087 只做 registry/checklist 的索引与门槛归纳，任何实现细节以成员 spec 为单一事实源。

## Scope

### In Scope

- 提供成员 spec 的清单、依赖与状态（SSoT：`spec-registry.json`）。
- 提供 group 执行清单（index-only），把“推进顺序/证据门禁/里程碑”收敛为单入口（`checklists/*`）。
- 明确每个成员 spec 的“可验收闭环”定义：必须包含 `spec.md`（WHAT/WHY）、`plan.md`（HOW）、`tasks.md`（可执行分解）、`quickstart.md`（验收步骤）。

### Out of Scope

- 不在本 group spec 内实现任何 runtime/react/devtools 代码；实现发生在各 member spec。
- 不复制 member 的实现 tasks（只链接跳转入口），避免并行真相源。

## Members（本路线拆分）

- `specs/088-async-action-coordinator/`：统一 Async Action / Transition 协调面（pending/完成/失败/取消 + 稳定标识贯穿）。
- `specs/089-optimistic-protocol/`：Optimistic 更新协议（一等公民：确认/回滚/撤销/冲突裁决 + 可回放/可诊断）。
- `specs/090-suspense-resource-query/`：Suspense 友好的 Resource/Query（缓存/去重/失效/预取/取消 + 与入口/路由默认异步对齐）。
- `specs/091-busy-indicator-policy/`：Busy Indicator 策略标准化（延迟显示/最短显示/避免闪烁/自适应）。
- `specs/092-e2e-latency-trace/`：端到端链路（txnId/linkId/opSeq → notify → render/commit/可选 paint）可观测与可解释。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 只记一个编号也能推进（Priority: P1）

作为 runtime/平台贡献者，我只需要记住“087”，就能找到下一步要推进的成员 spec、它们的依赖顺序与入口文档（spec/plan/tasks/quickstart）。

**Why this priority**: 解决“碎片化规划难以执行”的问题；让推进路径可交接、可并行。

**Independent Test**: 打开 `specs/087-async-coordination-roadmap/spec-registry.md` 与 `checklists/group.registry.md`，能在 2 分钟内定位：应该先做哪个 spec、去哪里执行 tasks、以及验收需要哪些证据。

**Acceptance Scenarios**:

1. **Given** group registry 已登记成员与依赖，**When** 我需要推进某一缺口（如 optimistic），**Then** 我能通过 group checklist 跳转到对应 member 的 `tasks.md` 并开始执行。
2. **Given** 成员 spec 进入 implementing/done，**When** 我刷新 group checklist，**Then** checklist 能反映最新状态且不需要手工复制任务清单。

---

### User Story 2 - 可验收的门槛与证据回写（Priority: P2）

作为 reviewer，我能在 group 层面看到每个成员 spec 的“是否达标”口径（perf evidence / 诊断事件 / 无 tearing / 迁移说明），并通过链接检查产物是否齐全。

**Why this priority**: 让“协调能力”不只停留在概念上，而是落到可验收闭环（证据、诊断、迁移）。

**Independent Test**: 任取一个 member spec，reviewer 能根据 group checklist 逐条核对：是否有 plan 中的性能证据计划、是否有 quickstart、是否声明了 breaking change 迁移说明落点。

**Acceptance Scenarios**:

1. **Given** member spec 触及核心路径，**When** reviewer 查看其 plan，**Then** 能找到明确的 Perf Evidence Plan（before/after/diff 的落点与可比性要求）。
2. **Given** member spec 声称“可解释”，**When** reviewer 查看其 spec/plan，**Then** 能找到 Slim/可序列化诊断事件的定义与成本约束。

---

### User Story 3 - 防并行真相源（Priority: P3）

作为维护者，我能用脚本从 registry 推导成员并生成 group checklist；group 文档不复制实现细节，从而长期可维护、不漂移。

**Why this priority**: 避免“总控文档和成员 spec 两套任务清单”导致的漂移与维护成本。

**Independent Test**: 修改 `spec-registry.json`（新增/变更依赖/改状态）后，重新生成 checklist，输出稳定且只依赖 registry（md 仅阐述）。

**Acceptance Scenarios**:

1. **Given** 只更新 `spec-registry.json`，**When** 重新生成 group checklist，**Then** checklist 能反映变化且无额外手工维护点。

### Edge Cases

- 新增候选 spec：必须先登记进 `spec-registry.json`，再生成 checklist（禁止只在 md 里出现）。
- 依赖关系改变：必须同步更新 json（SSoT），并在 md 中解释原因与迁移影响。
- 成员 spec 状态与目录不一致：group checklist 视为发现机制，应提示并要求纠正（以 json 为准）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供 group registry 的 SSoT：`specs/087-async-coordination-roadmap/spec-registry.json`，包含成员 id、目录、状态与依赖（机器可读）。
- **FR-002**: 系统 MUST 提供人读阐述：`specs/087-async-coordination-roadmap/spec-registry.md`，解释里程碑、门槛与注意事项，但不得承载“只有 md 有、json 没有”的关系信息。
- **FR-003**: 系统 MUST 生成 group 执行清单（index-only）：`specs/087-async-coordination-roadmap/checklists/group.registry.md`，只链接成员 spec 的 `tasks.md/quickstart.md` 等入口，禁止复制成员实现 tasks。
- **FR-004**: 系统 MUST 为每个 member spec 定义“实施前产物齐全”门槛：至少包含 `spec.md/plan.md/tasks.md/research.md/data-model.md/contracts/README.md/quickstart.md/checklists/requirements.md`（其中 `data-model.md` 与 `contracts/*` 允许 N/A，但必须说明原因与替代门槛）。
- **FR-005**: 系统 MUST 明确证据门禁口径：凡触及 runtime 核心路径/React 关键路径/诊断协议的成员 spec，必须在各自 `plan.md` 明确 Perf Evidence Plan 与诊断开销约束（`diagnostics=off` 近零成本）。

### Non-Functional Requirements (Maintainability & Drift)

- **NFR-001**: group 的关系事实源 MUST 单一：自动化/脚本只依赖 `spec-registry.json`；本 md 仅做解释，不得引入并行真相源。
- **NFR-002**: group checklist 生成 MUST 可重复、可脚本化、输出稳定；生成过程不得依赖 Git 历史/分支（仅依赖 `specs/*` 目录与 registry）。
- **NFR-003**: group spec MUST 遵守 forward-only：成员 spec 若引入 breaking change，必须以迁移说明替代兼容层/弃用期，并在 group checklist 可被 reviewer 发现。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意贡献者在 2 分钟内能从 087 的 group checklist 定位到下一步需要推进的 member spec 与对应 `tasks.md`。
- **SC-002**: 仅修改 `spec-registry.json` 后，能够在 1 次命令内重新生成 `checklists/group.registry.md`，且不会出现“成员任务清单复制粘贴”的漂移点。
- **SC-003**: 每个成员 spec 在进入 implementing 之前，均满足产物齐全门槛（spec/plan/tasks/quickstart/requirements checklist），reviewer 可直接按链接核对。
