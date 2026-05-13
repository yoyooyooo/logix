# Feature Specification: Form Canonical Error Carrier Cutover

**Feature Branch**: `143-form-canonical-error-carrier-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 FormErrorLeaf、raw schema writeback、errors.$schema、string/raw leaf residue 与 canonical error carrier 切成独立 member spec，并以零兼容、单轨实施推进实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

Form 侧关于错误的未来规划已经稳定为：

- 唯一错误 carrier 是 `FormErrorLeaf`
- cross-source error 只认：
  - `rule`
  - `decode`
  - `manual`
  - `submit`
- raw schema error、string leaf、`errors.$schema` 都只是 residue

当前实现还没真正切过去：

- error count 仍承认 string 和 object leaf
- raw schema error 还会直接写回错误树
- `errors.$schema` 仍是活跃写回位
- `setError` 与相关 reducer 仍带旧口径

这份 spec 的职责，是把 canonical error carrier 真正收成单线实现。

## Scope

### In Scope

- `FormErrorLeaf` 的实现级收口
- string/raw/object-first leaf residue 清理
- `errors.$schema` 的语义降级
- error count 与 error tree 的 canonical leaf 统一
- `setError` 与相关 reducer 路径的 canonical carrier 对齐

### Out of Scope

- 不在本 spec 内实现 validation bridge
- 不在本 spec 内收口 submit verdict / decoded payload
- 不在本 spec 内收口 active-shape receipts
- 不在本 spec 内重开 control plane report shell

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用一条错误 carrier 解释所有来源 (Priority: P1)

作为维护者，我希望所有错误来源最终都落到同一 `FormErrorLeaf`，而不是继续解释 string leaf、schema raw leaf 和 banner 特例。

**Traceability**: NS-4, KF-9

**Why this priority**: 这是 reason contract、trial、repair 能共用同一 truth 的前提。

**Independent Test**: 维护者可以通过 state / tests 判断 rule、decode、manual、submit error 都落到同一 canonical leaf shape。

**Acceptance Scenarios**:

1. **Given** rule error 与 manual error，**When** 我读取错误树，**Then** 两者都以同一 canonical leaf 表达。
2. **Given** decode error，**When** 我读取错误树，**Then** 我不再看到 raw schema object 作为 canonical leaf。

---

### User Story 2 - 实施者能删掉旧 leaf residue 而不留下影子路径 (Priority: P2)

作为实施者，我希望 string leaf、`errors.$schema`、raw object leaf 能被直接降级或删除，而不是继续保留 dual-write。

**Traceability**: NS-3, KF-4

**Why this priority**: dual-write 只会把旧壳层继续固定。

**Independent Test**: error count、reducer、setError、schema lowering 都只认 canonical leaf。

**Acceptance Scenarios**:

1. **Given** 某个错误写入发生，**When** reducer 更新 state，**Then** 它只写 canonical leaf。
2. **Given** error count 计算运行，**When** 它扫描错误树，**Then** 它不再把 string/raw object 当作 canonical leaf。

---

### User Story 3 - reviewer 能拒绝旧错误树并存与兼容层 (Priority: P3)

作为 reviewer，我希望能直接拒绝保留旧 leaf shape、dual-write 或兼容计数逻辑的方案。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 这是单轨实施的硬门。

**Independent Test**: reviewer 可以依据本 spec 直接否决旧 leaf 并存或兼容计数方案。

**Acceptance Scenarios**:

1. **Given** 有人提议保留 string leaf 兼容计数，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。
2. **Given** 有人提议继续把 raw schema object 写入主错误树，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。

### Edge Cases

- banner 语义仍可存在，但必须回收到 canonical scope，而不是第二错误分类表
- decode residue 可以保留为 debug material，但不能继续作为 canonical leaf
- manual overwrite 仍服从 canonical leaf clearing 规则

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) 系统 MUST 将所有错误来源最终 lower 到同一 `FormErrorLeaf`。
- **FR-002**: 系统 MUST 让 error tree 只承认 canonical leaf 作为真相源。
- **FR-003**: 系统 MUST 删除 string/raw/object-first leaf 的 canonical 身份。
- **FR-004**: 系统 MUST 将 `errors.$schema` 降为 residue，不再充当终局语义槽。
- **FR-005**: 系统 MUST 让 error count 只按 canonical leaf 计算。
- **FR-006**: 系统 MUST 让 `setError` 与 reducer 路径回到 canonical error carrier。
- **FR-007**: 系统 MUST 采用零兼容、单轨实施，不保留 dual-write 或兼容计数。

### Key Entities _(include if feature involves data)_

- **FormErrorLeaf**: Form 侧唯一错误 carrier。
- **Error Tree**: 只由 canonical leaf 组成的错误树。
- **Error Residue**: 历史上存在但不再拥有 canonical 身份的旧错误写回位。

### Non-Functional Requirements (Single Truth & Determinism)

- **NFR-001**: error truth 必须单线，不得出现并列 leaf taxonomy。
- **NFR-002**: clearing / overwrite / count 逻辑必须只围绕 canonical leaf。
- **NFR-003**: 本轮不得引入兼容层、dual-write 或影子错误树。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: rule / decode / manual / submit error 都落到同一 canonical leaf。
- **SC-002**: string/raw object leaf 从 error count 和 canonical tree 中退出。
- **SC-003**: `errors.$schema` 不再作为 canonical error tree 的真相槽位。
- **SC-004**: reviewer 可直接依据本 spec 否决旧 leaf 并存方案。
