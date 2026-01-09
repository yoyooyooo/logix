# Tasks: 047 core-ng 全套切换达标门槛（无 fallback）

**Input**: `specs/047-core-ng-full-cutover-gate/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

## Phase 1: Setup（shared）

- [x] T001 创建证据落点目录（before/after/diff）`specs/047-core-ng-full-cutover-gate/perf/`（采集必须在独立 `git worktree/单独目录`）
- [x] T002 [P] 固化 coverage matrix 文档与其“单一事实源”策略（后续实现需让测试读取同一来源）`specs/047-core-ng-full-cutover-gate/contracts/coverage-matrix.md`
- [x] T003 [P] 固化 perf evidence matrix 的 SSoT 引用与选择规则（suites/budgets SSoT=matrix.json；至少覆盖 `priority=P1`）`specs/047-core-ng-full-cutover-gate/contracts/perf-evidence-matrix.md`

---

## Phase 2: Foundational（Blocking）

> 目标：把 “Full Cutover Gate” 变成可执行的契约验证与失败策略，并把判定结果纳入统一最小 IR/证据链路。

- [x] T004 实现 coverage matrix 的可读取单一事实源（建议：`packages/logix-core/src/Kernel.ts` 导出 `CutoverCoverageMatrix`，并在测试中引用；禁止散落常量）`packages/logix-core/src/Kernel.ts`
- [x] T005 实现 Full Cutover Gate 判定函数（输入：requested kernelId + runtimeServicesEvidence；输出：结构化 PASS/FAIL + `missingServiceIds` + 最小锚点 `moduleId/instanceId/txnSeq`；fullCutover 下禁止 fallback；装配期失败允许 `txnSeq=0` 代表 assembly）`packages/logix-core/src/Kernel.ts`
- [x] T006 将 Gate 结果纳入可序列化证据（`diagnostics=off` 下可运行且输出最小摘要；light/full 仅补充细节；命中 allowlist 时仍可 PASS 但必须输出 `allowedDiffs` 最小摘要（按 `metaKey`））`packages/logix-core/src/internal/observability/*` 或 `packages/logix-core/src/Kernel.ts`
- [x] T007 实现 `Reflection.verifyFullCutoverGate`：串联 047 Gate + 045 `verifyKernelContract`，并支持（可选）contract diff allowlist（SSoT=代码；仅允许 op meta 的部分 key，按 `metaKey`）供 CI/TrialRun/Agent 统一调用 `packages/logix-core/src/Reflection.ts`
- [x] T007a [P] 提供 allowlist 的代码 SSoT：在 `@logixjs/core` 导出 `KernelContractMetaAllowlist`（`ReadonlyArray<{ metaKey; reason? }>`）供 045/047 验证器读取（禁止 spec/CI 各自维护常量）`packages/logix-core/src/Kernel.ts`
- [x] T007b [P] allowlist 默认禁用：`KernelContractMetaAllowlist` 默认返回空数组，且仅在显式开关启用时才生效（避免无意放行）`packages/logix-core/src/Kernel.ts`

**Tests（Foundational）**

- [x] T008 [P] 新增测试：Full Cutover 模式下任一 service fallback 必须 FAIL（结构化缺口包含 serviceId）`packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts`
- [x] T009 [P] 新增测试：trial 模式下允许 fallback，但 evidence 必须记录 fallback（不误判为 fully activated）`packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
- [x] T010 [P] 新增测试：Gate 结果不依赖日志，输出可序列化（JSON）；失败最小锚点包含 `kernelId + missingServiceIds + moduleId/instanceId/txnSeq`（装配期 `txnSeq=0`）；命中 allowlist（仅 `metaKey`）时仍可 PASS 且输出 `allowedDiffs` 摘要；`diagnostics=off` 下可运行 `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`

---

## Phase 3: User Story 1（P1）- 可切默认判定可自动化且不误判

**Goal**: 一键得到 PASS/FAIL，并可定位缺口（禁止半成品态误判）。

**Independent Test**: 运行 `Reflection.verifyFullCutoverGate`（或等价入口）得到结构化结果。

- [x] T011 [US1] 为 `@logixjs/core-ng` 增补覆盖 coverage matrix 的所有必选 service 实现（缺 1 个即 Gate FAIL）`packages/logix-core-ng/src/*`
- [x] T012 [US1] 用对照验证 harness 跑 core vs core-ng（full cutover），保证 diff 为空或在允许差异白名单内 `packages/logix-core-ng/test/*`、`packages/logix-core/test/Contracts/*`

---

## Phase 4: User Story 2（P1）- 性能证据门禁（Node + Browser）

**Goal**: Full Cutover 的默认路径预算可证据化，且无不可解释回归。

> Note（防误判）：
>
> - before（core）采集时不要设置 `LOGIX_PERF_KERNEL_ID` / `VITE_LOGIX_PERF_KERNEL_ID`
> - after（core-ng）采集时：
>   - Browser：设置 `VITE_LOGIX_PERF_KERNEL_ID=core-ng`
>   - Node：设置 `LOGIX_PERF_KERNEL_ID=core-ng`
> - after 必须满足 **Full Cutover（无 fallback）**；任何 “perf-only override（只替换单个 serviceId）” 的 after 结果不得作为 047 Gate 证据

- [x] T020 [P] [US2] 采集 core 默认 before（Node + Browser；`profile=default`；独立 `git worktree/单独目录`）落盘 `specs/047-core-ng-full-cutover-gate/perf/before.*.json`
- [x] T021 [P] [US2] 采集 core-ng full cutover after（Node + Browser；`profile=default`；独立 `git worktree/单独目录`）落盘 `specs/047-core-ng-full-cutover-gate/perf/after.*.json`
- [x] T022 [P] [US2] 产出 diff（Node + Browser；`profile=default`；before/after 需 `matrixId+matrixHash` 一致；`comparability.comparable=true` 且 `summary.regressions==0`；独立 `git worktree/单独目录`）并写入结论摘要 `specs/047-core-ng-full-cutover-gate/perf/diff.*.json`、`specs/047-core-ng-full-cutover-gate/quickstart.md`

---

## Phase 5: User Story 3（P2）- coverage matrix 可演进

**Goal**: Kernel Contract 扩面时，不会漏掉 cutover 判定与证据门禁。

- [x] T030 [US3] （条件未触发，暂不更新；触发条件见 coverage matrix contract）当 045/RuntimeKernel 新增可替换 serviceId 时，同步更新 coverage matrix 单一事实源与测试 `packages/logix-core/src/Kernel.ts`、`specs/047-core-ng-full-cutover-gate/contracts/coverage-matrix.md`

---

## Phase 6: Polish & Cross-Cutting

- [x] T040 [P] 回写 046：把 M3 的“下一步新增 spec”改为指向 `specs/047-core-ng-full-cutover-gate/`，并更新 046 registry 状态 `specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
