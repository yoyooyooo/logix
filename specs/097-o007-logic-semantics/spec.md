# Feature Specification: O-007 Logic 执行语义收敛（淘汰多重兼容分支）

**Feature Branch**: `097-o007-logic-semantics`
**Created**: 2026-02-25
**Status**: Planned
**Input**: User description: "O-007 Logic 执行语义收敛（淘汰多重兼容分支）：定义单一 canonical 执行模型（setup/run 边界固定），迁移后删掉兼容逻辑分支，确保 phase 错误可解释且启动链路缩短。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A（本次为 runtime 内核语义收敛，不新增北极星条目）
- **Kill Features (KF)**: N/A

## Context（来自 backlog O-007）

- 价值：高
- 关键信号：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts:154`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts:202`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts:275`
- 核心问题：`LogicPlan` / marker / 单相逻辑并存，执行分支过多，导致启动链路冗长、phase 错误语义分散。
- 目标方向：
  - 统一为单一 canonical setup/run 执行模型；
  - 迁移后删除兼容分支；
  - phase 错误可解释且可诊断。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 运行时逻辑执行统一入口（Priority: P1）

作为 runtime 维护者，我希望不同形态的 logic（单相、plan、plan effect）都先归一到一个 canonical plan，再走同一 setup/run 管线，避免每种形态各走一套分支。

**Why this priority**: 这是 O-007 的核心目标，直接决定热路径复杂度和可维护性。
**Independent Test**: 使用 `ModuleRuntime` 单测构造三类 logic 输入，断言最终均走同一 setup/run 执行路径且行为一致。

**Acceptance Scenarios**:

1. **Given** 模块包含单相 logic，**When** runtime 启动，**Then** 该 logic 被归一为 `{ setup, run }` 并按固定相位执行。
2. **Given** 模块包含 plan 或 plan effect logic，**When** runtime 启动，**Then** 不再进入历史兼容分支，而是先 canonicalize 后统一执行。

---

### User Story 2 - phase 错误可解释且可定位（Priority: P2）

作为调试 runtime 的开发者，我希望 setup/run 越界错误统一收敛为结构化诊断，不需要从多个分支推断错误来源。

**Why this priority**: O-007 验收要求明确包含“phase 相关错误更可解释”。
**Independent Test**: 在 setup 中调用 run-only API、在 run 中调用 setup-only API，断言产出稳定 `logic::invalid_phase` 事件，并包含明确 hint。

**Acceptance Scenarios**:

1. **Given** logic 在 setup 中调用 `$.onAction` 或 `$.use`，**When** runtime 启动，**Then** 输出 `logic::invalid_phase` 诊断且不导致构造链路崩溃。
2. **Given** logic 在 run 中调用 `$.lifecycle.*` 或 `$.fields`，**When** runtime 运行，**Then** 输出可解释的 phase 错误诊断并保持诊断事件 Slim/可序列化。

---

### User Story 3 - 启动链路缩短并有性能证据（Priority: P3）

作为性能负责人，我希望在语义统一后验证启动路径没有回归，且有 before/after 证据可以复现。

**Why this priority**: 本任务触及 `logix-core` 核心执行路径，必须满足性能与可诊断性优先原则。
**Independent Test**: 采集 O-007 专项 perf 报告并产出 diff，验证 ModuleRuntime logic 启动路径无回归。

**Acceptance Scenarios**:

1. **Given** 同一环境/同一 profile 的 before 与 after 报告，**When** 执行 perf diff，**Then** comparability 为 true 且关键启动指标无超预算回归。
2. **Given** 新旧实现对比，**When** 查看代码与测试，**Then** `ModuleRuntime.logics` 逻辑启动分支显著收敛为 canonical 流程。

### Edge Cases

- Logic 返回值为非 plan 形态时，必须明确 canonical 化策略，不允许隐式吞掉异常语义。
- plan effect 解析失败且包含 `LogicPhaseError` 时，必须保持诊断可解释，同时避免破坏 `runSync` 启动路径。
- setup 成功但 run 被显式跳过（例如 phase 违规降级）时，必须保持行为一致且有诊断记录。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 运行时 MUST 定义并使用单一 canonical logic 执行模型：所有 logic 输入先归一到统一 `setup/run` 结构，再进入执行管线。
- **FR-002**: `ModuleRuntime.logics` MUST 删除多重兼容执行分支（`isLogicPlan` / marker / 单相逻辑分散执行路径），改为“先 normalize，后统一执行”。
- **FR-003**: setup/run 边界 MUST 固定：setup 仅允许同步注册语义，run 承载 Env 访问、订阅与长期流程。
- **FR-004**: phase 违规 MUST 统一通过 `LogicPhaseError` → `logic::invalid_phase` 诊断链路暴露，错误消息必须可解释。
- **FR-005**: canonical 化流程 MUST 保持与现有公开 API 行为兼容（在 forward-only 前提下仅保留目标语义，不保留多余兼容层）。
- **FR-006**: 本特性 MUST 补充覆盖 setup/run 边界与回归的自动化测试，至少覆盖单相 logic、plan、plan effect 三类输入。
- **FR-007**: 本特性 MUST 同步 runtime 中文文档与迁移说明，标注已淘汰的兼容语义和替代路径。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 必须在实施前后采集可复现性能证据（同环境、同 profile、同采样参数），并落盘到 `specs/097-o007-logic-semantics/perf/`。
- **NFR-002**: O-007 的性能预算：`ModuleRuntime` logic 启动关键指标（wall time 与分配）相对 before 不得回归超过 5%（以 comparability=true 的 diff 为准）。
- **NFR-003**: 诊断事件 MUST Slim 且可序列化；在诊断关闭时保持零成本或接近零成本，不得引入新的常驻开销。
- **NFR-004**: 不得引入 IR 并行真相源；Static IR 与 Dynamic Trace 的锚点必须保持一致，不新增漂移点。
- **NFR-005**: 必须维持稳定标识语义（instanceId/txnSeq/opSeq 等不使用随机默认值），不得因执行模型重构引入非确定性。
- **NFR-006**: 破坏性语义变更采用迁移说明，不提供兼容层或弃用期（forward-only evolution）。

### Key Entities _(include if feature involves data)_

- **CanonicalLogicPlan**: 统一后的逻辑执行单元，包含 setup/run 两段与 phase 上下文，作为执行管线唯一输入。
- **LogicNormalizationResult**: 由 raw logic 到 `CanonicalLogicPlan` 的归一化结果，记录是否跳过 run 及诊断上下文。
- **LogicPhaseDiagnostic**: phase 违规的结构化诊断载荷（`code/kind/severity/message/hint/moduleId`）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` 中逻辑启动流程收敛为 canonical 管线；历史多重兼容分支被移除或下沉为单点 normalize。
- **SC-002**: 新增/更新测试通过并覆盖 setup/run 边界与三类 logic 输入（单相、plan、plan effect）的回归场景。
- **SC-003**: phase 错误场景均可观测到 `logic::invalid_phase`，并含可执行修复提示。
- **SC-004**: 产出 before/after perf 报告与 diff，comparability=true 且关键启动指标满足 NFR-002 预算。
- **SC-005**: 同步完成 O-007 中文文档与迁移说明，明确 canonical 语义及淘汰路径。
