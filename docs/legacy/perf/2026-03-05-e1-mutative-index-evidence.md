# 2026-03-05 · E-1：mutative patchPaths 的索引证据（array path -> listIndexEvidence）

本刀目标：继续压榨 list/form 的增量化覆盖率，让通过 `mutative` 生成的 patchPaths（array path）也能喂给 transaction 的 `listIndexEvidence`，从而让 `Ref.list(...)` 在更多真实写法下自动拿到 `changedIndices`，减少 “无证据 → full” 的降级。

## 结论（可复现证据）

- 行为正确性（新增回归）：
  - `packages/logix-core/test/internal/StateTrait/StateTrait.RefList.ChangedIndicesFromTxnEvidence.test.ts`
  - 新增用例：`recordPatch(['items','1','warehouseId'], ...)` 也能驱动 list-scope validate 只标记 index=1。
- 性能证据（quick comparable；覆盖 3 个 perf-boundaries 主门）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw66.e1-mutative-index-evidence.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw67.e1-mutative-index-evidence.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw66-to-ulw67.e1-mutative-index-evidence.clean.json`
  - `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` 的 budgets 均无 violation（firstFailLevel=null）。

注：当前 `form.listScopeCheck` workload 自己会显式 `recordStatePatch("items.<idx>.warehouseId")`，因此本刀对该 suite 的数值变化主要表现为噪声；本刀的真实价值是为后续“移除手工 patch 记录、完全依赖 mutative patches”打地基。

## 改了什么（实现点）

1. `mutative` patchPaths 保留索引段
   - `packages/logix-core/src/internal/runtime/core/mutativePatches.ts`
   - 将 patch path 里的数组索引（number）转换为数字字符串（例如 `3 -> "3"`）并保留在 patchPaths 证据中（不再直接丢弃）。

2. `StateTransaction.recordPatch` 支持 array path 的 listIndexEvidence
   - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - 新增 `recordListIndexEvidenceFromPathArray(...)`：
     - 扫描 segments，识别数字段作为 index；
     - 生成与 string path 同口径的 `listInstanceKey = "<listPath>@@<parentIndexPathKey>"`；
     - 写入 `listIndexEvidence`（changedIndices），并维护 `itemTouched/rootTouched`。
   - field-level dirty 仍保持不变：`normalizeFieldPath` 过滤掉数字段（索引），只产出稳定的 FieldPathId 锚点（id-first）。

3. 回归补齐
   - `packages/logix-core/test/internal/StateTrait/StateTrait.RefList.ChangedIndicesFromTxnEvidence.test.ts`

## 为什么有用（机制解释）

- 旧行为：
  - `mutative` 产生的 patch path 是 array，其中索引往往是 number；
  - runtime 在 `mutativePatches` 层会丢掉索引段；
  - transaction 层只对 string path 解析 list index evidence；
  - 结果：很多 `$.state.mutate(...)` / reducer mutate 的真实写法无法自动得到 `changedIndices`，list validate 只能降级 full。
- 新行为：
  - 索引段被保留为数字字符串，transaction 能直接从 array path 解析 index evidence；
  - list-scope validate 可以在更多写法下走增量（只触发 touched indices），减少规则执行链路的全量成本。

## 下一步（若继续压榨）

- 让 `form.listScopeCheck` 的 workload 去掉手工 `recordStatePatch(...)`，改为通过 `$.state.mutate` 触发，并用 perf-boundary 证明“完全依赖 mutative patches”仍能稳定拿到 `changedIndices` 且更快。
