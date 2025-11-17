# Contract: Perf Evidence Matrix（diagnostics=off gate）

## Required

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- 交付 profile：`default`（或 `soak`）；`quick` 仅线索
- Baseline kernel：以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归
- 采集隔离：before/after 必须在独立 `git worktree/单独目录` 中采集
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- Node+Browser 任一失败整体 FAIL

## Coverage

- Browser：`diagnostics.overhead.e2e`（`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`）
- Node：`converge.txnCommit`（`pnpm perf bench:traitConverge:node`；用于判定 off gate 是否影响主链路）
