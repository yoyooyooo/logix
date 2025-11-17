# Implementation Plan: 056 Schema Layout Accessors（offset/typed view）

**Branch**: `056-core-ng-schema-layout-accessors` | **Date**: 2025-12-31 | **Spec**: `specs/056-core-ng-schema-layout-accessors/spec.md`  
**Input**: Feature specification from `specs/056-core-ng-schema-layout-accessors/spec.md`

## Summary

目标：在 FieldPathIdRegistry（schema/静态 fieldPaths）上补齐 **stringPath → pathId 直达映射**，并把 dirtyPaths 的归一化/去冗余（prefix canonicalize）下沉到 **id 级算法**：减少 txn 内 `split('.')`/临时数组分配与重复 trie walk，并为后续更完整的 layout/accessor（offset/typed view）路线提供可对照的 JS baseline。

本 spec 优先以 StateTrait converge 的 dirtyPaths→rootIds 链路作为试点：它同时是 Node 与 Browser 的 P1 跑道共同覆盖点，且直接命中 txn commit 热路径。

## Deepening Notes

- Decision: **统一最小 IR**：accessor 表必须有可序列化的 Static IR 描述（version/hash + minimal summary），且能进入同一套 Trace/Devtools/Perf evidence。
- Decision: **默认路径不绑工具链**：layout/accessor 表必须可在运行时 JIT-style 构造（装配期/构造期）；工具链（053）只作为可选加速器。
- Decision: **事务窗口禁 IO**：生成/初始化在装配期完成；txn window 只做纯访问与纯计算。
- Decision: 证据门禁：必须 `$logix-perf-evidence`（Node + ≥1 headless browser）before/after/diff，且 `comparable=true && regressions==0`。

## Technical Context

- **核心地基**：
  - FieldPath/FieldPathIdRegistry：`packages/logix-core/src/internal/field-path.ts`
  - Converge Static/Exec IR：`packages/logix-core/src/internal/state-trait/converge-ir.ts`、`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
  - converge 热路径（plan + get/set）：`packages/logix-core/src/internal/state-trait/converge.ts`
  - Exec VM 开关：`packages/logix-core/src/internal/state-trait/exec-vm-mode.ts`（core-ng 装配期注入）
- **本次交付（JS-first）**：
  - `FieldPathIdRegistry.pathStringToId`：常见 string path 的直达映射（命中时跳过 normalize/split）
  - `dirtyPathsToRootIds`：以 `pathId` 为输入进行 prefix canonicalize（避免中间 FieldPath 分配）

## Constitution Check

- **Intent/Flow/Logix**：仅优化 runtime 内部访问形态，不改变业务语义。
- **IR & anchors**：accessor 表进入统一最小 IR；稳定 hash/version 可对比。
- **Transaction boundary**：txn 内纯同步；装配期完成生成。
- **Dual kernels**：
  - core=`supported`（不要求启用新形态；默认 execVmMode=off）
  - core-ng=`supported`（作为主要收益目标；依赖 049 的 Exec VM 基座）
- **Performance & diagnosability**：Node+Browser 证据门禁；diagnostics=off 近零成本（不因 explainability 引入常驻开销）。

## Perf Evidence Plan（MUST）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（至少覆盖 `priority=P1`）
- Kernel：`core-ng` + 固定 execVmMode（建议 `on`），避免把开关噪声混入结论
  - Node：`LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on`
  - Browser：`VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on`
- PASS 判据：Node 与 Browser diff 都必须 `comparable=true && regressions==0`

## Project Structure

### Documentation (this feature)

```text
specs/056-core-ng-schema-layout-accessors/
├── spec.md
├── plan.md
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/src/internal/state-trait/
├── converge.ts              # access hot path（get/set/plan）
├── converge-exec-ir.ts      # generation 级 tables（可扩展 accessor tables）
└── exec-vm-mode.ts          # core-ng 注入开关

packages/logix-core/src/internal/field-path.ts  # FieldPathIdRegistry/normalize

packages/logix-react/test/browser/              # browser perf suites（P1）
```

## Deliverables by Phase

- **Phase 0（research）**：选定试点与指标（至少 1 条 converge 热路径接入），并明确“layout/accessor 表”的最小可序列化摘要字段（off 近零成本）。
- **Phase 1（design）**：固化 accessor 表 schema（version/hash）与缓存归属（generation vs instance）及清理策略；明确 fallback/降级口径（不可解释即 FAIL）。
- **Phase 2（tasks）**：见 `specs/056-core-ng-schema-layout-accessors/tasks.md`。

### Gate Result (Post-Implementation)

- PASS（Node + Browser diff 均 `comparable=true && regressions==0`）
  - Node: `specs/056-core-ng-schema-layout-accessors/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-075738.default.json`
  - Browser: `specs/056-core-ng-schema-layout-accessors/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-075738.default.json`
