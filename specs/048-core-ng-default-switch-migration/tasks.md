# Tasks: 048 切默认到 core-ng（迁移与回退口径）

**Input**: `specs/048-core-ng-default-switch-migration/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）
**Prerequisites**: `specs/047-core-ng-full-cutover-gate/*` Gate=PASS（无 fallback + 契约一致性 + Node+Browser 证据预算）

> NOTE（2025-12-31）：本 tasks 对应“默认切到 `core-ng`”的历史实现；当前仓库已选择 **单内核默认**（默认 `core`，`core-ng` 仅对照/试跑显式启用），因此本文不再作为当前行为裁决。以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准。

## Phase 1: Setup (Shared)

**Purpose**: 固化迁移说明与证据落点（文档/工件结构）

- [x] T001 创建证据落点目录（before/after/diff）`specs/048-core-ng-default-switch-migration/perf/`
- [x] T002 [P] 固化迁移 playbook（切默认步骤 + 回退步骤 + 失败口径 + 证据门槛）`specs/048-core-ng-default-switch-migration/contracts/migration-playbook.md`
- [x] T003 [P] 对齐 quickstart（含 fail-fast 与证据门槛）`specs/048-core-ng-default-switch-migration/quickstart.md`
- [x] T004 [P] 对齐 plan（Deepening Notes + 可执行 perf 命令）`specs/048-core-ng-default-switch-migration/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 切默认的前置门槛与运行时不变量

- [x] T005 验证前置条件：047 Full Cutover Gate 必须 PASS（定位 Gate 结论/证据落点）`specs/047-core-ng-full-cutover-gate/quickstart.md`
- [x] T006 固化默认选择：未指定 `kernelId` 时默认请求 `core-ng` + `fullCutover` 模式（禁止 fallback）`packages/logix-core/src/Runtime.ts`
- [x] T007 固化 core-ng 服务实现注册表（覆盖 CutoverCoverageMatrix.requiredServiceIds）`packages/logix-core/src/internal/runtime/core/RuntimeServices.impls.coreNg.ts`
- [x] T008 固化 FullCutoverGate 失败锚点：装配期 `txnSeq=0`，FAIL 可序列化且 Slim `packages/logix-core/src/internal/runtime/core/FullCutoverGate.ts`
- [x] T009 固化装配期 gate：requested kernel != core 且 mode=fullCutover 时，缺 bindings / implicit fallback 必须 FAIL `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`

---

## Phase 3: User Story 1 - 切默认后系统可用且可回退 (Priority: P1) 🎯 MVP

**Goal**: 默认创建 runtime 走 `core-ng` full cutover；显式 `kernelId="core"` 可回退；两者都可解释/可证据化。

**Independent Test**:

- 默认创建 runtime：通过 `packages/logix-core/test/Runtime/Runtime.defaultKernel.core.test.ts`
- 显式回退：通过 `packages/logix-core/test/Runtime/Runtime.rollbackKernel.core.test.ts`

- [x] T010 [US1] 默认路径：Runtime.make 注入 `core-ng` kernel ref + runtime_default overrides + fullCutover gate `packages/logix-core/src/Runtime.ts`
- [x] T011 [US1] 回退路径：`kernelId="core"` 清空 runtime_default overrides 并选择 builtin/core `packages/logix-core/src/Runtime.ts`
- [x] T012 [US1] 禁止隐式 fallback：fullCutover 下缺 bindings 必须 FAIL（含 `gate.anchor.txnSeq=0`）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T013 [P] [US1] 测试：默认 kernel=core-ng 且 fully activated `packages/logix-core/test/Runtime/Runtime.defaultKernel.coreNg.test.ts`
- [x] T014 [P] [US1] 测试：显式 `kernelId="core"` 选择 core 且证据可解释 `packages/logix-core/test/Runtime/Runtime.rollbackKernel.core.test.ts`
- [x] T015 [P] [US1] 测试：fullCutover 下禁止 implicit fallback `packages/logix-core/test/Runtime/Runtime.noImplicitFallback.test.ts`
- [x] T016 [P] [US1] 测试：默认/回退路径下 evidence 与 gate result（diagnostics=off）可 JSON 序列化 `packages/logix-core/test/Runtime/Runtime.kernelEvidence.serializable.test.ts`
- [x] T017 [P] [US1] 对照验证：补齐/校验 045 harness 覆盖 “默认路径(core-ng)” 与 “显式回退(core)” `packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts`

---

## Phase 4: User Story 2 - 上层生态不被绑死在 core-ng (Priority: P1)

**Goal**: 上层 consumer 不直接依赖 `@logixjs/core-ng`；只依赖 `@logixjs/core` 即可解释当前 kernel 选择与回退。

**Independent Test**: `packages/logix-react/test/internal/no-core-ng-dependency.contract.test.ts`

- [x] T018 [P] [US2] 合同测试：@logixjs/react 不声明 @logixjs/core-ng 依赖 `packages/logix-react/test/internal/no-core-ng-dependency.contract.test.ts`
- [x] T019 [P] [US2] 合同测试：禁止在非允许范围 import `@logixjs/core-ng`（仅允许 `packages/logix-core-ng/**` 与少量 tests/bench/trial-run）`packages/logix-core/test/Contracts/Contracts.048.NoCoreNgImports.test.ts`
- [x] T020 [P] [US2] 审计 packages consumer：确认未引入 @logixjs/core-ng 直接依赖（如存在则移除）`packages/logix-devtools-react/package.json`、`packages/logix-sandbox/package.json`、`packages/logix-form/package.json`、`packages/logix-query/package.json`
- [x] T021 [P] [US2] 审计 apps/examples consumer：确认未引入 @logixjs/core-ng 直接依赖（如存在则移除）`apps/logix-galaxy-fe/package.json`、`apps/studio-fe/package.json`、`apps/logix-galaxy-api/package.json`、`examples/logix/package.json`、`examples/logix-react/package.json`、`examples/logix-sandbox-mvp/package.json`、`examples/logix-form-poc/package.json`、`examples/effect-api/package.json`

---

## Phase 5: User Story 3 - 迁移说明与证据落盘可交接 (Priority: P2)

**Goal**: 有迁移步骤、有回退步骤、有 Node+Browser perf 证据落盘（before/after/diff），并能在 spec 目录内完成闭环。

**Independent Test**: 只看 `specs/048-core-ng-default-switch-migration/` 即可找到：迁移说明 + 回退口径 + 证据文件路径 + 结论摘要。

> Note（防误判）：本阶段的 perf gate 证据必须基于“默认路径”，因此采集 before/after 时不要设置 `LOGIX_PERF_KERNEL_ID` / `VITE_LOGIX_PERF_KERNEL_ID`；显式回退（`kernelId="core"`）仅用于迁移/排障验证，不计入默认路径 gate。

- [x] T022 [P] [US3] 采集 before（P1 suites 合并报告，含 Node+Browser）：`profile=default` + 隔离 worktree 落盘 `specs/048-core-ng-default-switch-migration/perf/before.38db2b05.default.p1.json`
- [x] T023 [P] [US3] 采集 after（P1 suites 合并报告，含 Node+Browser）：`profile=default` + 隔离 worktree 落盘 `specs/048-core-ng-default-switch-migration/perf/after.worktree.default.p1.json`
- [x] T024 [P] [US3] 采集 before（全量矩阵报告）：`profile=default` + 隔离 worktree 落盘 `specs/048-core-ng-default-switch-migration/perf/before.38db2b05.default.json`
- [x] T025 [P] [US3] 采集 after（全量矩阵报告）：`profile=default` + 隔离 worktree 落盘 `specs/048-core-ng-default-switch-migration/perf/after.worktree.default.json`
- [x] T026 [P] [US3] 产出 diff（P1 gate + 全量矩阵）：P1 diff 要求 `comparability.comparable=true` 且 `summary.regressions==0` `specs/048-core-ng-default-switch-migration/perf/diff.before.38db2b05__after.worktree.default.p1.json`、`specs/048-core-ng-default-switch-migration/perf/diff.before.38db2b05__after.worktree.default.json`
- [x] T027 [US3] 将证据文件名与结论摘要写回 quickstart（含失败策略）`specs/048-core-ng-default-switch-migration/quickstart.md`

---

## Phase 6: Polish & Cross-Cutting

- [x] T028 [P] 回写 046：M4 指向 048，并更新 registry 状态 `specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T029 [P] 对齐 drafts 总览：让 logix-ng-architecture topic 指向 048（避免口径漂移）`docs/specs/drafts/topics/logix-ng-architecture/README.md`
- [x] T030 质量门：跑通 typecheck/lint/test，并确认 transaction boundary guard 相关用例通过 `packages/logix-core/test/Runtime/Runtime.runProgram.transactionGuard.test.ts`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（047 Gate PASS）→ US1/US2（可并行）→ US3（证据落盘）→ Cross-Cutting

---

## Parallel Example: User Story 3

```bash
Task: "采集 before/after（browser）落盘 specs/048-core-ng-default-switch-migration/perf/*.browser.json"
Task: "采集 before/after（node）落盘 specs/048-core-ng-default-switch-migration/perf/*.node.json"
```

---

## Implementation Strategy

- MVP：先完成 US1（默认切换 + 回退 + no fallback + tests）
- 然后 US2（consumer 依赖治理）
- 最后 US3（隔离 worktree 的 before/after/diff + quickstart 结论落盘）
