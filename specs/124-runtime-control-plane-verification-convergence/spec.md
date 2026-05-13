# Feature Specification: Runtime Control Plane Verification Convergence

**Feature Branch**: `124-runtime-control-plane-verification-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 runtime control plane 与 verification control plane 的第二波协议、CLI、sandbox、test 收敛。"

## Context

当前 docs 已把 `runtime.check / runtime.trial / runtime.compare` 固定成第一版主干，也把 `fixtures/env + steps + expect`、机器报告、升级顺序写成默认口径。

第一波 cutover 已完成 CLI、examples、test 与 sandbox 的一部分工作，但控制面 contract 仍未在 package 间完全收敛，尤其是 machine report、升级层、host-specific deep verification 和边界治理。

## Scope

### In Scope

- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/standards/logix-api-next-guardrails.md` 中与 verification 相关的部分
- `@logixjs/core`、`@logixjs/cli`、`@logixjs/test`、`@logixjs/sandbox` 的统一 contract

### Out of Scope

- 不定义公开 authoring 主链
- 不定义 hot path 结构
- 不定义 platform static 角色

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agent 能用统一入口做分层自证 (Priority: P1)

作为 Agent，我需要一套统一、分层、可升级的验证入口，知道何时用 `check`、何时用 `trial`、何时升级到 `compare`。

**Why this priority**: 这条控制面是 docs 中最明确的下一阶段目标之一，也是 CLI、test、sandbox 对齐的核心。

**Independent Test**: 给定一个验证意图，Agent 能在 5 分钟内确定对应 stage、mode、输入协议和期望报告字段。

**Acceptance Scenarios**:

1. **Given** 一个静态快检意图，**When** 我查本 spec，**Then** 我知道必须先走 `runtime.check`。
2. **Given** 一个 startup 自证意图，**When** 我查本 spec，**Then** 我知道默认升级到 `runtime.trial(mode="startup")` 即止。

---

### User Story 2 - 维护者能让 CLI / test / sandbox 说同一套协议 (Priority: P2)

作为维护者，我需要让 `@logixjs/cli`、`@logixjs/test`、`@logixjs/sandbox` 对同一份 verification contract 说话。

**Why this priority**: 目前这些包已经有第一波实现，但剩余差距一旦继续放大，就会重新长出第二控制面。

**Independent Test**: 抽查任意两个入口，能看到相同 stage 命名、输入协议和核心报告字段。

**Acceptance Scenarios**:

1. **Given** CLI 和 sandbox 的一次 trial，**When** 我比对它们的报告口径，**Then** 顶层 stage、verdict 和 repair fields 保持一致。

---

### User Story 3 - reviewer 能阻止第二验证平面回流 (Priority: P3)

作为 reviewer，我需要判断某个新验证入口是否会绕开 `runtime control plane`。

**Why this priority**: 第二波实现阶段容易出现包内自带 trial DSL 或 host-only 验证面，导致口径分裂。

**Independent Test**: reviewer 能根据本 spec 拒绝新的平行 verification DSL、平行 machine report 或平行 stage 命名。

**Acceptance Scenarios**:

1. **Given** 一个新增验证入口，**When** reviewer 检查，**Then** 能判断它是否必须回到 `runtime.check / trial / compare` 主干。

### Edge Cases

- 某个 host-specific deep verification 必须保留时，必须明确它属于升级层，不能默认主线启用。
- 某个 low-level trace 对定位问题很关键时，仍只能作为附加下钻材料，不能替代标准机器报告。
- 某个入口只实现了 `trial`，未实现 `compare` 时，仍需遵守同一份 input contract 和 report contract。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 固定 `runtime.check / runtime.trial / runtime.compare` 为第一版 verification control plane 主干。
- **FR-002**: 系统 MUST 固定 `fixtures/env + steps + expect` 为第一版场景级验证输入协议。
- **FR-003**: 系统 MUST 固定统一机器报告的核心字段，包括 `stage / mode / verdict / errorCode / summary / environment / artifacts / repairHints / nextRecommendedStage`。
- **FR-004**: 系统 MUST 固定 `PASS / FAIL / INCONCLUSIVE` 三态 verdict 语义与升级规则。
- **FR-005**: 系统 MUST 为 CLI、test、sandbox、core 规定统一的 contract owner 与边界。
- **FR-006**: 系统 MUST 规定 host-specific deep verification、raw evidence、raw trace 只作为升级层或附加材料。

### Non-Functional Requirements (Protocol Stability)

- **NFR-001**: verification control plane 不得进入公开 authoring surface。
- **NFR-002**: 不同入口的 machine report 必须保持稳定可比较，便于 Agent 自动消费。
- **NFR-003**: 若某入口无法覆盖完整主干，它仍不得引入第二套 stage 命名或第二套 DSL。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Agent 可以在 5 分钟内从验证意图路由到正确的 stage 和 mode。
- **SC-002**: CLI、test、sandbox 至少在顶层 stage、verdict 和核心报告字段上口径一致。
- **SC-003**: reviewer 可以用本 spec 拒绝平行 verification plane 的新增提议。

## Clarifications

### Session 2026-04-06

- Q: verification machine report 的 contract owner 允许继续停在 CLI 侧吗？ → A: 不允许。共享 report contract 必须收敛到 `@logixjs/core/ControlPlane`，CLI 只负责命令路由与消费。
- Q: `repairHints` 可以继续是字符串数组吗？ → A: 不可以。第一版必须输出结构化对象数组，并在当前层足够解释问题时把 `nextRecommendedStage` 置空。
