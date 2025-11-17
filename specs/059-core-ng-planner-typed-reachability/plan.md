# Implementation Plan: 059 Planner Typed Reachability（TypedArray 极致化）

**Branch**: `059-core-ng-planner-typed-reachability` | **Date**: 2025-12-31 | **Spec**: `specs/059-core-ng-planner-typed-reachability/spec.md`  
**Input**: Feature specification from `specs/059-core-ng-planner-typed-reachability/spec.md`

## Summary

目标：把 Planner/Reachability（“dirty roots → 受影响 steps → plan”）的关键热路径进一步极致化为 **纯内存算法**（TypedArray + bitset + queue + scratch reuse），尽可能减少 Map/Set 与对象分配税，并为 054（Wasm Planner）提供可对照的 JS baseline。

本 spec 的“reachability”主要落在 StateTrait converge 的 plan 计算链路：它是 converge/txnCommit、watchers、以及 exec VM 命中路径的共同前置成本。

## Deepening Notes

- Decision: **先 JS 极致化**。只有当 Node+Browser 证据显示仍被 Map/Set/GC 主导、且 runtime 手段难以再降时，才允许启动 054（Wasm Planner）。
- Decision: 证据门禁：必须 `$logix-perf-evidence`（Node + ≥1 headless browser）before/after/diff，且 Node 与 Browser diff 都要 `comparable=true && regressions==0`。
- Decision: 允许在 dev 工作区采集（可 git dirty），但 before/after 必须 `matrixId/matrixHash` 一致、env/config 不漂移；如出现 `stabilityWarning` 或结果存疑，必须复测（必要时 `profile=soak`）。
- Decision: 事务窗口禁 IO；reachability/plan 计算必须纯同步，且默认路径不引入新的常驻分支/分配。

## Technical Context

- **语言/版本**：TypeScript（ESM）+ pnpm workspace
- **核心落点（当前实现）**：
  - plan 计算与 reachability 判定：`packages/logix-core/src/internal/state-trait/converge.ts`
    - `computePlanStepIds` / `shouldRunStepById` / `hasAnyDirtyPrefix` / `addPathPrefixes`
  - 静态/执行 IR：`packages/logix-core/src/internal/state-trait/converge-ir.ts`、`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
    - 已有 TypedArray tables：`prefixOffsetsByPathId`、`prefixFieldPathIdsByPathId`、`stepDepsOffsetsByStepId`、`stepDepsFieldPathIds`、`topoOrder*Int32`
  - bitset：`packages/logix-core/src/internal/state-trait/bitset.ts`（`DenseIdBitSet`）
  - dirtyPaths→rootIds：`packages/logix-core/src/internal/field-path.ts`（`dirtyPathsToRootIds`）
- **perf suites（复用现成跑道）**：
  - Browser P1：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`、`packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
  - Node converge：`pnpm perf bench:traitConverge:node`

## Constitution Check

- **Intent/Flow/Logix**：仅优化 runtime 内部算法，不改变 DSL/语义。
- **IR & anchors**：保持统一最小 IR（Static IR + Dynamic Trace）；不得引入第二套 reachability 真相源。
- **Deterministic identity**：不引入随机/时间默认锚点；任何 hash/version 必须稳定可对比。
- **Transaction boundary**：事务窗口内禁 IO/async；reachability 纯同步且可复测。
- **Dual kernels**：core=`supported`（不要求启用新形态）；core-ng=`supported`（作为主要收益目标）。
- **Performance & diagnosability**：必须 Node+Browser 证据门禁；diagnostics=off 近零成本（不因解释链路引入常驻开销）。

## Perf Evidence Plan（MUST）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（至少覆盖 `priority=P1`）
- Kernel：`core-ng`（并固定 execVmMode，避免把开关噪声混入结论）
  - Node：`LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on`
  - Browser：`VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on`
- PASS 判据：Node 与 Browser 的 diff 都必须 `comparable=true && regressions==0`（任一 FAIL 则整体 FAIL）。

**Collect (Node / converge.txnCommit)**:

- before：`LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- after：`LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/059-core-ng-planner-typed-reachability/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --after specs/059-core-ng-planner-typed-reachability/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --out specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.<envId>.default.json`

**Collect (Browser / matrix P1 minimal)**:

- before：`VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- after：`VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- diff：`pnpm perf diff -- --before specs/059-core-ng-planner-typed-reachability/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --after specs/059-core-ng-planner-typed-reachability/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --out specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.<envId>.default.json`

Failure Policy：若出现 `stabilityWarning/timeout/missing suite` 或 `comparable=false` → 禁止下硬结论，必须复测（profile 升级或缩小子集）。

## Project Structure

### Documentation (this feature)

```text
specs/059-core-ng-planner-typed-reachability/
├── spec.md
├── plan.md
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/src/internal/state-trait/
├── converge.ts              # reachability + plan compute
├── converge-ir.ts           # Static IR（generation）
├── converge-exec-ir.ts      # Exec IR tables（TypedArray 化）
├── bitset.ts                # DenseIdBitSet 等
└── plan-cache.ts            # plan cache（避免低命中率负优化）

packages/logix-core/src/internal/field-path.ts  # dirtyPaths→rootIds

packages/logix-react/test/browser/              # browser perf suites（P1）
```

## Deliverables by Phase

- **Phase 0（research）**：明确 reachability 试点范围（plan compute / dirtyRoots→steps），并用现有 perf evidence 定位“Map/Set/GC 是否主导”。
- **Phase 1（design）**：固化 Typed reachability 的数据结构（adjacency/queue/visited bitset）与 scratch reuse 策略，并明确 fallback/降级口径（不得把负优化默认化）。
- **Phase 2（tasks）**：见 `specs/059-core-ng-planner-typed-reachability/tasks.md`。

### Gate Result (Post-Implementation)

- PASS（Node + Browser diff 均 `comparable=true && regressions==0`）
  - Node: `specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-072950.default.json`
  - Browser: `specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-072950.default.json`
