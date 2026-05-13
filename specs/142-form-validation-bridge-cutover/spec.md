# Feature Specification: Form Validation Bridge Cutover

**Feature Branch**: `142-form-validation-bridge-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 submit-only decode gate、decode-origin canonical bridge、normalized decode facts、path-first lowering 与 submit fallback 从当前 SSoT 收口为独立 member spec，并以零兼容、单轨实施推进实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

Form validation 的规划层已经冻结了几条关键 law：

- structural decode 只在 submit lane 激活
- decode-origin canonical bridge 是单一桥接主线
- bridge 只消费 normalized decode facts
- lowering 走 path-first，再回收到 `scope="submit"`

当前实现仍停在 drift 状态：

- `SchemaError = unknown`
- path 提取还在猜多种 vocabulary
- raw schema error 还会直接写回树
- `validate / handleSubmit` 仍直接 sync decode

这份 spec 的职责，是把 validation bridge 单独切出来，先把 decode 路径真正收成单线实现，再让后续 `143 / 144` 能建立在同一条 bridge 上。

## Scope

### In Scope

- submit-only decode gate 的实现收口
- decode-origin canonical bridge 的实现主线
- normalized decode facts 的输入收口
- path-first lowering 与 `submit` fallback
- adapter / path mapping / lowering route 的 implementation boundary

### Out of Scope

- 不在本 spec 内清理 canonical error carrier residue
- 不在本 spec 内清理 string/raw leaf counting
- 不在本 spec 内重开 runtime control plane report shell
- 不在本 spec 内重开 submit verdict / blocking summary / error lifetime 主线

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用一条桥接主线解释 structural decode (Priority: P1)

作为维护者，我希望能用一条稳定路径解释 structural decode 从 schema 到 Form truth 的流动，而不是同时解释多种 parse vocabulary 和多种 writeback 入口。

**Traceability**: NS-4, KF-9

**Why this priority**: 这是后续 error carrier 和 submit verdict cutover 的前提。

**Independent Test**: 维护者可以通过实现和测试看清 decode 只在 submit lane 激活，并且只通过单一 bridge lowering。

**Acceptance Scenarios**:

1. **Given** 用户触发 submit，**When** schema decode 失败，**Then** decode 只通过 canonical bridge 进入 Form truth。
2. **Given** 用户触发 field-level validate，**When** validatePaths 运行，**Then** structural decode 不会被再次激活。

---

### User Story 2 - 实施者能在不引入第二 parse/result contract 的前提下做 path mapping (Priority: P2)

作为实施者，我希望 path mapping 与 lowering 只建立在 normalized decode facts 上，而不需要继续感知 schema 库自己的原始 payload。

**Traceability**: NS-3, KF-4

**Why this priority**: 否则 bridge 还是会反复长回第二 vocabulary。

**Independent Test**: 当 decode 失败时，lowering 路径只依赖 normalized facts；raw schema issue 只停在 residue 或 debug material。

**Acceptance Scenarios**:

1. **Given** 一个 decode failure 有明确 path，**When** bridge lowering，**Then** 它按 path-first 进入对应 slot。
2. **Given** 一个 decode failure 无法稳定映射 path，**When** bridge lowering，**Then** 它回收到 `scope="submit"`。

---

### User Story 3 - reviewer 能拒绝 pre-submit structural decode 与旧 writeback 共存方案 (Priority: P3)

作为 reviewer，我希望能直接拒绝继续保留 pre-submit structural decode route、raw schema writeback 或多桥接主线的方案。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 这条桥一旦保留双轨，后续 cutover 就会反复返工。

**Independent Test**: reviewer 可以依据本 spec 直接否决 dual-route、dual-writeback 和旧 path guessing 方案。

**Acceptance Scenarios**:

1. **Given** 有人提议保留 `validatePaths -> schema decode`，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。
2. **Given** 有人提议继续把 raw schema error 写入主错误树，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。

### Edge Cases

- unmappable decode issue 一律回收到 `scope="submit"`
- raw schema issue 可以作为 debug residue 存在，但不能进入 canonical truth
- sync 与 async decode 共享同一 bridge law，不允许两套 lowering

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) 系统 MUST 将 structural decode gate 固定在 submit lane。
- **FR-002**: 系统 MUST 让 field-level validate 与 rule revalidate 不触发 structural decode。
- **FR-003**: 系统 MUST 将 decode-origin canonical bridge 固定为唯一桥接主线。
- **FR-004**: 系统 MUST 让 bridge 只消费 normalized decode facts。
- **FR-005**: 系统 MUST 让 decode failure 优先按 path-first lowering 进入 canonical truth。
- **FR-006**: 系统 MUST 让 unmappable decode issue 一律回收到 `scope="submit"`。
- **FR-007**: 系统 MUST 让 raw schema issue 退出 canonical truth，只保留为 residue / debug material。
- **FR-008**: 系统 MUST 不再允许第二 parse/result contract 进入 bridge。
- **FR-009**: 系统 MUST 采用零兼容、单轨实施，不保留旧 bridge 路径或 dual-writeback。

### Key Entities _(include if feature involves data)_

- **Normalized Decode Fact**: schema failure 进入 bridge 前的最小输入事实。
- **Decode-Origin Canonical Bridge**: submit-lane decode 到 Form truth 的唯一桥接主线。
- **Submit Decode Fallback Slot**: unmappable decode issue 的唯一回收位。

### Non-Functional Requirements (Determinism & Single Route)

- **NFR-001**: structural decode route 必须单线、可解释、可诊断。
- **NFR-002**: bridge implementation 不得重新感知外部 schema brand 或私有 payload 字段。
- **NFR-003**: 本轮不得引入兼容层、双轨桥接或 dual-writeback。
- **NFR-004**: docs、code 和 tests 对 bridge 的叙述必须一致。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: submit 触发 decode 时，bridge 只走一条 canonical lowering 路径。
- **SC-002**: field-level validate 不再触发 structural decode。
- **SC-003**: unmappable decode issue 一律回收到 `scope="submit"`。
- **SC-004**: reviewer 可直接依据本 spec 否决 dual-route 和 raw writeback 方案。
