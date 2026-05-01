# Feature Specification: Form Active Set Cleanup

**Feature Branch**: `151-form-active-set-cleanup`  
**Created**: 2026-04-21  
**Status**: Stopped
**Input**: User description: "Define the remaining Form active-shape semantics for active set entry/exit, presence policy, subtree cleanup, and blocking/pending exit after active exit."

## Stop Decision

2026-04-22 裁决：本 spec 停止作为独立实施主线继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
本页只保留为历史语义来源；值得迁入 `155` 的要点已经汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
任何后续实现不得继续按本 spec 单独扩展 active-set API、cleanup reader 或 presence vocabulary。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

`145-form-active-shape-locality-cutover` 已经冻结了 locality 主轴，`149-list-row-identity-public-projection` 继续冻结 row roster projection theorem。

但 active-shape 仍缺一个独立 member 去承接：

- active set 何时进入 / 何时退出
- conditional subtree exit 后 value 是否保留
- subtree exit 后 `errors / ui / pending / blocking` 如何统一退出
- nested subtree / nested list 的 cleanup law

这份 spec 只关 active-set / presence / cleanup 本体，不重开 row identity theorem，也不提前进入 settlement 或 reason contract。

## Scope

### In Scope

- active set entry / exit semantics
- explicit presence policy for hidden / inactive fields
- subtree cleanup contract
- blocking / pending contribution exit on active exit
- nested subtree / nested list cleanup law
- cleanup receipt as the only residual after active exit

### Out of Scope

- row identity exact noun / import shape
- async validation declaration
- submit verdict / decoded payload
- path explain / evidence envelope
- host sugar / wrapper family

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能单点解释 active set 与 subtree exit (Priority: P1)

作为维护者，我希望 active set 的进入、退出、保留值与 cleanup 结果有单一语义，这样我能机械判断一个 subtree 是否仍参与 validation / blocking / explain universe。

**Traceability**: NS-4, KF-9

**Why this priority**: `active-shape lane` 是 settlement 与 reason contract 的前置；如果 entry/exit 规则不单点，后续所有 verdict 都会漂移。

**Independent Test**: 只看 state transition 与 cleanup receipt，就能判断某个 subtree 是否已退出 active universe。

**Acceptance Scenarios**:

1. **Given** 一个条件字段因 presence policy 退出 active set，**When** subtree exit 完成，**Then** 它不再贡献 `errors / ui / pending / blocking`，且只留下 cleanup receipt。
2. **Given** 一个 subtree 重新进入 active set，**When** 后续 validate / submit 发生，**Then** 它重新按当前 values 与 owner truth 参与，而不是复用旧 cleanup 残留。

---

### User Story 2 - 实施者能为 conditional / nested 结构应用统一 cleanup law (Priority: P2)

作为实施者，我希望 conditional subtree、nested list、nested conditional subtree 都复用同一 cleanup 语言，而不是每类结构各写一套清理逻辑。

**Traceability**: NS-3, KF-4

**Why this priority**: 这决定 active-shape 是否真的是 lane，而不是一堆局部特例。

**Independent Test**: conditional field、nested list row、nested conditional subtree 三类场景都能用同一 cleanup contract 验证。

**Acceptance Scenarios**:

1. **Given** 一个 nested list row 因删除或隐藏退出 active set，**When** cleanup 执行，**Then** row-local `errors / ui / pending / blocking` 一起退出。
2. **Given** 一个 parent subtree 退出 active set，**When** child subtree 原本持有 pending 或 blocking contribution，**Then** 它们不会继续残留在 active truth 中。

---

### User Story 3 - reviewer 能拒绝 partial cleanup 与隐式 retention (Priority: P3)

作为 reviewer，我希望能直接拒绝“只清 errors、不清 pending / blocking”或“值保留策略靠隐式约定”的方案。

**Traceability**: NS-10, KF-8

**Why this priority**: active-shape 最容易被局部 patch 侵蚀成第二套 cleanup 真相。

**Independent Test**: reviewer 只对照本 spec，就能判断一个方案是否仍在长 partial cleanup path。

**Acceptance Scenarios**:

1. **Given** 有人提议 subtree exit 后继续保留 pending blocker，**When** reviewer 对照本 spec，**Then** 能直接判定其不符合 active exit contract。
2. **Given** 有人提议 hidden field value 默认“想保留就保留”，**When** reviewer 对照本 spec，**Then** 能直接判定 presence policy 必须显式化。

### Edge Cases

- value retention 不能靠字段类型或 UI 行为隐式决定，必须由 presence policy 显式决定。
- cleanup 不能只清 root row，不清 nested descendants。
- active exit 后允许留下的唯一残留是 cleanup receipt，不允许留下 blocker shell。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) System MUST define a single active-set entry / exit contract for Form subtrees.
- **FR-002**: (NS-3, KF-4) System MUST make value retention after active exit an explicit presence policy decision.
- **FR-003**: System MUST clear `errors`, `ui`, pending contribution, and blocking contribution together when a subtree exits the active set.
- **FR-004**: System MUST leave only cleanup receipt as the allowed residual after active exit.
- **FR-005**: System MUST apply the same cleanup law to nested conditional subtrees and nested lists.
- **FR-006**: System MUST keep `replace(nextItems)` as roster replacement and MUST NOT infer hidden identity retention from stale structure.

### Non-Functional Requirements (Determinism & Single Truth)

- **NFR-001**: (NS-10, KF-8) Active-set semantics MUST remain single-source; no partial cleanup truth may exist beside the canonical cleanup law.
- **NFR-002**: Cleanup semantics MUST be machine-comparable so later compare / repair flows can reason over subtree exit deterministically.
- **NFR-003**: Presence policy MUST be explicit enough that an Agent can predict whether a hidden subtree still participates in the active universe.

### Key Entities _(include if feature involves data)_

- **Active Set**: 当前仍参与 validation / blocking / explain universe 的 subtree 集合。
- **Presence Policy**: 决定 inactive subtree values 是否保留的显式策略。
- **Cleanup Receipt**: active exit 后唯一允许保留的终态残留。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: conditional subtree exit、nested list row exit、nested conditional exit 三类场景都能用同一 cleanup contract 解释。
- **SC-002**: reviewer 能直接否决 partial cleanup 与 implicit retention 方案。
- **SC-003**: 后续 `settlement` 与 `reason contract` 可以把 active membership 当作单一前提，不再额外补例外说明。
