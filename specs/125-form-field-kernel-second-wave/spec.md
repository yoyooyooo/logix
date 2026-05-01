# Feature Specification: Form Field-Kernel Second Wave

**Feature Branch**: `125-form-field-kernel-second-wave`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 Form DSL、field-kernel、commands 与 React 宿主作者面的第二波重构收敛。"

## Context

`06-form-field-kernel-boundary` 已经明确了“Form 保领域 DSL，field-kernel 保底层能力”的目标。第一波 domain rebootstrap 解决了边界收缩的起点，仍未把 commands、logic family、React 宿主作者面、direct API 和 naming fallout 完整收口。

这份 spec 承接 `06` 的第二波目标，并与 `122 / 123 / 124` 保持一致。

## Scope

### In Scope

- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- Form DSL 与 field-kernel 的能力分割
- commands、logic family、direct API 的角色划分
- `field-kernel` 与 `FieldKernel` 的 naming fallout

### Out of Scope

- 不覆盖 Query / I18n / Domain 的一般性规则
- 不覆盖 platform layered map
- 不定义完整 host scenario 目录
- 不在本轮收口 `apps/docs/**` 的对外用户文档

## Clarifications

### Session 2026-04-06

- Q: 这轮是否继续动 `apps/docs/**` 的 Form 用户文档？ → A: 不动，先收口 package boundary、examples、tests 与 SSoT。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Form maintainer 能明确 DSL 与 kernel 边界 (Priority: P1)

作为 Form maintainer，我需要明确哪些能力继续留在 Form DSL，哪些能力应沉到 field-kernel。

**Why this priority**: 这是 `06` 页面最核心的目标，也是第二波实现最容易重新混层的地方。

**Independent Test**: 给定一项 Form 能力，maintainer 能在 5 分钟内判断它属于 Form DSL 还是 field-kernel。

**Acceptance Scenarios**:

1. **Given** 一项 `errors / ui / touched / canSubmit` 能力，**When** 我按本 spec 分类，**Then** 它留在 Form 层。
2. **Given** 一项 `computed / source / link / patchPaths / rowId` 能力，**When** 我按本 spec 分类，**Then** 它归入 field-kernel。

---

### User Story 2 - 作者能知道 Form 顶层入口只剩哪些面 (Priority: P2)

作为作者，我需要清楚 Form 顶层可写面、commands、logic family 与 direct API 的关系。

**Why this priority**: docs 当前已经把 `derived` 降级，也把 `logic` 提成主方向。作者面若不清晰，Agent 仍会生成旧顶层入口。

**Independent Test**: 作者能从本 spec 判断 `Form.ts`、`commands`、`FieldKernel.from(...)` 和 React hooks 的推荐使用层级。

**Acceptance Scenarios**:

1. **Given** 一个联动或校验需求，**When** 作者对照本 spec，**Then** 知道应优先进入 `logic` 家族。

---

### User Story 3 - reviewer 能阻止 derived / rules 顶层心智回流 (Priority: P3)

作为 reviewer，我需要拒绝把 `derived` 或旧 `rules` 顶层壳层重新提回公开主面。

**Why this priority**: 第二波收敛阶段最容易在兼容思路下把旧概念重新抬头。

**Independent Test**: reviewer 能根据本 spec 判断一个新增入口是否违反“Form 顶层压缩、kernel 下沉”的方向。

**Acceptance Scenarios**:

1. **Given** 一个新的 Form 顶层入口提议，**When** reviewer 检查，**Then** 能判断它是否会重新长出并行顶层心智。

### Edge Cases

- 某个能力同时影响 schema、list identity 和 React hooks 时，仍需先按 primary responsibility 决定留在 DSL 还是 kernel。
- 某个 direct API 很有用，但只适合 expert 层时，必须明确写成 direct API，而不是 DSL 主入口。
- naming 若暂不统一，也必须先守住结构边界。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 固定 Form DSL 与 field-kernel 的能力边界账本。
- **FR-002**: 系统 MUST 固定 Form 顶层入口与辅入口的角色划分。
- **FR-003**: 系统 MUST 说明 commands 与 logic family 的关系，以及它们各自停留的层级。
- **FR-004**: 系统 MUST 规定 `derived` 的降级位置与 direct API 的使用边界。
- **FR-005**: 系统 MUST 为 `field-kernel` 与 `FieldKernel` 的命名后置给出结构稳定口径。
- **FR-006**: 系统 MUST 要求 docs、examples、test、package boundary 对这组边界保持一致。

### Non-Functional Requirements (Boundary Stability)

- **NFR-001**: Form 顶层作者面必须持续压缩，不得重新增长成多组平行入口。
- **NFR-002**: field-kernel 必须保持为底层能力面，避免被包装回新的领域 facade 主线。
- **NFR-003**: naming 尚未终局时，结构边界仍必须稳定可执行。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: maintainer 可以在 5 分钟内判断任一 Form 能力属于 DSL 还是 field-kernel。
- **SC-002**: 作者能够明确区分顶层入口、commands、logic family 与 direct API 的推荐层级。
- **SC-003**: reviewer 可以据此拒绝 `derived / rules / fields` 顶层心智回流。

### Session 2026-04-06

- Q: `computed / link / source` 是否还能继续通过 root barrel 以 `Form.computed / link / source` 暴露？ → A: 不能。direct API 统一只认 `Form.Field.*`。
