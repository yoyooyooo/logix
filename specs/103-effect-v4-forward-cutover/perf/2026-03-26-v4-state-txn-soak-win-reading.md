# 2026-03-26 v4 state-txn soak win reading

## 工件

- after:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.after.debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.json`
- vs main:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.main-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.same-matrix.diff.json`
- vs currentbest:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.v4currentbest-rerun-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.diff.json`

## 主结论

- `comparable=true`
- 相对 `main`：
  - `summary.regressions = 0`
  - `summary.improvements = 2`
  - `budgetViolations = 0`
- `auto<=full*1.05` 当前只剩改善项：
  - `dirtyRootsRatio=0.1: before=400 after=2000`
  - `dirtyRootsRatio=0.4: before=600 after=2000`
- 先前反复漂移的高 dirty band 已经回到通过
  - `0.75 / 0.8 / 0.9` 不再出现在 threshold regressions 里

## 代表读数

### 相对 currentbest

- `auto 1600 @ 0.75: 1.326 -> 1.294`
- `auto 1600 @ 0.8: 1.378 -> 1.318`
- `auto 1600 @ 0.9: 1.532 -> 1.402`
- `auto 2000 @ 0.75: 1.606 -> 1.550`
- `auto 2000 @ 0.8: 1.706 -> 1.628`
- `auto 2000 @ 0.9: 1.878 -> 1.712`

- `full 1600 @ 0.75: 1.340 -> 1.308`
- `full 1600 @ 0.8: 1.432 -> 1.312`
- `full 2000 @ 0.75: 1.674 -> 1.592`
- `full 2000 @ 0.8: 1.732 -> 1.638`

### 相对 main

- `auto 1600 @ 0.75: 1.326 -> 1.294`
- `auto 1600 @ 0.8: 1.338 -> 1.318`
- `auto 1600 @ 0.9: 1.440 -> 1.402`
- `auto 2000 @ 0.75: 1.672 -> 1.550`
- `auto 2000 @ 0.8: 1.672 -> 1.628`
- `auto 2000 @ 0.9: 1.832 -> 1.712`

- `full 1600 @ 0.75: 1.452 -> 1.308`
- `full 1600 @ 0.8: 1.458 -> 1.312`
- `full 1600 @ 0.9: 1.678 -> 1.392`
- `full 2000 @ 0.75: 1.686 -> 1.592`
- `full 2000 @ 0.8: 1.872 -> 1.638`
- `full 2000 @ 0.9: 2.136 -> 1.722`

## 归因

当前最强证据支持：

- shared full-path / bookkeeping 税的主因在 `StateTransaction.ts`
- 两刀 StateTransaction cut：
  - committed dirty snapshot ownership transfer
  - materialized dirty snapshot scratch reuse

已经足以把 `converge-steps soak` 从高 dirty 漂移状态拉回到相对 `main` 不回归。

## 当前状态

- 本地目标已经达到：
  - `至少不能比 main 差`
- 还没 push
- 下一步可以进入：
  - push debug 分支
  - 然后跑 GitHub Action 做更深的 collect / 防抖复核
