# Contract: Perf Evidence Matrix（Full Cutover Gate）

本 contract 定义 047 的性能证据门槛口径：suites/budgets 的单一事实源（SSoT）统一为 `.codex/skills/logix-perf-evidence/assets/matrix.json`（以下简称 matrix.json）。

## SSoT

- SSoT：matrix.json（包含 suite 列表、`priority`、axes、metrics、budgets）。
- Gate/CI/Review 不得在 spec/脚本中再维护第二份 suites/budgets 常量（避免并行真相源漂移）。

## Required

- MUST 包含 Node + ≥1 条 headless browser（同机同配置的 before/after/diff）。
- MUST 在独立 `git worktree/单独目录` 中采集证据（混杂工作区结果仅作线索，不得用于宣称 Gate PASS）。
- MUST 明确 diagnostics 档位（至少覆盖 `off`；必要时覆盖 `light`）。
- MUST 锁死 profile 门槛：Gate PASS 的硬结论至少要求 `profile=default`；`quick` 仅作线索；如需更稳可使用 `profile=soak` 复核（可选但推荐）。
- MUST 满足可比性：before/after 的 `matrixId+matrixHash` 必须一致，且 perf diff 的 `comparability.comparable=true`（不允许 env/config 漂移）。
- MUST 覆盖 suites：至少覆盖 matrix 的 `priority=P1`；若只跑子集，必须在结论中显式列出 suiteIds 与原因。
- MUST 预算裁决：以 matrix.json 中 suites 的 budgets 为准；在所选 suites 上，`pnpm perf diff` 的 `summary.regressions` 必须为 0。

## Notes

- 若某关键指标/预算尚未在 matrix.json 编码，则不得以“口头预算”作为 Gate PASS 依据；应先补齐 matrix.json + diff 规则，再把它升级为硬门槛。
