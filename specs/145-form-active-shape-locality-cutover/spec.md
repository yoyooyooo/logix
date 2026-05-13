# Feature Specification: Form Active Shape Locality Cutover

**Feature Branch**: `145-form-active-shape-locality-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 row ownership、cleanup、remap、reasonSlotId.subjectRef、active-shape receipts 与 locality residue 切成独立 member spec，并以零兼容、单轨实施推进实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

Form 的 active-shape lane 已经在规划层冻结：

- active set 决定 validation / blocking / explain universe
- cleanup、remap、row ownership 必须可解释
- `reasonSlotId.subjectRef` 是唯一 locality 坐标

当前实现还没把这些真正切过去：

- row-local continuity 还容易被 index 漂移污染
- cleanup / remap receipt 还没成为统一观察面

这份 spec 的职责，是把 active-shape 与 locality 的终局路径切成独立 member。

## Scope

### In Scope

- row ownership 主线
- cleanup / remap / locality receipts
- `reasonSlotId.subjectRef` 的稳定实现
- active-shape residue cleanup

### Out of Scope

- 不在本 spec 内做 validation bridge
- 不在本 spec 内做 canonical error carrier
- 不在本 spec 内做 submit verdict
- 不在本 spec 内做 host/examples 对齐

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能稳定解释 row-local continuity (Priority: P1)

作为维护者，我希望 row-local continuity 只依赖稳定 locality，而不是继续被 index 漂移污染。

**Traceability**: NS-4, KF-9

**Acceptance Scenarios**:

1. **Given** list reorder 或 replace，**When** 我读取 locality 相关 state/reason，**Then** row continuity 仍稳定。
2. **Given** 条件隐藏导致 subtree 退出 active set，**When** cleanup 生效，**Then** 只留下 cleanup reason，不再留下 pending/blocking 残留。

---

### User Story 2 - 实施者能用统一 receipt 解释 cleanup / remap / ownership (Priority: P2)

作为实施者，我希望 cleanup、remap、ownership 的 receipt 使用同一套 locality 语言。

**Traceability**: NS-3, KF-4

**Acceptance Scenarios**:

1. **Given** row 被删除，**When** receipts 产出，**Then** cleanup 和 ownership 回收都能回链到统一 locality。
2. **Given** row 被 remap，**When** receipts 产出，**Then** 我能从同一坐标理解 continuity。

---

### User Story 3 - reviewer 能拒绝 side refs 与 index-first locality (Priority: P3)

作为 reviewer，我希望能直接拒绝把 row/task/cleanup locality 藏到第二套 side refs 或 index-first 方案里。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Acceptance Scenarios**:

1. **Given** 有人提议继续用 index 作为 locality 主轴，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议再长第二套 row/task side refs，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- active exit 后只允许留下 cleanup reason
- row reorder 不得打断 row-local continuity
- cleanup / remap / ownership 不得长第二套 locality 坐标

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 让 row-local continuity 只依赖稳定 locality。
- **FR-002**: 系统 MUST 将 cleanup、remap、ownership 收到同一 locality 语言。
- **FR-003**: 系统 MUST 让 `reasonSlotId.subjectRef` 成为唯一 locality 主轴。
- **FR-004**: 系统 MUST 让 active exit 后只留下 cleanup reason。
- **FR-005**: 系统 MUST 采用零兼容、单轨实施，不保留 index-first locality 或 side refs 并存。

### Key Entities _(include if feature involves data)_

- **Row Ownership**: 动态结构中的稳定 row-local continuity。
- **Cleanup Receipt**: subtree 退出 active set 后的唯一终态 receipt。
- **Remap Receipt**: reorder / replace / move 之后的 locality continuity 证据。

### Non-Functional Requirements (Locality Determinism)

- **NFR-001**: locality 必须稳定、可比较、可回链。
- **NFR-002**: cleanup / remap / ownership 不得各自长第二套坐标。
- **NFR-003**: 本轮不得引入兼容层或 dual locality path。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: reorder / replace 后 row-local continuity 仍稳定。
- **SC-002**: active exit 后只留下 cleanup reason，不再残留 pending/blocking。
- **SC-003**: reviewer 可直接依据本 spec 否决 side refs 与 index-first locality。
