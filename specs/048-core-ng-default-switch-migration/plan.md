# Implementation Plan: 048 切默认到 core-ng（迁移与回退口径）

**Branch**: `048-core-ng-default-switch-migration` | **Date**: 2025-12-27 | **Spec**: `specs/048-core-ng-default-switch-migration/spec.md`  
**Input**: Feature specification from `specs/048-core-ng-default-switch-migration/spec.md`

> NOTE（2025-12-31）：本 plan 对应“默认切到 `core-ng`”的历史实现；当前仓库已选择 **单内核默认**（默认 `core`，`core-ng` 仅对照/试跑显式启用），因此本文不再作为当前行为裁决。以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准。

## Summary

目标：在 047 Full Cutover Gate 达标的前提下，把默认内核从 core 切换为 core-ng，并固化：

- 默认选择规则（未指定 kernel → core-ng）
- 显式回退口径（指定 `kernelId="core"`）
- 禁止隐式 fallback（默认路径必须 full cutover）
- Node + Browser 的证据落盘（before/after/diff）

## Deepening Notes

- Decision: 仅在 047 Gate=PASS 后切默认 (source: spec clarify AUTO/ASSUMPTION)
- Decision: 默认路径请求 `core-ng` 缺 bindings 必须 FAIL（不得 fallback；装配期允许 `txnSeq=0`） (source: spec clarify AUTO/ASSUMPTION)
- Decision: Browser-only 回归仍视为 FAIL（任一 required suite 回归都阻断） (source: spec clarify AUTO/ASSUMPTION)
- Decision: 显式选择 kernel 但实现/绑定不匹配必须 FAIL 且可解释（禁止隐式 fallback） (source: spec clarify AUTO/ASSUMPTION)
- Decision: 失败最小证据锚点固定为 `kernelId + missingServiceIds + moduleId/instanceId/txnSeq` (source: spec clarify AUTO/ASSUMPTION)

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`（默认切换与证据导出）；`@logixjs/core-ng` 仅用于 tests/bench/trial-run 对照（consumer 禁止直接依赖）  
**Storage**: N/A（证据落盘到 `specs/048-*/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers  
**Project Type**: pnpm workspace  
**Performance Goals**: 在 matrix.json 的 `priority=P1` suites 上，切默认前/后不得出现 budget regression（`pnpm perf diff`：`comparability.comparable=true` 且 `summary.regressions==0`）  
**Constraints**: 上层只依赖 `@logixjs/core`；统一最小 IR + 稳定锚点；事务窗口禁 IO；`diagnostics=off` 近零成本；禁止隐式 fallback  
**Scale/Scope**: 本特性以“默认选择切换 + 迁移说明 + 证据落盘”为交付，不引入长期兼容层

## Kernel support matrix

