# Feature Specification: Core Form Meta Lightweight Derivation

**Feature Branch**: `148-toolkit-form-meta-derivation`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "把围绕 `rawFormMeta()` 的轻量 strict 一跳派生改判为 core 方向：当前只冻结 candidate boundary、derived schema 与 forbidden set，不冻结 public noun 和 import shape。"

## Authority Split

全局 placement gate 与 owner route 当前固定看：

- [../../docs/ssot/runtime/11-toolkit-layer.md](../../docs/ssot/runtime/11-toolkit-layer.md)
- [../../docs/ssot/runtime/12-toolkit-candidate-intake.md](../../docs/ssot/runtime/12-toolkit-candidate-intake.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../../docs/ssot/form/13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)

这份 spec 只持有 candidate-local 收窄结果：

- `isValid / isPristine`
- de-sugared mapping
- forbidden set

若与 live authority 冲突，以 live authority 为准。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: `NS-3`, `NS-4`
- **Kill Features (KF)**: `KF-3`, `KF-9`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者把 placement 改判为 core-gap (Priority: P1)

作为维护者，我希望把围绕 `rawFormMeta()` 的轻量派生从 toolkit 候选改判为 core-gap，这样这类能力会沿着同一条 projection truth 收口，而不会先长成 toolkit 读侧。

**Traceability**: `NS-3`, `NS-4`, `KF-3`, `KF-9`

**Why this priority**: 若 placement 不先改判，后续实现很容易把轻量派生误学成 toolkit helper，重新制造第二选择面。

**Independent Test**: 只阅读本 spec 与相关 live SSoT，不看实现代码，也能判断这类对象当前为什么优先回 core。

**Acceptance Scenarios**:

1. **Given** 一个建立在 `$form` raw truth 之上的轻量派生候选，**When** 维护者对照本 spec，**Then** 能判断它当前应归入 `core-gap`，而不是 `toolkit-first-wave`。
2. **Given** 一个试图把该候选继续表述成 toolkit helper 的方案，**When** 维护者对照本 spec，**Then** 能指出它违背了最新 placement 边界。

---

### User Story 2 - Agent 与作者理解派生边界 (Priority: P2)

作为 Agent 或业务作者，我希望清楚 `rawFormMeta()` 仍然是唯一输入 truth，而这一步只是建立在其上的少量 policy-free 派生，这样我不会把它误学成第二个 form 读侧 surface。

**Traceability**: `NS-3`, `KF-3`

**Why this priority**: Agent First 下，若边界不清楚，轻量派生很容易被包装成一个语义过宽的新 helper。

**Independent Test**: 只凭本 spec，Agent 就能写出唯一允许的 de-sugared mapping，并说明哪些字段仍属于 raw route。

**Acceptance Scenarios**:

1. **Given** 一个需要读取 form submit 状态的场景，**When** Agent 查看本 spec，**Then** 能知道 `isSubmitting / submitCount / isDirty / errorCount` 继续停在 `rawFormMeta()` route。
2. **Given** 一个需要按钮禁用状态的场景，**When** Agent 查看本 spec，**Then** 能知道 `canSubmit` 继续停在 app-local / recipe 层，不属于当前 exact contract。

---

### User Story 3 - 后续 reopen 保持最小闭包 (Priority: P3)

作为维护者，我希望这份 spec 只冻结 core ownership direction、derived schema、de-sugared mapping 与 forbidden set，不抢跑 exact noun 或 import shape，这样后续 reopen 时可以继续沿着更小的 core adjunct surface 推进。

**Traceability**: `NS-4`, `KF-9`

**Why this priority**: 当前证据还不足以冻结具体 noun 或 import shape。过早定型会把命名争论提前带回公开面。

**Independent Test**: 只看 spec，就能判断这轮成功标准在于“关掉错误 placement 与错误形状”，而不在于“选定最终 public API”。

**Acceptance Scenarios**:

1. **Given** 一个 future reopen plan，**When** 维护者对照本 spec，**Then** 能知道这轮不要求 public noun 和 import shape 落盘。
2. **Given** 一个试图把 `canSubmit` 或完整 object view 一起推进的方案，**When** 维护者对照本 spec，**Then** 能知道它越过了当前冻结边界。

