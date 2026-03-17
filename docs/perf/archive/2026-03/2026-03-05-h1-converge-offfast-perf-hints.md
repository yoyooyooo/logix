# 2026-03-05 · H-1：converge(off-fast-path) 负优化边界压榨（perf hint 保留 + 冷启动样本隔离；fast_full guard 尝试/回滚）

本刀目标：在 `diagnosticsLevel=off && middleware=empty` 的 **off-fast-path** 下，把 `auto` 的决策/缓存/规划开销压到不会被子毫秒场景放大的程度，并让 perf hint 在 graph invalidation（generation bump）后不至于反复冷启动误判。

这里的“负优化边界”主要指：`negativeBoundaries.dirtyPattern` 这类 adversarial workload，会把 `auto<=full*1.05` 的 0.1ms 级抖动放大成“档位断崖”。

## 结论（可复现证据）

### 1) 当前实现状态（保留项）

- 性能证据（`profile=soak` / neg-only；可比性 comparable=true，after 为 dirty workspace）：
  - PerfReport (before): `specs/103-effect-v4-forward-cutover/perf/s2.before.local.soak.ulw82.h1-offfast-fastfull-baseline.neg-only.clean.json`
  - PerfReport (after): `specs/103-effect-v4-forward-cutover/perf/s2.after.local.soak.ulw85.h1-offfast-ewma-carryover.neg-only.clean.json`
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.soak.ulw82-to-ulw85.h1-offfast-ewma-carryover.neg-only.clean.json`
- Diff 摘要（本轮可观测现象）：
  - `slidingWindowOverlap` 从 `beforeMaxLevel=null` 改善到 `afterMaxLevel=4096`。
  - `listIndexExplosion` 从 `beforeMaxLevel=4096` 退化到 `afterMaxLevel=64`（典型表现是 `0.1ms` 级差异被 `auto<=full*1.05` 放大）。

结论：这刀在负优化边界里“有改善也有代价”，且 suite 本身对 0.1ms 级量化抖动仍高度敏感，必须配合下一刀的 gate floor 才能形成稳定可执行的结论。

### 2) 已回滚的尝试（保留证据用于解释“为什么不能这么做”）

- 曾尝试：在 off-fast-path 下把 `fast_full` 的判断前移（直接 `auto -> full`，跳过 inline admission/cache/plan）。
- 结果：会把一些本该走 `dirty` 的稳定重复模式（例如 alternating）强行变成 `executedMode=full`，在 ultra-fast 场景里反而更容易因为 `auto` 的固定 overhead 触发 `auto<=full` 失败。
- 证据（`profile=soak`）：
  - PerfDiff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.soak.ulw82-to-ulw83.h1-offfast-fastfull-guard.neg-only.clean.json`
  - outlier（看 executedMode/reasons 佐证 fast_full 被强制触发）：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.soak.ulw84.h1-offfast-fastfull-guard.neg-only.outlier.json`

## 改了什么（实现点）

文件：`packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

1. generation bump 重建 execIr 时，携带 off-fast-path 的 full 成本 hint（仅 stepCount 不变时）
   - carry over：`fullCommitEwmaOffMs` / `fullCommitSampleCountOff` / `fullCommitLastTxnSeqOff`
   - 不 carry：`fullCommitMinOffMs`（只会降低不会升高，跨 rebuild 易陈旧）

2. off-fast-path 的 full 样本更新跳过 `txnSeq===1`（隔离 JIT/init 冷启动污染）
   - 避免 EWMA 被“第一笔交易的系统噪声”拉高，导致后续误判。

3. （已回滚）off-fast-path 的 `fast_full` 提前 guard
   - 该改动已撤回，原因见上方“已回滚的尝试”。

## 验证（本轮已跑并通过）

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-react typecheck:test`

## 剩余问题与下一刀（裁决）

1. 负优化边界的 budget 缺少 `minDeltaMs`，导致 `0.1ms` 级波动被放大为“档位断崖”
   - 下一刀（已完成于 H-2）：给 `negativeBoundaries.dirtyPattern` 的 `auto<=full*1.05` 增加 `minDeltaMs=0.1`（与 `converge.txnCommit` 对齐），让 gate 在 sub-ms 场景下可执行且可复测；见 `docs/perf/archive/2026-03/2026-03-05-h2-negative-boundary-min-delta.md`。

2. 若在补 gate floor 后仍出现真实回归：
   - 再考虑内核进一步减配 `diagnosticsLevel=off` 下的 decision 资产（例如 reasons/重证据按需 materialize），把 `auto` 固定开销继续向 0 收敛。
