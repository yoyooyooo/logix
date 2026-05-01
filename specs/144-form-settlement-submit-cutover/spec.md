# Feature Specification: Form Settlement Submit Cutover

**Feature Branch**: `144-form-settlement-submit-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 submitAttempt、decoded payload、blocking summary、error lifetime、submit verdict 与 settlement 相关 residue 切成独立 member spec，并以零兼容、单轨实施推进实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

Form 的 settlement / submit 规划已经冻结了：

- `submitAttempt` 是唯一观察边界
- decoded payload 只进入 submit-lane output
- submit summary 只从 base facts 纯归约
- error lifetime 服从 canonical mapping

当前实现还没有把这些真正收口成单线。

## Scope

### In Scope

- `submitAttempt` snapshot 的实现主线
- decoded payload 的 submit output 语义
- blocking summary 的纯归约
- error lifetime 与 clear trigger 主线
- submit verdict 路径的实现收口

### Out of Scope

- 不在本 spec 内做 bridge cutover
- 不在本 spec 内做 canonical error carrier residue 清理
- 不在本 spec 内做 active-shape/locality

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用 submitAttempt 单点解释 submit gate (Priority: P1)

作为维护者，我希望 submit gate 的观察边界只有 `submitAttempt`，而不是多条隐式状态线。

**Traceability**: NS-4, KF-9

**Why this priority**: submit 主线是 Form 最直接的用户面行为。

**Independent Test**: 维护者可以通过 tests 看到 submit、blocked submit、decoded payload 都围绕同一 `submitAttempt` 收口。

**Acceptance Scenarios**:

1. **Given** submit 被阻塞，**When** 我读取 submit state，**Then** 我能回链到同一 `submitAttempt`。
2. **Given** decode 成功，**When** submit 完成，**Then** decoded payload 只进入 submit output。

---

### User Story 2 - 实施者能用 base facts 纯归约 submit summary (Priority: P2)

作为实施者，我希望 submit summary 不再依赖第二 blocker leaf 或第二 verdict tree。

**Traceability**: NS-3, KF-4

**Acceptance Scenarios**:

1. **Given** active error leaf 与 pending leaf，**When** summary 归约，**Then** 只从 base facts 得出结果。
2. **Given** cleanup 或 stale residue，**When** submit 归约，**Then** 它们不阻塞 submit。

---

### User Story 3 - reviewer 能拒绝 dual verdict 与隐式 lifetime 分叉 (Priority: P3)

作为 reviewer，我希望能直接拒绝第二 blocker leaf、第二 verdict tree 或 dual lifetime contract。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Acceptance Scenarios**:

1. **Given** 有人提议保留第二 blocker leaf，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议 decoded payload 长第二 state slice，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- stale / cleanup 不阻塞 submit
- decoded payload 不进入持久状态树
- manual / submit / decode error lifetime 继续只认 canonical mapping

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 将 submit gate 固定到单一 `submitAttempt`。
- **FR-002**: 系统 MUST 让 decoded payload 只进入 submit-lane output。
- **FR-003**: 系统 MUST 让 submit summary 只从 base facts 纯归约。
- **FR-004**: 系统 MUST 不再引入第二 blocker leaf 或第二 verdict tree。
- **FR-005**: 系统 MUST 让 error lifetime 继续服从 canonical mapping。
- **FR-006**: 系统 MUST 采用零兼容、单轨实施，不保留 dual verdict 或 dual lifetime path。

### Key Entities _(include if feature involves data)_

- **SubmitAttempt Snapshot**: submit gate 的唯一观察边界。
- **Decoded Submit Payload**: submit-lane output。
- **Submit Summary**: 从 base facts 纯归约得到的最小 submit verdict。

### Non-Functional Requirements (Determinism & Single Verdict)

- **NFR-001**: submit 相关 truth 必须单线。
- **NFR-002**: decoded payload 不得进入第二持久状态树。
- **NFR-003**: stale / cleanup residue 不得重新进入 blocking universe。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: blocked submit、valid submit、decoded submit 都围绕同一 `submitAttempt`。
- **SC-002**: submit summary 不再依赖第二 blocker leaf。
- **SC-003**: reviewer 可直接依据本 spec 否决 dual verdict 与 dual lifetime。
