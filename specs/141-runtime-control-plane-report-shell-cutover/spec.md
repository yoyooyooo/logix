# Feature Specification: Runtime Control Plane Report Shell Cutover

**Feature Branch**: `141-runtime-control-plane-report-shell-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 runtime control plane 的 VerificationControlPlaneReport、repairHints.focusRef、artifact-backed linking law 从当前 SSoT 与 proposal 收口为实际可实施的第一个 Form cutover member spec，并以零兼容、单轨实施推进 core/cli/test 对齐。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

当前 `runtime control plane` 这条链已经在 SSoT 上收到了较稳的程度：

- `VerificationControlPlaneReport` 应当是单一 top-level shell
- `repairHints` 应当回到 coordinate-first 的 machine target
- materializer 应当只通过 artifact-backed linking 暴露
- `TrialReport` 应当只保留 pure alias 身份

但实现层、CLI 输出和 contract tests 还没有同步到这条新口径。
结果是 authority 已经稳定，cutover 还没有真正开始。

这份 spec 的职责，是把这条 cutover 收成第一个可实施 member spec：

- 让 `runtime/09` 的 report shell 口径进入 core contract
- 让 CLI 输出回到同一 report shell
- 让 contract tests 和 integration output tests 对齐新口径
- 保持零兼容、单轨实施，不保留旧 report shell、旧 repair hint shape 或双命名轴

## Scope

### In Scope

- `docs/ssot/runtime/09-verification-control-plane.md` 的 report shell contract 落地
- `packages/logix-core/src/ControlPlane.ts`
- `packages/logix-cli/src/internal/result.ts`
- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`
- `packages/logix-cli/src/internal/commands/compare.ts`
- control plane contract tests
- CLI output contract tests

### Out of Scope

- 不在本 spec 内实现 Form validation bridge
- 不在本 spec 内清理 `errors.$schema`、raw schema writeback 或 canonical error carrier residue
- 不在本 spec 内实现真实 scenario materializer payload
- 不在本 spec 内重开 compare 主轴

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能依赖一份稳定的 report shell 理解 check/trial/compare 输出 (Priority: P1)

作为维护者，我希望 `runtime.check / runtime.trial / runtime.compare` 都落到同一份 report shell，这样我不需要再记多种 report 形状。

**Traceability**: NS-4, KF-9

**Why this priority**: 这是后续 Form cutover 能否稳定回链 repair 和 diagnostics 的前提。

**Independent Test**: 运行三条命令时，我看到的 report 都满足同一 contract，只通过 `stage + mode` 区分。

**Acceptance Scenarios**:

1. **Given** 我运行 `runtime.check`，**When** 我读取输出 report，**Then** 我看到的是单一 `VerificationControlPlaneReport` shell。
2. **Given** 我运行 `runtime.trial` 或 `runtime.compare`，**When** 我读取输出 report，**Then** 我看到的仍是同一 shell，而不是第二 report object。

---

### User Story 2 - Agent 能拿到坐标 first 的 repair target (Priority: P2)

作为 Agent，我希望 `repairHints` 先给我稳定的局部坐标，再决定是否需要跳到 supporting artifact。

**Traceability**: NS-3, NS-10, KF-4

**Why this priority**: 如果 repair target 继续依赖文案或多套分类表，后续实现一定会再次分叉。

**Independent Test**: 当失败可以局部化时，至少一个 repair hint 能给出稳定的 `focusRef`；如果需要 supporting artifact，也能通过独立 linking 找到它。

**Acceptance Scenarios**:

1. **Given** 某个失败可以定位到 declaration 或 witness，**When** 我读取 repair hints，**Then** 至少一个 hint 带有非空 `focusRef`。
2. **Given** 某个失败还需要下钻 supporting artifact，**When** 我读取 repair hints，**Then** 我可以通过独立 linking 找到对应 artifact，而不是把 artifact 身份混进 repair identity。

---

### User Story 3 - reviewer 能拒绝旧 report shell 与兼容路径继续留在主线 (Priority: P3)

作为 reviewer，我希望能直接拒绝继续保留旧 report shape、第二命名轴、兼容层或双轨输出方案。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 这是这条 cutover 真能完成的硬门。

