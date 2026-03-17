# 2026-03-19 · P2-3 selector invalidation index v2 fix

## 范围

- 只处理 `selector invalidation index v2`。
- 不触碰 `process shared bus` 第二刀。
- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

## 修复项 1：path cache key 编码碰撞风险

本次在 `SelectorGraph` 的 dirty-root scratch bucket 内新增 path key 缓存，并把 key 编码统一为 `field-path.toKey`（长度前缀编码）。

具体实现：

1. 为 `DirtyRootScratchBucket` 增加 `pathKeys: Set<string>`。
2. 新增 `upsertDirtyRootWithPathKeyCache(...)`：
   - 先用 `toKey(path)` 做 O(1) 重复检测。
   - 若 upsert 发生结构变化，重建 key cache，保证与 `paths` 始终一致。
3. generation 切换时同时清空 `paths` 与 `pathKeys`。
4. 保留基线开关 `LOGIX_SELECTOR_INDEX_V2_DIRTY_PATH_KEY_CACHE=0` 以便对照取证。

回归覆盖：

- 新增用例：`keeps dirty-path key cache collision-free for delimiter-like segments under the same root`
- 该用例构造同 root 下两条“分隔符可冲突”路径：
  - `root.a|b.c`（segments: `['root','a|b','c']`）
  - `root.a.b|c`（segments: `['root','a','b|c']`）
- 断言两条 selector 都会被触发，防止错误去重导致漏算。

## 修复项 2：targeted perf evidence

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-index-v2-fix.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-index-v2-fix.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-index-v2-fix.diff.json`

关键结果（同数据集、同参数）：

- p95: `204.2097ms -> 163.6887ms`（`-40.5210ms`, ratio `0.8016`）
- p50: `157.9655ms -> 157.7210ms`（`-0.2444ms`, ratio `0.9985`）
- mean: `163.7420ms -> 157.5718ms`（`-6.1702ms`, ratio `0.9623`）
- behavior check: `changedCount` before/after 一致（`0`），行为未漂移。

结论：该 targeted 样本下，修复后无行为回归，且调度路径 p95 明显下降。

## 最小验证

已执行：

1. `pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
2. `python3 fabfile.py probe_next_blocker --json`

结果：

- `SelectorGraph` 回归测试通过（17/17）。
- `probe_next_blocker` 返回 `status: clear`，队列未打红。

