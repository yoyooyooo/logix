# Tasks: 045 Dual Kernel Contract（当前内核 + core-ng）

**Input**: `specs/045-dual-kernel-contract/spec.md`, `specs/045-dual-kernel-contract/plan.md`, `specs/045-dual-kernel-contract/research.md`, `specs/045-dual-kernel-contract/data-model.md`, `specs/045-dual-kernel-contract/contracts/*`, `specs/045-dual-kernel-contract/quickstart.md`

## Phase 1: Setup（shared）

- 说明：从 046 的视角（M0=“分支点可用”），045 的核心价值是 **Kernel Contract + 对照验证跑道 + 默认路径无回归证据**。因此若你当前目标是先验证契约设计合理性，可以 **先做 Phase 2 的 T005–T013**；`@logixjs/core-ng` 包的 scaffolding（T001–T004）主要用于后续 US2/US3 的“可替换实现注入”，可以暂缓。

- [x] T001 创建 `packages/logix-core-ng/package.json`（`name=@logixjs/core-ng`，禁用 “v3” 残留叫法）
- [x] T002 创建 `packages/logix-core-ng/tsconfig.json` 与 `packages/logix-core-ng/tsconfig.test.json`
- [x] T003 创建 `packages/logix-core-ng/src/index.ts`（先只导出最小入口：layer/工厂 + 版本信息）
- [x] T004 创建 `packages/logix-core-ng/test/CoreNg.smoke.test.ts`（最小 smoke：可被 vitest 发现并运行）

---

## Phase 2: Foundational（Blocking）

> 目标：把 “Kernel Contract” 收敛为 `@logixjs/core` 可导出的稳定契约点，并提供 `core-ng` 可注入的实现扩展点；默认路径热循环保持零分支/零分配变化。

- [x] T005 定义 `KernelId`/`KernelImplementationRef`/Tag 与 helper layer 于 `packages/logix-core/src/Kernel.ts`
- [x] T006 [P] 将 `Kernel` 作为 public submodule 导出：更新 `packages/logix-core/src/index.ts` 与 `packages/logix-core/package.json`（exports + publishConfig）
- [x] T007 定义 `RuntimeServicesEvidence` 的对外读取入口（不暴露 `src/internal/*`）：在 `packages/logix-core/src/Kernel.ts` 或 `packages/logix-core/src/internal/InternalContracts.ts` 增加最小 accessor
- [x] T008 引入“可注入实现注册表”契约：在 `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts` 定义 Registry Tag（serviceId → impls），并在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 合并 builtin + registry impls 后再 `selectRuntimeService(...)`
- [x] T009 将 “按 `ManagedRuntime` 选择内核” 固化为装配点：在 `packages/logix-core/src/Runtime.ts`（或 `packages/logix-core/src/Kernel.ts`）提供构造 layer 的最小 helper（runtime_default scope），禁止按 moduleId 选择作为默认路径
- [x] T010 实现证据采集分档：在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 对 `EvidenceCollectorTag.setRuntimeServicesEvidence(...)` 加闸门（diagnostics=off 不写入；light/full 写入）
- [x] T011 扩展证据采集：为 `KernelImplementationRef` 增加 collector 通道并写入 EvidencePackage.summary（`packages/logix-core/src/internal/observability/evidenceCollector.ts`）
- [x] T012 更新 TrialRun 报告的环境摘要：`packages/logix-core/src/internal/observability/trialRunModule.ts` 在 diagnostics=off 输出 `kernelImplementationRef`（极小摘要），在 light/full 才输出 `runtimeServicesEvidence`
- [x] T013 [P] 补齐 JSON 可序列化与 schema 对齐检查：为 `KernelImplementationRef` 增加最小 runtime validator（位置：`packages/logix-core/src/internal/observability/jsonValue.ts` 或 `packages/logix-core/src/Kernel.ts`）

**Tests（Foundational）**

- [x] T014 [P] 新增测试：diagnostics=off 时 EvidencePackage.summary 不包含 `runtime.services`（`packages/logix-core/test/observability/Evidence.summary.runtimeServices.off.test.ts`）
- [x] T015 [P] 新增测试：diagnostics=off 时 TrialRunReport.environment 包含 `kernelImplementationRef`（且默认 `kernelId="core"`）但不包含 `runtimeServicesEvidence`（`packages/logix-core/test/observability/TrialRunReport.kernelRef.off.test.ts`）
- [x] T016 [P] 新增测试：diagnostics=light/full 时 TrialRunReport.environment 包含 `runtimeServicesEvidence`（`packages/logix-core/test/observability/TrialRunReport.runtimeServices.light.test.ts`）

**Contract Verification Harness（Foundational）**

- [x] T017 实现 kernel contract verification harness：新增 `packages/logix-core/src/internal/reflection/kernelContract.ts`（用 trial-run 跑同一交互序列的两次执行，输出机器可读 diff；差异锚点必须包含 `instanceId/txnSeq/opSeq`）
- [x] T018 [P] 对外导出 harness：更新 `packages/logix-core/src/Reflection.ts`（新增 `verifyKernelContract` 等最小入口，供 CI/TrialRun/Agent 消费）
- [x] T019 [P] 新增测试：`Reflection.verifyKernelContract` 基础用例（core vs core）PASS，diff 可序列化且稳定（`packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`）

**Perf Evidence（Foundational）**

- [x] T020 [P] 采集默认路径 before 基线（Browser：`pnpm perf collect -- --profile default --out specs/045-dual-kernel-contract/perf/before.browser.worktree.default.json`；Node：`pnpm perf bench:traitConverge:node -- --profile default --out specs/045-dual-kernel-contract/perf/before.node.worktree.default.json`）`specs/045-dual-kernel-contract/perf/*`
- [x] T021 采集 after 并做 diff（分别对 Browser/Node 落盘 after + diff：`pnpm perf diff -- --before ... --after ... --out specs/045-dual-kernel-contract/perf/diff.<...>.json`；判据：`comparable=true && regressions==0`；若仅跑 `quick` 只能作为线索，交付结论必须 `default/soak`）`specs/045-dual-kernel-contract/perf/*`