**Independent Test**: reviewer 可以依据本 spec 直接否决旧 shell 并存、旧 hint shape 并存、dual-write 输出或 shadow path。

**Acceptance Scenarios**:

1. **Given** 有人提议保留旧 `Runtime*Report` shape 与新 shell 双轨并存，**When** reviewer 对照本 spec，**Then** 能直接判定该方案不符合目标。
2. **Given** 有人提议用 dual-write 方式同时输出旧 hint shape 和新 hint shape，**When** reviewer 对照本 spec，**Then** 能直接判定该方案不符合目标。

### Edge Cases

- global boot / env / CLI route 级失败可以没有 `focusRef`
- `relatedArtifactOutputKeys` 可以为空
- supporting artifact 可以存在，但不能进入 compare 主轴
- `TrialReport` 若还保留，只能是 pure alias，不能拥有第二 shape

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) 系统 MUST 让 `runtime.check / runtime.trial / runtime.compare` 都输出同一 `VerificationControlPlaneReport` shell。
- **FR-002**: 系统 MUST 将 report payload 的 `kind` 固定为单一常量 `VerificationControlPlaneReport`。
- **FR-003**: 系统 MUST 只用 `stage + mode` 作为 report 变体轴。
- **FR-004**: (NS-3, KF-4) 系统 MUST 将 `repairHints` 的 machine core 固定为：
  - `code`
  - `canAutoRetry`
  - `upgradeToStage`
  - `focusRef`
- **FR-005**: 系统 MUST 让 `focusRef` 继续只承载 coordinate-first repair target：
  - `declSliceId`
  - `reasonSlotId`
  - `scenarioStepId`
  - `sourceRef`
- **FR-006**: 系统 MUST 让 `reasonSlotId / sourceRef` 在 report shell 中只承载 opaque stable id，不展开 domain payload。
- **FR-007**: 系统 MUST 将 materializer linking 固定为 artifact-backed linking，并将 artifact linking 与 repair identity 分离。
- **FR-008**: 系统 MUST 删除 `artifact.role` 这条分类轴，不再保留第二 materializer taxonomy。
- **FR-009**: 系统 MUST 将 `TrialReport` 固定为 `VerificationControlPlaneReport` 的 pure alias，不允许第二 shape、第二 schema version 或第二 authority。
- **FR-010**: 系统 MUST 让 `@logixjs/core` contract、CLI emit path 与 contract tests 共享同一 report shell truth。
- **FR-011**: 系统 MUST 采用零兼容、单轨实施，不保留 dual-write、shadow path、旧 report shell 或旧 repair hint shape 的共存策略。

### Key Entities _(include if feature involves data)_

- **VerificationControlPlaneReport**: control plane 的单一 top-level report shell。
- **VerificationControlPlaneRepairHint**: 用于提供 machine-localizable repair target 的结构化 hint。
- **VerificationControlPlaneFocusRef**: 用于承载 coordinate-first repair target 的局部坐标引用。
- **Supporting Artifact Ref**: 用于承载 late-bound explain / repair supporting material 的 artifact 引用。

### Non-Functional Requirements (Determinism & Single Authority)

- **NFR-001**: report shell 必须保持单一 authority，living SSoT 与实现 contract 不得长期分叉。
- **NFR-002**: `focusRef` 中承载的坐标必须稳定、可比较、可回链，不能依赖随机值、临时数组下标或原始 trace path。
- **NFR-003**: materializer linking 不得引入第二 materializer truth，也不得进入 compare 主轴。
- **NFR-004**: 本轮实施不得引入兼容层、弃用期或双轨输出。
- **NFR-005**: docs、core contract、CLI 输出与 tests 对 report shell 的叙述必须完全一致。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-4, KF-9) `check / trial / compare` 三条命令输出的 report 都通过同一 contract guard。
- **SC-002**: `repairHints` 在可局部化失败场景下，至少一个 hint 带有非空 `focusRef`。
- **SC-003**: `artifact.role` 从 exact contract 中移除，不再存在第二 materializer taxonomy。
- **SC-004**: reviewer 可直接依据本 spec 否决旧 shell 并存、dual-write 或 shadow path。
- **SC-005**: core contract、CLI 输出与 contract tests 不再对 report naming 与 hint shape 使用并列口径。
