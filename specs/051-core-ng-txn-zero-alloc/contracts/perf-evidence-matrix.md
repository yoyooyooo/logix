# Contract: Perf Evidence Matrix（txn zero-alloc）

## Required

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- 交付 profile：`default`（或 `soak`）；`quick` 仅线索（不可下硬结论）
- Baseline config：固定 `diagnostics=off + stateTransaction.instrumentation=light`
- Baseline kernel：以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归
- 采集隔离：before/after 必须在独立 `git worktree/单独目录` 中采集
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

## Coverage

- Node：`converge.txnCommit`（通过 `pnpm perf bench:traitConverge:node`）
- Browser：matrix `priority=P1` suites（baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`）