---

## Phase 3: User Story 1（P1）- 上层生态仅依赖 @logixjs/core

**Goal**: `@logixjs/react`/Devtools/Sandbox 不依赖 `@logixjs/core-ng`；通过统一最小 IR 与证据能解释“用的哪个内核/为何如此选择”。

**Independent Test**: 在不引入 `@logixjs/core-ng` 依赖的前提下，TrialRun/Devtools 仍可导出并解释 `KernelImplementationRef`（off）与 `RuntimeServicesEvidence`（light/full）。

- [x] T022 [P] [US1] 添加防回归测试：`packages/logix-react/package.json` 不得声明依赖 `@logixjs/core-ng`（`packages/logix-react/test/internal/no-core-ng-dependency.contract.test.ts`）
- [x] T023 [US1] 将 “≤5 关键词心智模型” 写入 `specs/045-dual-kernel-contract/spec.md` 的 NFR-005（不引入新概念：`kernelId(requested)` + `servicesEvidence(actual)` + `fallback` + `diagnosticsLevel` + `budget`）

---

## Phase 4: User Story 2（P1）- core-ng 可并行演进 + 风险可拦截

**Goal**: `@logixjs/core-ng` 可通过注入契约点提供实现；允许在 trial-run/test/dev 渐进替换（可混用 builtin 且可证据化），但“宣称可作为默认实现”必须全套切换（无 fallback）。

**Independent Test**: 用同一套 trial-run/contract harness 驱动 core 与 core-ng：能导出对照证据；当发生 fallback 时能被识别为“未达全套切换”。

- [x] T024 [P] [US2] 在 `packages/logix-core-ng/src/CoreNgLayer.ts` 提供 `coreNgKernelLayer(...)`：注入 `KernelImplementationRefTag`（`kernelId='core-ng'`、`packageName='@logixjs/core-ng'`）
- [x] T025 [P] [US2] 在 `packages/logix-core-ng/src/RuntimeServices.impls.ts` 注册至少 1 个可替换 service 的实现（推荐先从 `txnQueue` 或 `operationRunner` 做 “等价实现/无额外分配”）
- [x] T026 [US2] 在 `packages/logix-core-ng/src/index.ts` 导出 `coreNgKernelLayer`（以及未来扩展入口）
- [x] T027 [P] [US2] 新增测试：当请求 `core-ng` 且覆盖某个 serviceId 时，`RuntimeServicesEvidence` 里 binding 的 implId=core-ng（`packages/logix-core-ng/test/RuntimeServicesSelection.test.ts`）
- [x] T028 [P] [US2] 新增测试：当请求 `core-ng` 但 implId 不存在时，`RuntimeServicesEvidence.overridesApplied` 记录 fallback（`packages/logix-core-ng/test/RuntimeServicesFallback.test.ts`）
- [x] T029 [US2] 新增“全套切换判定”工具函数（不引入新概念）：`packages/logix-core/src/Kernel.ts` 提供 `isKernelFullyActivated(...)`（基于 `RuntimeServicesEvidence.overridesApplied`/bindings 识别 fallback）
- [x] T030 [P] [US2] 新增测试：`isKernelFullyActivated` 在发生 fallback 时返回 false（`packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts`）
- [x] T031 [P] [US2] 运行对照验证：用 `Reflection.verifyKernelContract` 跑同一交互序列 core vs core-ng，并输出结构化 diff（`packages/logix-core-ng/test/KernelContract.verifyKernelContract.test.ts`）

**Perf Evidence（US2）**

- [x] T032 [P] [US2] 用 `$logix-perf-evidence` 对比 “request core-ng（至少 1 个 service override）” 与默认路径差异，落盘到 `specs/045-dual-kernel-contract/perf/core-ng-trial/*`（不得出现显著回归；若回归则限制为 trial-only 并记录原因）

---

## Phase 5: User Story 3（P2）- 多 runtime 共存与隔离

**Goal**: 同一宿主内可并行创建多个 `ManagedRuntime`（多棵 DI 树），分别选择不同 `kernelId`；两者严格隔离且证据可解释。

**Independent Test**: 同进程构造两个 runtime（core vs core-ng），对同一模块执行交互序列：状态不串扰、证据中 kernelId 可区分。

- [x] T033 [P] [US3] 新增测试：同进程创建两个 runtime（不同 `KernelImplementationRef`），两者 state/dispatch 不互相影响（`packages/logix-core/test/Runtime/DualRuntimeIsolation.test.ts`）
- [x] T034 [P] [US3] 新增测试：两个 trial-run 的 EvidencePackage.summary/TrialRunReport.environment 能区分 kernelId（`packages/logix-core/test/observability/DualTrialRunKernelRef.test.ts`）

---

## Phase 6: Polish & Cross-Cutting

- [x] T035 [P] 修正 “v3” 残留叫法：`packages/logix-core/package.json` 的 `description` 与相关 docs（若涉及）统一为“当前 @logixjs/\\*”口径
- [x] T036 运行并校验 `specs/045-dual-kernel-contract/quickstart.md`（按文档闭环走一遍）

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为强依赖（没有可注入契约点就无法开展 US2/US3）。
- US1/US2/US3 都依赖 Phase 2，但 Phase 2 完成后可并行推进。
- 任何触及 runtime 热路径/装配点的变更：必须先补齐 T020/T021 的 `$logix-perf-evidence` before/after/diff，再允许合入。
