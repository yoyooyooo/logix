# Implementation Plan: 049 core-ng 线性执行 VM（Exec VM）

**Branch**: `049-core-ng-linear-exec-vm` | **Date**: 2025-12-27 | **Spec**: `specs/049-core-ng-linear-exec-vm/spec.md`  
**Input**: Feature specification from `specs/049-core-ng-linear-exec-vm/spec.md`

## Summary

目标：把 core-ng 的关键热路径推进到“线性执行 VM”形态（runtime-only NG）：

- 构造期预编译（JIT-style）：Static IR → Exec IR（plan + 访问器表 + bitset + typed buffers）
- 运行期窗口内只做线性 plan 执行（避免字符串解析/对象分配）
- 复用 045 的 Kernel Contract 与对照验证 harness
- 以 `$logix-perf-evidence` 的 Node + Browser before/after/diff 拦截负优化

本 plan 只固化硬门与落点；实现/证据进度以 `specs/049-core-ng-linear-exec-vm/tasks.md` 与 `specs/049-core-ng-linear-exec-vm/quickstart.md` 为准。

## Deepening Notes

- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT，交付结论以 `profile=default`（或 `soak`）且 `comparable=true && regressions==0` 为硬门（source: spec clarify AUTO）
- Decision: perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；结论存疑时必须复测（source: spec clarify AUTO）
- Decision: Gate baseline 以 `diagnostics=off` 为准；light/full 仅用于开销曲线与解释链路验证（source: spec clarify AUTO）
- Decision: Exec VM 未命中/缺能力允许显式降级但必须证据化（`reasonCode` 稳定枚举码），且在 047/Full Cutover Gate 覆盖场景中视为 FAIL（source: spec clarify AUTO）
- Decision: bitset 清零/复用默认先走最简单可证据化策略（如 `fill(0)`），仅当证据显示主导才引入更复杂优化（source: spec clarify AUTO）
- Decision: 半成品态（`split/join` 往返、`id→string→split`）必须守护测试兜底，出现即 Gate FAIL（source: spec clarify AUTO）
- Decision: Node 与 Browser 的 diff 必须分别 `comparable=true && regressions==0`，任一失败整体 FAIL（source: spec clarify AUTO）
- Decision: AOT-ready 最低口径：Exec IR 工件数据化/可序列化/可对比，包含 `execIrVersion` 与稳定 `execIrHash`（source: spec clarify AUTO）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、（实现阶段）`@logix/core-ng`  
**Storage**: N/A（证据落盘到 `specs/049-core-ng-linear-exec-vm/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（必须含 ≥1 headless browser evidence）  
**Project Type**: pnpm workspace  
**Performance Goals**: 以 perf matrix 的 P1 suites 为硬门（`profile=default`/`soak` + `comparable=true && regressions==0`），并争取在关键点位获得可证据化收益（推荐 `p95` 下降 ≥20% 或 heap/alloc delta 改善）  
**Constraints**: 统一最小 IR + 稳定锚点；事务窗口禁 IO；diagnostics=off 近零成本；禁止半成品态默认化；consumer 不直接依赖 core-ng  
**Scale/Scope**: 以 converge/txn 热路径为优先验证点；其它链路扩面由后续 specs 管理

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性只优化 Runtime 执行形态，不改变 Flow/DSL 表达。
- **Docs-first & SSoT**：复用 045/046/047/048/039 的裁决；draft topic 仅参考不裁决。
- **Contracts**：不新增业务对外 API；Exec VM 的可解释字段必须落到统一最小 IR/证据链路。
- **IR & anchors**：保持统一最小 IR + 稳定锚点；Exec IR 只作为实现工件与可选摘要字段，不引入并行协议。
- **Deterministic identity**：禁止随机/时间默认锚点；Exec VM 不得破坏对照验证的可对齐性。
- **Transaction boundary**：事务窗口内禁 IO/async；任何预编译发生在装配期。
- **Internal contracts & trial runs**：必须能在 TrialRun/对照 harness 下验证并导出证据；不得依赖全局单例。
- **Dual kernels (core + core-ng)**：
  - kernel support matrix（本 spec）：core=`supported`（不要求改实现）、core-ng=`trial-only → supported`（以证据达标裁决）。
  - consumer 不直接依赖 `@logix/core-ng`；切换发生在 runtime 装配阶段。
- **Performance budget**：必须 `$logix-perf-evidence`（Node + Browser）拦截回归。
- **Diagnosability & explainability**：off 近零成本；light/full 才输出 Exec VM 摘要字段（Slim、可序列化）。
- **Breaking changes**：纯优化不改语义；若出现行为变化必须另立 spec。
- **Public submodules**：实现阶段新增 `@logix/core-ng` 子模块需遵守 public submodules 规范。
- **Quality gates**：实现阶段至少 `pnpm typecheck/lint/test` + perf evidence。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks）

## Perf Evidence Plan（MUST）

- Baseline 语义：策略 A/B（同一份代码下 before=core-ng/execVm=off，after=core-ng/execVm=on；必要时补充代码前后对比）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集环境：允许在 dev 工作区采集（可为 git dirty），但 before/after 必须 `meta.matrixId/matrixHash` 一致且 env/config 不漂移；如出现 `stabilityWarning` 或结果存疑，必须复测（必要时 `profile=soak`）
- PASS 判据：Node 与 Browser 的 `pnpm perf diff` 都必须输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- Kernel 选择（防误判）：
  - NOTE：perf harness 默认 kernel 现在是 `core`；049 Gate 固化为“同 kernel（core-ng）下 execVm on/off 对照”（通过显式 env 选择 `core-ng`），避免把跨 kernel 差异混入 execVm 评估。
  - before（core-ng / execVm=off）采集时：
    - Browser：设置 `VITE_LOGIX_PERF_KERNEL_ID=core-ng`、`VITE_LOGIX_CORE_NG_EXEC_VM_MODE=off`
    - Node：设置 `LOGIX_PERF_KERNEL_ID=core-ng`、`LOGIX_CORE_NG_EXEC_VM_MODE=off`
  - after（core-ng / execVm=on）采集时：
    - Browser：设置 `VITE_LOGIX_PERF_KERNEL_ID=core-ng`、`VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on`
    - Node：设置 `LOGIX_PERF_KERNEL_ID=core-ng`、`LOGIX_CORE_NG_EXEC_VM_MODE=on`
  - before/after 必须由 `@logix/core-ng` 的 layer（例如 `coreNgKernelLayer` / `coreNgFullCutoverLayer`）装配；任何 “perf-only override（只替换单个 serviceId）” 的结果只能当线索，不得作为 049 的达标证据

**Collect (Browser / matrix P1 minimal)**:

- `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=off pnpm perf collect -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/before.browser.core-ng.execVm.off.matrixP1.<sha|dev>.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/after.browser.core-ng.execVm.on.matrixP1.<sha|dev>.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- `pnpm perf diff -- --before specs/049-core-ng-linear-exec-vm/perf/before.browser.core-ng.execVm.off.matrixP1...json --after specs/049-core-ng-linear-exec-vm/perf/after.browser.core-ng.execVm.on.matrixP1...json --out specs/049-core-ng-linear-exec-vm/perf/diff.browser.core-ng.execVm.off__on.matrixP1...json`

