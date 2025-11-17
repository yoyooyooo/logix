# Implementation Plan: 052 diagnostics=off 近零成本 Gate（回归防线）

**Branch**: `052-core-ng-diagnostics-off-gate` | **Date**: 2025-12-29 | **Spec**: `specs/052-core-ng-diagnostics-off-gate/spec.md`  
**Input**: Feature specification from `specs/052-core-ng-diagnostics-off-gate/spec.md`

## Summary

目标：把 diagnostics=off 的“近零成本”从约定变成可验收 Gate：

- off 下不分配 steps/hotspots，不拼接 label/traceKey，不做 per-step 计时
- off 下不 materialize id→readable mapping（mapping 仅 light/full 且按 generation 摘要导出）
- 以测试 + Browser `diagnostics.overhead.e2e` + Node bench 的证据门禁拦截回归

本 plan 阶段只交付设计产物与任务拆分；不在本回合实现代码。

更新：实现与证据已完成；最新 Gate 结论见 `specs/052-core-ng-diagnostics-off-gate/quickstart.md`。

## Deepening Notes

- Decision: Gate baseline 以 `diagnostics=off` 为准；light/full 仅用于解释链路与开销曲线（source: 039/044）
- Decision: 本 spec 作为“全局闸门”：覆盖 049/050/051 的 off 行为（source: 046 P1 边界）
- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT，交付结论以 `profile=default`（或 `soak`）且 `meta.comparability.comparable=true && summary.regressions==0` 为硬门（source: spec clarify AUTO）
- Decision: before/after 必须隔离采集（独立 worktree/目录），混杂改动结果仅作线索（source: spec clarify AUTO）
- Decision: Node+Browser 都必须 Gate PASS，任一失败整体 FAIL（source: spec clarify AUTO）
- Decision: P1 Gate 以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归（source: spec clarify AUTO）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、（实现阶段）`@logix/core-ng`  
**Storage**: N/A（证据落盘到 `specs/052-core-ng-diagnostics-off-gate/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（必须含 ≥1 headless browser evidence）  
**Project Type**: pnpm workspace  
**Performance Goals**: `diagnostics.overhead.e2e`（Browser）+ 关键 Node bench diff 无回归  
**Constraints**: off 档位近零成本；统一最小 IR + 稳定锚点；事务窗口禁 IO；consumer 不直接依赖 core-ng

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **性能与可诊断性优先**：off 档位近零成本是硬约束；任何回归必须被证据或测试拦截。
- **可解释但可裁剪**：解释字段只在 light/full 输出；off 只保留最小锚点，不输出自由文本 reason。
- **不引入并行真相源**：统一最小 IR 与 anchors 不变；mapping 仅作为可选摘要且可序列化。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks）

## Perf Evidence Plan（MUST）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Hard conclusion：`profile=default`（或 `soak`；`quick` 仅线索不可下硬结论）
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

**Collect (Node / converge.txnCommit)**:

- `pnpm perf bench:traitConverge:node -- --profile default --out specs/052-core-ng-diagnostics-off-gate/perf/before.node.converge.txnCommit.<sha>.<envId>.default.json`
- `pnpm perf bench:traitConverge:node -- --profile default --out specs/052-core-ng-diagnostics-off-gate/perf/after.node.converge.txnCommit.<sha|worktree>.<envId>.default.json`
- `pnpm perf diff -- --before specs/052-core-ng-diagnostics-off-gate/perf/before.node.converge.txnCommit...json --after specs/052-core-ng-diagnostics-off-gate/perf/after.node.converge.txnCommit...json --out specs/052-core-ng-diagnostics-off-gate/perf/diff.node.converge.txnCommit.before...__after....json`

**Collect (Browser / diagnostics overhead)**:

- `pnpm perf collect -- --profile default --out specs/052-core-ng-diagnostics-off-gate/perf/before.browser.diagnostics-overhead.<sha>.<envId>.default.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- `pnpm perf collect -- --profile default --out specs/052-core-ng-diagnostics-off-gate/perf/after.browser.diagnostics-overhead.<sha|worktree>.<envId>.default.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- `pnpm perf diff -- --before specs/052-core-ng-diagnostics-off-gate/perf/before.browser.diagnostics-overhead...json --after specs/052-core-ng-diagnostics-off-gate/perf/after.browser.diagnostics-overhead...json --out specs/052-core-ng-diagnostics-off-gate/perf/diff.browser.diagnostics-overhead.before...__after....json`

Failure Policy：任一 diff `meta.comparability.comparable=false` 或 `summary.regressions>0` → Gate FAIL；禁止下硬结论，必须复测并定位回归来源（strings/arrays/timing/mapping）。

## Project Structure

```text
specs/052-core-ng-diagnostics-off-gate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
├── tasks.md
└── perf/
```

## Source Code (implementation targets)

```text
packages/logix-core/
├── src/Debug.ts
├── src/internal/state-trait/converge.ts
└── src/internal/runtime/core/DebugSink.ts

packages/logix-core-ng/
└── src/ExecVmEvidence.ts
```

## Design（关键机制）

### 1) off 快路径：早退 + 分支搬迁

- off 进入函数即早退；任何“需要数组/字符串/计时”的逻辑只在 light/full 分支内。

### 2) mapping 的生成与导出：只在 light/full 且按 generation 摘要

- off 不生成 mapping；light/full 也不在 txn hot loop 内生成，必须在边界一次性 materialize。

### 3) 守护与回归防线

- 以 `diagnostics.overhead.e2e` + 关键测试覆盖“禁止项”；
- 必要时增加 checkpoint（quick）用于预警（不替代 Gate）。

## Deliverables by Phase

- **Phase 0（research）**：枚举 off 禁止项清单与覆盖面（049/050/051）。
- **Phase 1（design）**：固化 contracts + quickstart（怎么跑证据、怎么判断 PASS/FAIL）。
- **Phase 2（tasks）**：由 `tasks.md` 维护（本阶段不产出）。