- `core`: supported（显式回退/对照）
- `core-ng`: supported（默认路径）

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=切默认前默认仍为 core，after=切默认后默认变为 core-ng；两侧都必须走“未显式指定 kernelId”的默认路径）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- envId：按 `$logix-perf-evidence` 约定写进文件名（建议 `darwin-arm64.m2max.chromium-131.headless` / `darwin-arm64.m2max.node`）
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索不得用于宣称切默认完成
- collect（browser, before）：`pnpm perf collect -- --profile default --out specs/048-core-ng-default-switch-migration/perf/before.<beforeSha>.<envId>.default.browser.json`
- collect（browser, after）：`pnpm perf collect -- --profile default --out specs/048-core-ng-default-switch-migration/perf/after.<afterSha|worktree>.<envId>.default.browser.json`
- collect（node, before）：`pnpm perf bench:traitConverge:node -- --profile default --out specs/048-core-ng-default-switch-migration/perf/before.<beforeSha>.<envId>.default.node.json`
- collect（node, after）：`pnpm perf bench:traitConverge:node -- --profile default --out specs/048-core-ng-default-switch-migration/perf/after.<afterSha|worktree>.<envId>.default.node.json`
- diff（browser）：`pnpm perf diff -- --before specs/048-core-ng-default-switch-migration/perf/before...browser.json --after specs/048-core-ng-default-switch-migration/perf/after...browser.json --out specs/048-core-ng-default-switch-migration/perf/diff.browser.<before>__<after>.json`
- diff（node）：`pnpm perf diff -- --before specs/048-core-ng-default-switch-migration/perf/before...node.json --after specs/048-core-ng-default-switch-migration/perf/after...node.json --out specs/048-core-ng-default-switch-migration/perf/diff.node.<before>__<after>.json`
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- Failure Policy：若 diff 出现 `stabilityWarning/timeout/missing suite` → 结论标注不确定并复测（profile 升级或缩小子集）
- Kernel 选择（防误判）：切默认的 Gate 证据必须基于“默认路径”，因此采集 before/after 时 **不得** 设置 `LOGIX_PERF_KERNEL_ID`/`VITE_LOGIX_PERF_KERNEL_ID` 之类的显式选择变量；显式回退（`kernelId="core"`）的证据属于迁移/排障验证，不计入默认路径 perf gate。
- NFR-002（可序列化 & off 成本）验证：复用 contracts 047 的可序列化用例，并补齐 048 默认/回退路径的 evidence JSON 可序列化测试（见 `specs/048-core-ng-default-switch-migration/tasks.md`）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性仅改变 runtime 装配阶段的默认选择（Kernel），不改变 DSL/Flow/业务语义。
- **Docs-first & SSoT**：依赖 047（M3 gate）与 045（Kernel Contract）；切默认是治理动作，必须先在 specs 固化迁移说明与证据门槛。
- **Contracts**：不新增对外业务 API；只在 `@logixjs/core` 的 runtime 创建入口固化默认选择策略与显式 override。
- **IR & anchors**：必须保持统一最小 IR + 稳定锚点；切默认前后证据可对比。
- **Deterministic identity**：不得引入随机/时间默认锚点；切默认不影响 identity 口径。
- **Transaction boundary**：不得引入事务内 IO/async；默认选择在装配期完成。
- **Internal contracts & trial runs**：回退必须可证据化；不得依赖进程级全局单例才能导出证据。
- **Dual kernels (core + core-ng)**：consumer 不依赖 core-ng；默认路径 core-ng full cutover；回退只能显式选择 core，禁止隐式 fallback。
- **Performance budget**：强制 `$logix-perf-evidence`（Node + Browser）before/after/diff；证据采集必须隔离（独立 `git worktree/单独目录`），否则不得用于宣称切默认完成；预算回归阻断切默认。
- **Diagnosability & explainability**：off 近零成本；light/full 下能解释默认选择与回退来源。
- **Breaking changes**：切默认属于 breaking change（默认行为变化）；必须提供迁移说明与回退步骤（但不保留兼容层）。
- **Public submodules**：如新增导出点，遵守 public submodules 规则。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`，并追加 perf evidence。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks；实现阶段按 tasks 执行并复核）

## Project Structure

### Documentation (this feature)

```text
specs/048-core-ng-default-switch-migration/
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
packages/logix-core/
├── src/Runtime.ts
├── src/Kernel.ts
└── src/internal/runtime/core/
    ├── ModuleRuntime.ts
    ├── RuntimeServices.impls.coreNg.ts
    └── FullCutoverGate.ts
```

**Structure Decision**:

- 默认选择策略必须固化在 `@logixjs/core` 的装配入口（避免 consumer 依赖 `@logixjs/core-ng`）。
- 回退只作为显式 override（排障/对照），不得成为隐式 fallback。
- `packages/logix-core-ng/*` 的真实实现达标属于 047 Gate；048 不以“改 core-ng 包”为交付前提。

## Deliverables by Phase

- **Phase 0（research）**：明确默认选择落点与回退口径（配置来源/可解释字段），以及切默认的证据/预算矩阵。
- **Phase 1（design）**：产出 `data-model.md`、`contracts/*`、`quickstart.md`（迁移 playbook + 回退步骤 + 证据落点）。
- **Phase 2（tasks）**：产出可执行 `tasks.md`（实现默认切换、测试、证据采集与 diff、回写 046）。
