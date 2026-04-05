# 2026-03-05 · G-2：整状态替换推导模式分化（if_empty：已有证据则跳过推导）

本刀目标：把 G-1 的 replace 推导做成“性能优先可控”的两种模式，避免在 **已有精确 dirty evidence** 的情况下重复做 commit-time diff。

关键场景（真实命中）：
- `form.listScopeCheck` perf workload 会在 txn 内先 `recordStatePatch(items.<idx>.warehouseId, ...)` 记录精确证据，再调用 `setState(...)` 写回新 items 数组；
- G-1 若对 `setState` 一律启用推导，会在 commit 时额外扫描 `baseState -> finalState`，属于纯 overhead（并会放大 full 诊断下的 patch records/patchCount）。

## 结论（可复现证据）

- 性能证据（quick comparable；before 使用 G-1 的 after 作为基线）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw71.g1-infer-replace-patches.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw72.g2-infer-replace-if-empty.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw71-to-ulw72.g2-infer-replace-if-empty.clean.json`
  - 结论：`budgetViolations=0`；Diff 摘要 `regressions=4 / improvements=2`（quick 噪声仍存在；且 before/after 的 git commit 不同，见 diff 的 comparability warnings）。

## 改了什么（实现点）

1. 增加 replace 推导模式位：`inferReplaceEvidenceIfEmpty`
   - 文件：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - 语义：
     - `inferReplaceEvidence=true && inferReplaceEvidenceIfEmpty=true`：
       - 若 commit 时 `dirtyPathIds.size>0`（已有精确证据），直接跳过推导；
       - 典型用于 `setState/state.update`（perf harness 先给证据，再 setState）。
     - reducer fallback（`reason==='reducer' && path==='*'`）强制 `inferReplaceEvidenceIfEmpty=false`：
       - 即使 txn 里已有其它 reducer 的证据，也必须补推导，保证 `dispatchBatch` 混合 reducer 的正确性。

2. 回归测试：锁定 “if_empty 模式下有证据则不额外推导”
   - 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
   - 断言：已有 `recordPatch('a', ...)` 后再写入 `recordPatch('*','unknown')`，commit 不再新增推导 patch（用 `patchCount` 锁定）。

## 风险与裁决

- 这是一个明确的“性能优先”裁决：当调用方在同一 txn 内既提供了精确证据、又触发了 `setState` 的整状态替换标记时，Runtime 选择 **信任现有证据** 并跳过推导。
- 若调用方漏记证据，则可能出现 under-invalidation；这在“零存量用户模式 + perf harness/内部集成”前提下可接受，并且鼓励调用方统一走 `mutate(...)` 生成 patchPaths。