### Edge Cases

- 当某个方案把 `isSubmitting / isDirty / submitCount / errorCount` 重新打包进一个新 helper 返回对象时，必须视为重复 raw route，而不是合法派生。
- 当某个方案试图通过 `read helper(handle)` 或 hook 直接把 acquisition 与 derivation 绑在一起时，必须视为第二读侧 contract 风险。
- 当某个方案想把 `canSubmit` 一并冻结时，必须先证明它已脱离 submit actionability policy，而不是局部 UI 规则。
- 当后续真的要重开 exact noun 或 import shape，必须提供新的 live-residue 证据，并证明它只是 `raw meta -> derivation` 的机械展开。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) 系统 MUST 消费当前 live authority 的 placement 结论：该对象当前属于 `core-gap`，owner 方向固定在 core-owned adjunct read route。
- **FR-002**: (NS-3, KF-3) 系统 MUST 固定当前输入 truth 为 `rawFormMeta()` 返回的 `RawFormMeta`，不得再引入第二输入 route。
- **FR-003**: (NS-3) 系统 MUST 固定当前 exact derived schema 只保留 `isValid` 与 `isPristine` 两个字段。
- **FR-004**: (NS-3) 系统 MUST 固定 `isValid = errorCount === 0` 与 `isPristine = !isDirty` 作为当前唯一冻结的派生等式。
- **FR-005**: (NS-3) 系统 MUST 明确 `canSubmit` 当前不进入 exact contract，继续停在 recipe 或 app-local policy 层。
- **FR-006**: (NS-3) 系统 MUST 明确 `isSubmitting / isDirty / submitCount / errorCount` 继续停在 `rawFormMeta()` route，不得被重新打包成第二个 meta object。
- **FR-007**: (NS-3) 系统 MUST 明确当前不冻结 `read helper(handle)`、hook family、selector/equality/cache contract、field-ui、write-side 或完整 object view。
- **FR-008**: (NS-4, KF-9) 系统 MUST 把这轮成功标准固定为“冻结 core ownership direction、surviving candidate class、derived schema、de-sugared mapping、forbidden set”，而不是冻结 exact noun 或 import shape。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-3) 当前方案 MUST 保持最小 public concept-count，不得再把 `read helper / hook family / full meta view` 重新带回候选集。
- **NFR-002**: (NS-3, KF-3) 当前方案 MUST 保持单一 read law：`rawFormMeta()` 是唯一 raw truth，derived contract 只在其上做 policy-free 计算。
- **NFR-003**: (NS-3) 当前方案 MUST 提供唯一的 de-sugared mapping，保证 Agent 能机械解释这个候选，而不依赖隐藏 contract。
- **NFR-004**: (NS-4, KF-9) 当前方案 MUST 保持后续可收缩和可重开：在没有新增 live-residue 证据前，不提前承诺 exact noun 或 import shape。

### Key Entities _(include if feature involves data)_

- **RawFormMeta**: core-owned raw `$form` meta truth，至少包含 `submitCount / isSubmitting / isDirty / errorCount`。
- **Lightweight Derived Corollary**: 建立在 `RawFormMeta` 之上的一跳、严格、policy-free 派生结果；当前只包含 `isValid / isPristine`。
- **Forbidden Read-Side Shapes**: 当前被排除的形状集合，包括 `read helper(handle)`、hook family、selector/equality/cache contract、raw passthrough repackaging、完整 object view。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) 维护者只读本 spec，即可在 5 分钟内说明当前 placement 为什么是 `core-gap`、derived schema 是什么、forbidden set 是什么。
- **SC-002**: (NS-3) Agent 只凭本 spec，就能写出唯一允许的 de-sugared mapping，并说明 `canSubmit` 与 raw passthrough 字段为什么不在当前冻结面。
- **SC-003**: (NS-3) 这轮结论不再要求冻结 exact API noun 或 import shape，也不会因为缺少它们而留下方向歧义。
- **SC-004**: (NS-4) 任何后续实现或 proposal 若把 `canSubmit`、handle-bound helper、hook family 或完整 object view 带回当前 contract，都能被本 spec 明确判为越界。
