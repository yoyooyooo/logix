# Feature Specification: Form Reason Projection

**Feature Branch**: `153-form-reason-projection`  
**Created**: 2026-04-21  
**Status**: Stopped
**Input**: User description: "Define Form reason contract closure for path explain, structured reason slots, cleanup/stale/pending reasons, and the evidence envelope consumed by compare and repair flows."

## Stop Decision

2026-04-22 裁决：本 spec 停止作为独立实施主线继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
本页只保留为历史语义来源；值得迁入 `155` 的要点已经汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
任何后续实现不得继续按本 spec 单独扩展第二 issue tree、report object 或 exact diagnostics surface。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

`143` 已冻结 canonical error carrier，`144` 已冻结最小 submit summary，`152` 将承接 settlement contributor semantics。

仍然缺失的是完整的 reason contract：

- path explain
- structured reason slot family
- cleanup / stale / pending reasons
- canonical evidence envelope
- compare / repair / trial 的统一 feed

这份 spec 只承接 reason projection 与 evidence authority，不重开 render API 或 field-ui exact leaf。

## Scope

### In Scope

- path-level explain contract
- structured `reasonSlotId`
- `reasonSlotId.subjectRef` for `row / task / cleanup`
- base reason family: `error / pending / cleanup / stale`
- canonical evidence envelope
- compare feed / repair feed / trial feed using the same authority
- control-plane admissibility for Form reason materialization

### Out of Scope

- render API spelling
- field-ui exact leaf contract
- toolkit helper family
- active-set presence policy
- async contributor declaration itself

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用 path explain 单点解释 invalid / pending / cleanup (Priority: P1)

作为维护者，我希望同一个 path explain 接口能解释 invalid、pending、cleanup、stale，而不是为每类情况再造一套专用 reason 面。

**Traceability**: NS-4, KF-9

**Why this priority**: 这是 UI、Agent、trial、compare 能共用同一条 reason truth 的前提。

**Independent Test**: 对任一路径，维护者都能通过同一 reason contract 解释当前状态来自 error、pending、cleanup 还是 stale。

**Acceptance Scenarios**:

1. **Given** 一个 path 处于 invalid 状态，**When** 读取 path explain，**Then** 返回的是 canonical reason slot，而不是第二 issue tree。
2. **Given** 一个 path 对应 subtree 因 cleanup 退出 active universe，**When** 读取 path explain，**Then** 仍能回链 cleanup reason，而不是空白或黑盒。

---

### User Story 2 - 实施者能用同一 evidence envelope 喂给 UI / Agent / compare / repair (Priority: P2)

作为实施者，我希望 UI explain、Agent diagnostics、trial feed、compare feed、repair focus 都建立在同一 evidence envelope 上，而不是各自产出不同 shape。

**Traceability**: NS-3, KF-4

**Why this priority**: 如果 evidence 不能共用，reason contract 只是名义统一，实际还是多条 truth。

**Independent Test**: compare、repair、trial 三种消费者能回链到同一 `reasonSlotId / sourceRef / local coordinates`。

**Acceptance Scenarios**:

1. **Given** 一个 submit gate 失败，**When** compare feed 与 repair focus 产出，**Then** 它们共享同一 reason authority。
2. **Given** 一个 task-level pending contributor，**When** UI 与 trial feed 都读取它，**Then** 它们不会出现两套 pending 解释 shape。

---

### User Story 3 - reviewer 能拒绝第二 issue tree / 第二 report object (Priority: P3)

作为 reviewer，我希望能直接拒绝任何把 Form reasons 再包装成第二 issue taxonomy 或第二 report object 的方案。

**Traceability**: NS-10, KF-8

**Why this priority**: control-plane materializer 最容易把统一 truth 重新包装成第二真相层。

**Independent Test**: reviewer 可仅凭本 spec 否决第二 explain object、第二 issue authority、第二 compare feed。

**Acceptance Scenarios**:

1. **Given** 有人提议为 cleanup / stale 单独长一套报告结构，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议 path explain 与 compare feed 各自产出不同 reason family，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- submit gate reason slot 只是 reason family 的一个 consumer，不得反向变成总 owner。
- cleanup / stale 需要保留 explainability，但不得重新变成 blocker leaf。
- evidence envelope 可以 materialize 为 report shell，但 materialized object 不能反客为主成为新 authority。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) System MUST define a single path explain contract for `error`, `pending`, `cleanup`, and `stale`.
- **FR-002**: (NS-3, KF-4) System MUST define structured `reasonSlotId` semantics with `subjectRef` limited to `row`, `task`, and `cleanup`.
- **FR-003**: System MUST define a canonical evidence envelope that can feed UI, Agent, trial, compare, and repair without changing owner truth.
- **FR-004**: System MUST keep submit summary / compare feed as consumers of the same reason authority, not as a second reason system.
- **FR-005**: System MUST define control-plane admissibility so any materialized report object remains on-demand and subordinate to the evidence envelope.
- **FR-006**: System MUST reject any second issue tree, second explain object, or second compare/report truth.

### Non-Functional Requirements (Diagnosability & Single Truth)

- **NFR-001**: (NS-10, KF-8) The reason contract MUST remain machine-comparable across UI, Agent, compare, and repair consumers.
- **NFR-002**: Form-specific focus coordinates MUST stay stable enough to flow into control-plane `reasonSlotId / sourceRef` fields without expanding domain payload in place.
- **NFR-003**: The same reason truth MUST support explanation and verification without introducing a parallel taxonomy.

### Key Entities _(include if feature involves data)_

- **Reason Slot**: path / submit / cleanup / ownership 等 explain 单位所对应的结构化 reason 节点。
- **Evidence Envelope**: 喂给 UI、Agent、trial、compare、repair 的统一证据载体。
- **Materialized Report View**: runtime control plane 在需要时从 envelope 派生出来的对象化视图。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: invalid / pending / cleanup / stale 都能通过同一 path explain contract 被解释。
- **SC-002**: compare / repair / trial 不再各自产生第二套 reason family。
- **SC-003**: reviewer 能直接否决第二 explain object / second report truth 方案。
