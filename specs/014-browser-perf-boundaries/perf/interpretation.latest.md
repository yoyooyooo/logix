# 014 Perf 解读（现阶段结论速读）

> 你不需要打开任何原始 JSON：先读本文即可；需要追溯再点到对应证据文件。

## 证据文件（本次结论使用）

- Baseline（Before）：`specs/014-browser-perf-boundaries/perf/before.402f93d2.darwin-arm64.m2max.chromium.headless.json`
- After（default）：`specs/014-browser-perf-boundaries/perf/after.worktree.default.perf-boundaries.r2.json`
- Diff（default）：`specs/014-browser-perf-boundaries/perf/diff.before.402f93d2__after.worktree.default.perf-boundaries.r2.json`

017（调参实验场）：
- 推荐默认值（稳定入口）：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`
- winner 证据：`specs/014-browser-perf-boundaries/perf/tuning/sweep.017.decisionBudgetMs=0.5.quick.json`

## 总结（Before → After）

- default diff：`improvements=17`、`regressions=2`、`budgetViolations=0`

含义：014 定义的“承载上限（maxLevel）”整体上移，且没有出现预算违例；回归点集中在一个超紧 e2e 预算（见下）。

## 关键提升（013 的收益在这里体现）

### 1) `converge.txnCommit`：commit 预算上限显著提升

- `commit.p95<=50ms` 在 `{convergeMode=dirty, dirtyRootsRatio=0.05}`：
  - Before `maxLevel=800` → After `maxLevel=2000`
- `convergeMode=auto` 在 Before 为 `notImplemented`；After 已可测、可判门（`beforeMaxLevel=null` → `afterMaxLevel!=null`）
- P1 硬门（相对预算）`auto<=full*1.05`：After 在所有 `dirtyRootsRatio` 切片都可达 `maxLevel=2000`

这基本对应“013 Auto Converge Planner + 控制面预算”落地后的直接收益：Auto 模式可用、且在主路径上可守住与 full 的相对开销门槛。

### 2) 017 推荐默认值：`decisionBudgetMs=0.5`

- 当前 quick sweep winner：`decisionBudgetMs=0.5`（见 `specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`）

### 3) `form.listScopeCheck`：动态列表 + 跨行校验（新增场景）

- 本 suite 为新增点位，diff 中会标注 `missing suite in before report`（需要后续补一份含该 suite 的 baseline 才能严格做 Before/After 对照）。
- After（default）现状：相对预算 `auto<=full*1.05` 可达 `maxLevel=300`（rows 主轴）。
- `trait:converge` 解释链路已输出：可在 `points[].evidence` 查看 `converge.*` 与 `cache.*`（例如 `cache_hit,near_full`）。

## 需要关注的点（当前仅 2 个回归）

回归仅出现在 `watchers.clickToPaint` 的超紧预算 `p95<=16ms`：

- `{reactStrictMode=false}`：Before `maxLevel=1` → After `maxLevel=null`（在最低 level 即超预算）
- `{reactStrictMode=true}`：Before `maxLevel=32` → After `maxLevel=1`（default） / `maxLevel=8`（quick）

说明：该预算本身非常贴线（Before 也会出现 `budgetExceeded`），更适合作为“抖动/极限”哨兵；结论级别以 `default diff` 为准，必要时可跑 `soak` 复测以降低噪声。

## 旁证（帮助解释“为什么变快/该怎么取舍”）

- 009（dirty vs full）：
  - typical：dirty `median=0.325ms` vs full `median=1.860ms`（约 5.7× 更快）
  - extreme：dirty `median=2.856ms` vs full `median=3.571ms`（约 1.25× 更快）
  - 证据：`specs/009-txn-patch-dirtyset/perf/after.worktree.convergeMode=dirty.r1.json`、`...full.r1.json`
- 011（Lifecycle gate）：`ok=true`  
  - 证据：`specs/011-upgrade-lifecycle/perf/after.worktree.r2.json`
- 016（Diagnostics 分档开销，10k txn micro-benchmark）：
  - off：`p50=79.9ms`、`p95=93.9ms`
  - light：`p50=128.7ms`、`p95=198.7ms`
  - full：`p50=131.8ms`、`p95=198.1ms`
  - 证据：`specs/016-serializable-diagnostics-and-identity/perf/after.worktree.r1.json`
