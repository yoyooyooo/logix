# Feature Specification: Form Settlement Contributor

**Feature Branch**: `152-form-settlement-contributor`  
**Created**: 2026-04-21  
**Status**: Stopped
**Input**: User description: "Define Form settlement contributor semantics for async field/list/root validation, submitImpact, pending/stale/blocking basis, and list cardinality gates."

## Stop Decision

2026-04-22 裁决：本 spec 停止作为独立实施主线继续推进。
后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)。
本页只保留为历史语义来源；值得迁入 `155` 的要点已经汇总到 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。
任何后续实现不得继续按本 spec 单独扩展 contributor family、pending taxonomy 或 submit summary。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

`144-form-settlement-submit-cutover` 已把 `$form.submitAttempt`、decoded payload 与最小 blocking summary 切出第一刀。

但 settlement lane 仍缺：

- async validation 作为 field / list / root 的一等 declaration
- contributor grammar
- `submitImpact` 与 pending/stale/blocking 的统一解释
- list cardinality basis

这份 spec 只承接 settlement contributor semantics，不重开 canonical error carrier，也不提前承接完整 reason projection。

## Scope

### In Scope

- async field / list.item / list.list / root validation declaration
- settlement contributor grammar
- `submitImpact`
- pending / stale / blocking basis
- list cardinality basis: `minItems / maxItems`
- submit gate 与 contributor truth 的关系

### Out of Scope

- canonical error carrier
- path explain / evidence envelope
- presence policy / cleanup law
- render contract
- host sugar / wrapper family

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用单一 contributor truth 解释 async validation (Priority: P1)

作为维护者，我希望 field、list.item、list.list、root 的异步校验都能回到同一 settlement contributor 语义，而不是每层各有一套 pending 解释。

**Traceability**: NS-4, KF-9

**Why this priority**: 如果 async validation 没有单一 contributor substrate，submit gate 与 decoded verdict 永远会继续分叉。

**Independent Test**: 针对 field / list / root 三类 async validate，都能用同一 contributor vocabulary 解释。

**Acceptance Scenarios**:

1. **Given** 一个 field-level async validation，**When** 它进入 pending 或 stale，**Then** 它能被回链到同一 contributor grammar。
2. **Given** 一个 list-level async validation，**When** submit gate 执行，**Then** blocking 与 non-blocking pending 的解释仍落在同一 submit truth。

---

### User Story 2 - 实施者能显式声明 submitImpact 与 cardinality basis (Priority: P2)

作为实施者，我希望 `submitImpact`、`minItems / maxItems`、pending / stale / blocking 的关系是显式的，而不是继续靠局部规则推断。

**Traceability**: NS-3, KF-4

**Why this priority**: settlement lane 不是“能提交就行”，而是“为什么能提交 / 为什么不能提交”必须单点解释。

**Independent Test**: reviewer 可以只看 declaration 和 summary，就判断 pending / blocking / cardinality 是否进入 submit truth。

**Acceptance Scenarios**:

1. **Given** 一个 contributor 被标记为 `submitImpact="block"`，**When** submit 发生，**Then** active pending 会阻塞 submit。
2. **Given** 列表违反 `minItems / maxItems`，**When** submit gate 执行，**Then** 它通过 list cardinality basis 进入 settlement truth，而不是通过第二套 presence policy 解释。

---

### User Story 3 - reviewer 能拒绝 dual pending / verdict 体系 (Priority: P3)

作为 reviewer，我希望能直接拒绝第二套 pending tree、第二套 submit blocker、第二套 verdict summary。

**Traceability**: NS-10, KF-8

**Why this priority**: settlement 最容易被 async residue 拉出第二条解释线。

**Independent Test**: reviewer 只对照本 spec，就能判定某个方案是否在长 dual settlement truth。

**Acceptance Scenarios**:

1. **Given** 有人提议 list async 与 field async 各用不同 blocker 语义，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议把 cardinality 继续塞回另一条专用 summary，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- stale drop 只能产出 reason / evidence，不得重新写成 canonical error leaf。
- list cardinality 不能和 presence cleanup 混成一条 truth。
- decoded invalid 与 active pending block 必须能同时被区分，不得塌成单一 “failed submit” 黑盒。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) System MUST define async validation as a first-class declaration across field, list.item, list.list, and root.
- **FR-002**: (NS-3, KF-4) System MUST define a single settlement contributor grammar with at least `deps`, `key`, `concurrency`, `debounce`, and `submitImpact`.
- **FR-003**: System MUST define how active pending, stale drop, and blocking basis participate in submit truth.
- **FR-004**: System MUST define `minItems` and `maxItems` as the canonical list cardinality basis for settlement.
- **FR-005**: System MUST keep decoded verdict, pending block, and active error block explainable under a single submit truth.
- **FR-006**: System MUST reject any dual pending, dual blocker, or dual verdict summary path.

### Non-Functional Requirements (Determinism & Explainability)

- **NFR-001**: (NS-10, KF-8) Settlement contributor semantics MUST stay deterministic and machine-comparable across field/list/root scopes.
- **NFR-002**: Pending / stale / blocking MUST be explainable without introducing a second taxonomy.
- **NFR-003**: Agent-visible semantics MUST be explicit enough that the same submit gate can be reasoned about from declaration, witness, and summary output.

### Key Entities _(include if feature involves data)_

- **Settlement Contributor**: async validation 的最小统一语义单元。
- **Submit Impact**: contributor 对 submit gate 的显式影响类别。
- **List Cardinality Basis**: `minItems / maxItems` 所代表的 settlement truth。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: field / list.item / list.list / root async validation 都能回链到同一 contributor grammar。
- **SC-002**: submit gate 能区分 decoded invalid、active pending block、active error block，而不引入第二 verdict summary。
- **SC-003**: reviewer 能直接否决 dual pending / dual blocker / dual verdict 方案。
