# Contract: Perf Evidence Matrix（Integer Bridge）

## Required

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- 交付 profile：`default`（或 `soak`）；`quick` 仅线索（不可下硬结论）
- 采集隔离：代码前后对比必须在独立 `git worktree/单独目录` 中分别采 before/after（混杂改动结果仅作线索）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- 覆盖范围：
  - Browser：matrix `priority=P1` suites（至少 `watchers.clickToPaint`、`converge.txnCommit`）
  - Node：`converge.txnCommit`（通过 `pnpm perf bench:traitConverge:node`）

## Suggested (non-gate)

- light/full 档位用于开销曲线与解释链路验证，但默认不作为 Gate baseline（baseline 以 `diagnostics=off` 为主）。
- 可以补充 microbench（例如 `pnpm perf bench:009:txn-dirtyset`）用于定位线索，但不得替代矩阵门禁。
