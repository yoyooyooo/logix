# Implementation Plan: 051 core-ng 事务零分配（txn zero-alloc）

**Branch**: `051-core-ng-txn-zero-alloc` | **Date**: 2025-12-29 | **Spec**: `specs/051-core-ng-txn-zero-alloc/spec.md`  
**Input**: Feature specification from `specs/051-core-ng-txn-zero-alloc/spec.md`

## Summary

目标：把 txn/patch/dirtyset 的“分配行为与分支形态”收口到极致：

- `instrumentation=light`：调用点 argument-based recording（不创建 patch 对象、禁 rest 参数、分支搬到 loop 外）
- txn 内 dirty 信息维护不引入字符串往返与额外分配（与 050 的 id-first 表示对齐）
- 用 Node `converge.txnCommit` + Browser `converge.txnCommit`（converge-only）的 PerfReport/PerfDiff 证据门禁拦截回归

本 plan 只固化硬门与落点；实现/证据进度以 `specs/051-core-ng-txn-zero-alloc/tasks.md` 与 `specs/051-core-ng-txn-zero-alloc/quickstart.md` 为准。

## Deepening Notes

- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT，交付结论以 `profile=default`（或 `soak`）且 `meta.comparability.comparable=true && summary.regressions==0` 为硬门（source: spec clarify AUTO）
- Decision: perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；结论存疑时必须复测（source: spec clarify AUTO）
- Decision: 本 spec 只负责“零分配/分支形态”收口；id 语义/映射协议由 050 裁决（source: 046 P1 边界）
- Decision: Gate baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`（source: spec clarify AUTO）
- Decision: P1 Gate 覆盖场景触发 `dirtyAll=true` 降级视为 FAIL（source: spec clarify AUTO）
- Decision: 调用点永远 argument-based；full 的对象 materialize 只能在 txn 聚合器边界完成（source: spec clarify AUTO）
- Decision: P1 Gate 以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归（source: spec clarify AUTO）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、（实现阶段）`@logix/core-ng`  
**Storage**: N/A（证据落盘到 `specs/051-core-ng-txn-zero-alloc/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（必须含 ≥1 headless browser evidence）  
**Project Type**: pnpm workspace  
**Performance Goals**: Node `converge.txnCommit` + Browser `converge.txnCommit`（converge-only）diff 无回归，并争取在关键场景拿到可证据化收益（alloc/heap delta 优先）  
**Constraints**: 事务窗口禁 IO；consumer 不直接依赖 core-ng；禁止半成品态默认化；Gate baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`  
**Scale/Scope**: txn/dirtyset/patch recording；不扩展语义/不引入新对外概念

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **性能与可诊断性优先**：本 spec 以“分配行为收口 + 证据门禁”作为交付硬门；不通过即不切默认。
- **统一最小 IR + 稳定锚点**：不改变锚点；仅优化 txn 内部数据结构与记录方式。
- **Transaction boundary**：事务窗口内禁 IO/async；任何预处理必须在窗口外或装配期完成。
- **Dual kernels（core + core-ng）**：consumer 只依赖 core；core-ng 仅作为可注入实现与试跑跑道。
- **Breaking changes**：不改变对外语义；若需要调整对外事务摘要结构，必须与 050/045 的契约一起证据化并提供迁移说明。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks）

## Perf Evidence Plan（MUST）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Hard conclusion：`profile=default`（`quick` 仅线索；必要时用 `soak` 复核）
- Baseline config：固定 `diagnostics=off + stateTransaction.instrumentation=light`（若现有 bench/suites 未固定，先补齐 harness 再采集）
- 采集环境：允许在 dev 工作区采集（可为 git dirty），但 before/after 必须 `meta.matrixId/matrixHash` 一致且 env/config 不漂移；如出现 `stabilityWarning` 或结果存疑，必须复测（必要时 `profile=soak`）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

**Collect (Node / converge.txnCommit)**:

- `pnpm perf bench:traitConverge:node -- --profile default --out specs/051-core-ng-txn-zero-alloc/perf/before.node.converge.txnCommit.<sha>.<envId>.default.json`
- `pnpm perf bench:traitConverge:node -- --profile default --out specs/051-core-ng-txn-zero-alloc/perf/after.node.converge.txnCommit.<sha|dev>.<envId>.default.json`
- `pnpm perf diff -- --before specs/051-core-ng-txn-zero-alloc/perf/before.node.converge.txnCommit...json --after specs/051-core-ng-txn-zero-alloc/perf/after.node.converge.txnCommit...json --out specs/051-core-ng-txn-zero-alloc/perf/diff.node.converge.txnCommit.before...__after....json`

**Collect (Browser / converge-only)**:

- `pnpm perf collect -- --profile default --out specs/051-core-ng-txn-zero-alloc/perf/before.browser.converge.txnCommit.<sha>.<envId>.default.json --files test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm perf collect -- --profile default --out specs/051-core-ng-txn-zero-alloc/perf/after.browser.converge.txnCommit.<sha|dev>.<envId>.default.json --files test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm perf diff -- --before specs/051-core-ng-txn-zero-alloc/perf/before.browser.converge.txnCommit...json --after specs/051-core-ng-txn-zero-alloc/perf/after.browser.converge.txnCommit...json --out specs/051-core-ng-txn-zero-alloc/perf/diff.browser.converge.txnCommit.before...__after....json`

Failure Policy：任一 diff `meta.comparability.comparable=false` 或 `summary.regressions>0` → Gate FAIL；禁止下硬结论，必须复测并定位分配源头。

## Project Structure

```text
specs/051-core-ng-txn-zero-alloc/
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
├── src/internal/runtime/core/StateTransaction.ts
├── src/internal/runtime/core/mutativePatches.ts
├── src/internal/runtime/core/ModuleRuntime.dispatch.ts
└── src/internal/field-path.ts

packages/logix-core-ng/
└── src/*  # （如需要）以 045 的 Runtime Services 覆写 txn/transaction 相关实现
```

## Design（关键机制）

### 1) 事务内记录 API：调用点零对象分配

- `instrumentation=light`：调用点只能传参；txn 聚合器内部不得 materialize patch 对象。
- 禁止 `...args`；分支搬到 loop 外（与 039 的 guardrails 对齐）。

### 2) dirty 信息：避免字符串往返与重复归一化

- txn 内维护 id-first 的 dirty roots（优先复用 050 的 registry/表示），避免在 commit 内 `join('.')` 生成字符串。
- 动态/异常路径必须显式降级（`dirtyAll=true + reason`），禁止隐式退化为字符串解析或全量扫描。
- P1 Gate 覆盖场景（Node `converge.txnCommit` + Browser `converge.txnCommit`）触发 `dirtyAll=true` 视为 FAIL（必须先修复或扩大 registry 容量并证据化）。

### 3) 容器与 buffer 复用

- 避免每次 beginTransaction `new Set()` / `new Array()`；优先复用并 `clear()`。
- 只有当证据显示 `clear()` 成本主导时才引入更复杂策略（例如 generation stamping），并用 microbench 证明收益。

## Deliverables by Phase

- **Phase 0（research）**：明确“零分配”的可验收口径（哪些分配允许/禁止），以及 microbench 与 suites 覆盖范围。
- **Phase 1（design）**：产出 contracts + quickstart（怎么跑证据、怎么判断 PASS/FAIL）。
- **Phase 2（tasks）**：由 `tasks.md` 维护（本阶段不产出）。
