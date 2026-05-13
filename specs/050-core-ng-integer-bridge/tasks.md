# Tasks: 050 core-ng 整型桥（Integer Bridge）

**Input**: `specs/050-core-ng-integer-bridge/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）
**Prerequisites**: `specs/050-core-ng-integer-bridge/plan.md`（required） + `specs/050-core-ng-integer-bridge/spec.md`（required）

## Format: `[TaskID] [P?] [Story] Description with file path`

- `[P]`：可并行（不同文件/无依赖）
- `[US1]/[US2]/[US3]`：必须与 `spec.md` 的 User Story 编号一致

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 固化证据落点与契约基线（避免实现前漂移）

- [x] T001 创建证据落点目录 `specs/050-core-ng-integer-bridge/perf/.gitkeep`
- [x] T002 [P] 校对 FieldPath 契约（segments 透传 + txn 内禁往返）`specs/050-core-ng-integer-bridge/contracts/fieldpath-contract.md`
- [x] T003 [P] recordPatch/零分配契约已迁移到 051（本 spec 不再作为权威口径）`specs/051-core-ng-txn-zero-alloc/contracts/txn-zero-alloc-contract.md`
- [x] T004 [P] 校对 perf evidence matrix 契约（matrix SSoT + diff 判据）`specs/050-core-ng-integer-bridge/contracts/perf-evidence-matrix.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 在进入任何 User Story 前，先把“无往返/可解释/可门禁”的最小地基打牢

- [x] T005 [P] 复用 039 的 guardrails 落点（converge/Exec IR/argument-based recording/diagnostics gate 已达标）`specs/039-field-converge-int-exec-evidence/tasks.md`
- [x] T006 定义 txn 内 DirtySet 的“无往返”表示（禁止在 commit 里 join/split；仅边界 materialize）`packages/logix-core/src/internal/field-path.ts`
- [x] T007 将 `StateTransaction.commit` 输出切到“无往返” DirtySet 表示（并保证 `diagnostics=off` 近零成本）`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T008 [P] 补齐/收敛 InternalContracts 的记录与导出入口（确保 consumer 不直接依赖 core-ng）`packages/logix-core/src/internal/InternalContracts.ts`

**Tests（Foundational）**

- [x] T009 [P] 新增/补齐测试：DirtySet/dirty roots 的 txn 输出不依赖 string 往返（id-first 或等价无 join/split 表示）`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- [x] T010 [P] light 下 recordPatch 零分配（调用点不创建 patch 对象）由 051 收口 `specs/051-core-ng-txn-zero-alloc/tasks.md`

---

## Phase 3: User Story 1 - 从源头到执行的整型闭环（无往返）(Priority: P1) 🎯 MVP

**Goal**: txn/exec 热循环内无 `split/join` 往返；执行路径由 `pathId/stepId` 驱动访问器表，禁止 `id→string→split` 的半成品态默认化。

**Independent Test**: `pnpm perf diff`（Node+Browser）满足 `comparable=true && regressions==0`，且守护测试能在热路径阻断 split/join 复燃。

- [x] T011 [US1] converge 执行 loop 已由 039 打穿为 `FieldPathId/StepId` + TypedArray 驱动（无 `split/join` 往返）`packages/logix-core/src/internal/state-field/converge.ts`
- [x] T012 [P] [US1] 静态 FieldPathId/StepId 表与可导出 Static IR 已存在（generation 内稳定）`packages/logix-core/src/internal/state-field/converge-ir.ts`
- [x] T013 [P] [US1] core-ng 执行形态（Exec VM/Exec IR）归 049（避免在 050 重复实现跑道）`specs/049-core-ng-linear-exec-vm/tasks.md`
- [x] T014 [P] [US1] “split/join 往返”守护与 off gate 归 052（全局闸门）`specs/052-core-ng-diagnostics-off-gate/tasks.md`

---

## Phase 4: User Story 2 - 稳定标识与可解释链路（不引入并行真相源）(Priority: P1)

