# 2026-03-05 · G-1：整状态替换推导 dirty evidence（replace -> inferred patch roots）

本刀目标：尽可能消灭 `state_transaction::dirty_all_fallback` 的覆盖面，尤其是：

- `runtime.setState` / `$.state.update` / reducer 写回未提供 patchPaths 时，不再立刻把 txn 降级为 `dirtyAll`；
- 改为在 commit-time 对 `baseState -> finalState` 做 best-effort diff，推导出 **顶层 key**（以及 root list 的 **changedIndices hint**）级别的 dirty evidence，让 converge/validate/selector 有机会走增量路径。

> 注意：这是“热路径正确性优先 + 最小推导成本”的版本，只做顶层推导；深层嵌套 list 的 index hint 不在本刀覆盖范围内。

## 结论（可复现证据）

- 性能证据（quick comparable；本刀主要是覆盖面/语义修复，数值变化以 Diff 为准）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw70.g1-infer-replace-patches.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw71.g1-infer-replace-patches.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw70-to-ulw71.g1-infer-replace-patches.clean.json`
  - 结论：`budgetViolations=0`；Diff 摘要为 `regressions=4 / improvements=3`（quick 轮次存在轻微漂移；`meta.comparability.warnings=[git.dirty.after=true]`）。

## 改了什么（实现点）

1. `recordPatch('*')` 从“立刻 dirtyAll”改为“标记整状态替换 + commit-time 推导”
   - 文件：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - 变更：
     - `resolveAndRecordDirtyPathId('*', reason!=perf)`：不再设置 `dirtyAllReason`，改为 `state.inferReplaceEvidence=true`；
     - `reason==='perf'` 仍保留“强制 dirtyAll”的语义（perf harness contract）。

2. commit-time 推导 dirty evidence（best-effort）
   - 文件：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - 变更：
     - `buildCommittedTransaction` 在 `buildDirtyEvidenceSnapshot` 前调用 `inferReplaceEvidence(...)`；
     - 推导策略：
       - 仅对 **plain object** 状态生效（非 object / array / registry 缺失直接降级 `dirtyAll`）；
       - 仅推导 **顶层 key**：
         - key 在 Static IR registry（`pathStringToId`）中存在才会记录（避免“多余 key”导致错误降级）；
       - 对 root list（listPathSet 命中）额外推导 changedIndices（最多 64 个；长度变化/编码不明则标记 listRootTouched 并禁用增量 hint）。

3. `setState` 在 txn 内的早退分支也必须触发推导
   - 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
   - 变更：
     - `path==='*' && reason==='unknown'`（setState/state.update）早退分支在返回前设置 `current.inferReplaceEvidence = true`，避免“没有任何 patch 记录 → commit 仍 dirtyAll”。

4. reducer 无 patchPaths 的诊断从 “dirty_all_fallback” 改为 “dirty_evidence_inferred”
   - 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
   - 变更：
     - 仍保留 dev 下的提示（鼓励用 mutate 产出精确 patchPaths），但不再误报成 dirtyAll fallback。

## 为什么有用（机制解释）

- 旧行为：`path="*"` 会直接把 txn 变成 `dirtyAll`，导致 converge/validate/selector 一律走全量路径，这是 `form/list` 类场景的典型性能天花板来源之一。
- 新行为：`path="*"` 先“延迟裁决”，在 commit 时从 `baseState -> finalState` 推导出最粗粒度但可用的证据：
  - 顶层 key dirty roots 足够让大多数 selector invalidation / converge dirty-mode 变得可增量；
  - root list 的 changedIndices hint 能避免 list-scope 直接 O(n) 扫描（在能推导时）。

## 回归与门禁（本刀已跑）

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-react typecheck:test`
- perf：`pnpm perf collect:quick` + `pnpm perf diff`（见上方证据文件）

## 剩余问题 / 下一步（继续压榨）

- 推导目前只覆盖顶层 key + root list：
  - 对嵌套 list（例如 `form.items`）只能推导到 `form` 顶层 root，无法直接得到 `items` 的 index hint；这仍可能导致 list-scope 在深层场景降级。
- 推导目前通过 `ctx.recordPatch(...)` 写入证据：
  - 在 `instrumentation=full` 下会生成额外 patch records，可能放大 full 诊断成本；如要继续榨 full/off，需要考虑“只写 dirtyPathIds/list evidence，不写 patches 数组”的专用通道。

