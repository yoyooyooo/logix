# Perf Evidence (067 Action Surface Manifest)

## 基线信息

- envId: `darwin-arm64.apple-m2-max.node22.21.1`
- hard 判据：`diff.meta.comparability.comparable === true`
- profile：
  - 探路：`quick`（不下硬结论）
  - 交付：`default`（必要时升级 `soak`）
- matrix：
  - `meta.matrixId`: `logix-browser-perf-matrix-v1`
  - `meta.matrixHash`: `1264d11b0beeded94a038591cd2daf3c4d8f2fe989201148209f5e8199b7ff36`

## 证据文件

- before: `specs/067-action-surface-manifest/perf/before.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
- after: `specs/067-action-surface-manifest/perf/after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
- diff: `specs/067-action-surface-manifest/perf/diff.before.local__after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`

## 结论

- PASS 判据：`diff.meta.comparability.comparable === true` 且 `diff.summary.budgetViolations === 0`
- comparable: `true`（warnings: `git.dirty.after=true`）
- budgetViolations: `0`
- 说明：本次 perf matrix 只覆盖时间类指标（`runtime.txnCommitMs` / `runtime.decisionMs` / `e2e.clickToPaintMs`），不包含分配/内存指标。

## Warnings 说明

- `git.dirty.after=true`：对比工具在采集/对比结束后检测到工作区处于 dirty 状态。
  - 该 dirty 在本 spec 语境下的最小可解释来源：perf 工件会被写入并落盘到仓库路径（因此天然会使工作区变脏）：
    - `specs/067-action-surface-manifest/perf/before.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
    - `specs/067-action-surface-manifest/perf/after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
    - `specs/067-action-surface-manifest/perf/diff.before.local__after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
    - `specs/067-action-surface-manifest/perf/README.md`
  - 另外，仓库也可能同时存在并行任务的未提交改动（并行开发安全约束下，本 spec 不会尝试清理工作区）。
- 该 warning 不影响本次 hard 判据：`diff.meta.comparability.comparable === true`，且 `envMismatches/configMismatches` 为空，并且 `budgetViolations === 0`。
- 若需要消除该 warning：建议在干净的独立 worktree（例如 `git worktree add`）中重复执行 `plan.md` 的 collect/diff 命令，再将结果拷回本目录。

> 证据采集/对比命令与最小覆盖集合：见 `specs/067-action-surface-manifest/plan.md` → Perf Evidence Plan（MUST）。
