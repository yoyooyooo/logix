# Quickstart: 047 Full Cutover Gate（怎么用）

## 1) 我什么时候需要看/用 047？

- 你已经完成/接近完成 `specs/045-dual-kernel-contract/`，并开始把 `@logixjs/core-ng` 接入试跑。
- 你准备宣称“core-ng 已可切默认”，但需要一个硬门槛：无 fallback + 契约一致性 + Node+Browser 证据预算。

## 2) 我如何理解 Full Cutover Gate？

- `trial-run/test/dev`：允许渐进替换（混用 builtin），但必须证据化（045）。
- `fullCutover`：**禁止 fallback**。任何 service 缺失/回退都视为失败，不能宣称可切默认。

## 3) 我要产出哪些证据文件？

- 对照验证（core vs core-ng）输出结构化 diff（045 harness）。
- `$logix-perf-evidence` 的 Node + Browser before/after/diff（落盘到 `specs/047-core-ng-full-cutover-gate/perf/*`）。
- suites/budgets 的口径以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为准（至少覆盖 `priority=P1`）。

## 4) 下一步要做什么？

- 按 `specs/047-core-ng-full-cutover-gate/tasks.md` 落地 gate 的实现与测试；
- 完成后把 046 的 M3 从“下一步新增 spec”更新为指向 `specs/047-core-ng-full-cutover-gate/`。

## 5) 性能证据（US2）当前状态

证据文件（`profile=default`）：

- Browser（PASS）：
  - before：`specs/047-core-ng-full-cutover-gate/perf/before.browser.default.worktree.json`
  - after：`specs/047-core-ng-full-cutover-gate/perf/after.browser.default.worktree.json`
  - diff：`specs/047-core-ng-full-cutover-gate/perf/diff.browser.default.worktree.json`（`comparability.comparable=true` 且 `summary.regressions=0`）
- Node（PASS）：
  - before：`specs/047-core-ng-full-cutover-gate/perf/before.node.default.worktree.json`
  - after：`specs/047-core-ng-full-cutover-gate/perf/after.node.default.worktree.json`
  - diff：`specs/047-core-ng-full-cutover-gate/perf/diff.node.default.worktree.json`（`comparability.comparable=true` 且 `summary.regressions=0`）

## Notes（allowlist）

- 若 Gate 通过但 `allowedDiffs` 非空（命中 allowlist），必须在结论里显式标注“带 allowlist 通过”，并附上 `allowedDiffs` 摘要供复核与审计（不得当成完全一致）。
