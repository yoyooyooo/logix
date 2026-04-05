# 2026-03-05 · F-1：DevtoolsHub 事件窗口 O(1) ring buffer（去 splice trimming 抖动）

本刀目标：把 `DevtoolsHub` 的事件窗口从 `Array.push + splice(trim)` 改成真正的 O(1) ring buffer，消灭高频 `state:update` 下的线性 trimming 成本与 GC 抖动（尤其影响 `diagnosticsLevel=full` 的相对预算）。

## 结论（可复现证据）

- 性能证据（quick comparable；覆盖 3 个 perf-boundaries 主门）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw68.f1-devtools-ring-buffer.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw69.f1-devtools-ring-buffer.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw68-to-ulw69.f1-devtools-ring-buffer.clean.json`
  - 结论：无 budgets violation（`firstFailLevel=null`），Diff `regressions=0 / improvements=0`（本刀主要是结构性降抖，单轮 quick 数值变化不显著）。

## 改了什么（实现点）

1. 用 O(1) ring storage 替代 `push+splice`
   - 文件：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
   - 变更：
     - `RuntimeDevtoolsBucket.ringBuffer: RuntimeDebugEventRef[]` -> `ring: EventRing`（固定容量、覆盖写入）
     - 全局窗口同样迁移为 `globalRing: EventRing`
     - 追加事件变成纯 O(1)：写入 ring slot + 移动 `start`

2. “有序 view”延后到消费侧（snapshot read/export）
   - `getDevtoolsSnapshot()` / `getDevtoolsSnapshotByRuntimeLabel()` / `exportDevtoolsEvidencePackage()` 在读取时调用 `getEventRingView(...)` 重建有序数组视图；
   - 日常写入路径不再做任何 trimming / shift / splice。

3. bufferSize resize 语义保持一致
   - `configureDevtoolsHub({ bufferSize })` 在发出 `trace:devtools:ring-trim-policy` 事件前先 resize rings，避免扩容时仍按旧容量覆盖写入（对齐既有测试直觉）。

## 为什么有用（机制解释）

- 旧实现即使做了 “burst trim” 也仍然会周期性触发 `splice(0, excess)`：
  - 属于 O(window) 的线性移动，会把稳定的 per-txn 开销变成“偶发尖刺”，直接抬高 p95 并放大 `full/off` 的相对预算。
- 新实现把写入路径硬保证为 O(1)：
  - 事件窗口大小变化、快照读取、证据导出才会触发 view 重建（O(window)），从热路径挪到冷路径。

## 下一步（若继续压榨）

- 把 `form.listScopeCheck` 的 rule 执行链进一步增量化（基于 `changedIndices/itemTouched` 跳过无关 row/rule）。
- 继续消灭 `state_transaction::dirty_all_fallback` 覆盖面（`setState/$.state.update` 退化为 dirtyAll 的场景仍然存在）。