**Goal**: id 分配可复核、可解释；对照验证与证据链不漂移（primary anchors 仍以 `instanceId/txnSeq/opSeq` 为准）。

**Independent Test**: 045 对照验证/差异锚点可对齐；`diagnostics=light/sampled/full` 下可导出最小可序列化 mapping 摘要，off 下不 materialize。

- [x] T015 [P] [US2] 固化 FieldPathId/StepId 的稳定性策略（不得依赖随机/时间；同 Static IR 可重复对齐）`packages/logix-core/src/internal/state-field/converge-ir.ts`
- [x] T016 [P] [US2] 增补可序列化的 id→readable 摘要导出（仅 light/sampled/full；off 近零成本）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T017 [P] [US2] 已存在稳定性回归测试（同输入可重复对齐）`packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DeterministicIds.test.ts`
- [x] T018 [P] [US2] 扩展 045 kernel contract verification：覆盖 integer bridge 的 anchors/mapping 摘要对齐（core vs core-ng）`packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`

---

## Phase 5: User Story 3 - 避免负优化的 guardrails（阶段性落地也安全）(Priority: P2)

**Goal**: 允许阶段性落地，但禁止“半成品态默认化”；异常/动态路径必须显式降级 `dirtyAll=true` + `DirtyAllReason`，并在 Gate 覆盖场景中视为 FAIL。

**Independent Test**: 每次关键切换默认行为前，都存在 Node+Browser 的 before/after/diff 工件与结论摘要（`comparable=true && regressions==0`）。

- [x] T019 [P] [US3] 为动态/异常路径补齐显式降级诊断（`dirtyAll=true` + `DirtyAllReason`，Slim/可序列化）`packages/logix-core/src/internal/field-path.ts`
- [x] T020 [US3] 显式降级策略已被守护测试覆盖：`dirtyAll=true` 必须带 `DirtyAllReason` 且可序列化/可解释 `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`、`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- [x] T021 [P] [US3] 采集/固化 Browser `converge.txnCommit` before（converge-only）`specs/050-core-ng-integer-bridge/perf/before.browser.converge.txnCommit.372a89d7.darwin-arm64.default.json`
- [x] T022 [P] [US3] 采集/固化 Browser `converge.txnCommit` after（converge-only）`specs/050-core-ng-integer-bridge/perf/after.browser.converge.txnCommit.dev.darwin-arm64.default.json`
- [x] T023 [P] [US3] 采集基线 before（Node converge.txnCommit）`specs/050-core-ng-integer-bridge/perf/before.node.372a89d7.darwin-arm64.default.json`
- [x] T024 [P] [US3] 采集整型化 after（Node converge.txnCommit）`specs/050-core-ng-integer-bridge/perf/after.node.worktree.darwin-arm64.default.json`
- [x] T025 [P] [US3] 产出 diff（Node + Browser converge-only，必须 `comparable=true && regressions==0` 才算 Gate PASS）`specs/050-core-ng-integer-bridge/perf/diff.node.372a89d7__worktree.darwin-arm64.default.json`、`specs/050-core-ng-integer-bridge/perf/diff.browser.converge.txnCommit.372a89d7__dev.darwin-arm64.default.json`
- [x] T026 [US3] 回写 perf 结论摘要到 quickstart（含不确定性/复测策略）`specs/050-core-ng-integer-bridge/quickstart.md`

> Note: Browser 全量矩阵报告的 diff 见 `specs/050-core-ng-integer-bridge/perf/diff.browser.372a89d7__worktree.darwin-arm64.default.json`（含非 baseline slices 的回归与 `stabilityWarning`），不作为 050 的硬门结论。

---

## Phase 6: Polish & Cross-Cutting

- [x] T027 [P] 回写 046 registry：把 050 状态更新为 implementing/done（取决于证据），并补齐证据链接 `specs/046-core-ng-roadmap/spec-registry.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为硬依赖；完成 Phase 2 后，US1/US2/US3 可并行推进（以团队容量决定）。
- MVP 建议：先完成 Phase 1-3（US1）并通过最小证据门禁，再扩展到 US2/US3。