**Collect (Node / converge.txnCommit)**:

- `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=off pnpm perf bench:traitConverge:node -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/before.node.core-ng.execVm.off.converge.txnCommit.<sha|dev>.<envId>.default.json`
- `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/after.node.core-ng.execVm.on.converge.txnCommit.<sha|dev>.<envId>.default.json`
- `pnpm perf diff -- --before specs/049-core-ng-linear-exec-vm/perf/before.node.core-ng.execVm.off.converge.txnCommit...json --after specs/049-core-ng-linear-exec-vm/perf/after.node.core-ng.execVm.on.converge.txnCommit...json --out specs/049-core-ng-linear-exec-vm/perf/diff.node.core-ng.execVm.off__on.converge.txnCommit...json`

Failure Policy：若任一 diff 出现 `stabilityWarning/timeout/missing suite` 或 `comparable=false` → 禁止下硬结论，必须复测（profile 升级或缩小子集）并在 `specs/049-core-ng-linear-exec-vm/quickstart.md` 标注结论不确定性。

## Project Structure

### Documentation (this feature)

```text
specs/049-core-ng-linear-exec-vm/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core-ng/
└── src/*                        # Exec VM/Exec IR 的 core-ng 实现（通过 045 注入）

packages/logix-core/
└── src/Reflection.ts            # 对照验证与 gate 入口（复用 045）

packages/logix-react/
└── test/browser/perf-boundaries/*  # perf evidence suites（由 $logix-perf-evidence 采集）
```

**Structure Decision**:

- Exec VM 的实现主要落在 `@logix/core-ng`；`@logix/core` 只负责契约与证据出口，避免 consumer 依赖 core-ng。

## Deliverables by Phase

- **Phase 0（research）**：明确 Exec IR 的可解释摘要字段口径、降级策略（如需要）、perf matrix（至少 P1 + `profile=default`）与 Gate 判据。
- **Phase 1（design）**：产出 `data-model.md`、`contracts/*`、`quickstart.md`（如何验证 + 如何落盘证据）。
- **Phase 2（tasks）**：由 `$speckit tasks 049` 维护（本阶段不产出）。

### Gate Result (Post-Design)

- PASS（已将 perf matrix/diff 硬门与降级/档位要求写入 spec+plan；后续实现阶段以证据门禁裁决是否允许进入 047/048）
