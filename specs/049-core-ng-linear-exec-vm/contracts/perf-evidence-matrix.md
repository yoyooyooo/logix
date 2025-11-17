# Contract: Perf Evidence Matrix（Exec VM）

本 contract 定义 049 的性能证据门槛口径（以 `$logix-perf-evidence` 为裁决）。

## Required

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- 交付 profile：`default`（或 `soak`）；`quick` 仅线索（不可下硬结论）
- 采集隔离：允许在同一 dev 工作区采集 before/after（可为 git dirty），但必须保证 `matrix/config/env` 一致；若出现 `stabilityWarning` / `comparable=false` / drift，必须复测并在结论中标注
- PASS 判据：Node 与 Browser 的 `pnpm perf diff` 都必须输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`（任一 FAIL 则整体 Gate FAIL）
- 覆盖范围：
  - Browser：matrix `priority=P1` suites
  - Node：`converge.txnCommit`（通过 `pnpm perf bench:traitConverge:node`）

## Suggested (non-gate)

- light/full 档位用于开销曲线与解释链路验证，但默认不作为 Gate baseline（baseline 以 `diagnostics=off` 为主）。
- 可以补充 `form.listScopeCheck`、`diagnostics.overhead.e2e` 等 P2+ suites 作为扩面证据，但不得替代 P1 门禁。
