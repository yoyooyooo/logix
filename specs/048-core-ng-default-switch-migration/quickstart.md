# Quickstart: 048 切默认到 core-ng（怎么做）

> NOTE（2025-12-31）：本 quickstart 对应“默认切到 `core-ng`”的历史实现；当前仓库已选择 **单内核默认**（默认 `core`，`core-ng` 仅对照/试跑显式启用），因此本文不再作为当前行为裁决。以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准。

## 1) 我什么时候应该做 048？

- 你已经完成 `specs/047-core-ng-full-cutover-gate/` 并且 Gate=PASS；
- 你准备把 core-ng 设为默认实现（M4）。

## 2) 切默认的最小闭环是什么？

- 默认创建 runtime → 默认 kernel=core-ng 且 fully activated；
- 显式创建 runtime（显式选择 `core`，通过 kernel layer / KernelImplementationRef 覆盖）→ 可回退且证据可解释；
- 默认路径请求 `core-ng` 但缺 bindings → 必须 FAIL（不得隐式 fallback），并能导出最小可序列化证据锚点；
- Node 或 Browser 任一 required suite 回归 → 仍视为未完成（`summary.regressions>0` 阻断）；
- Node + Browser 的 `$logix-perf-evidence` before/after/diff 落盘并满足预算（suites/budgets SSoT=matrix.json；至少覆盖 `priority=P1`；硬结论至少 `profile=default`；采集必须在独立 `git worktree/单独目录` 中进行）。

## 3) 回退口径是什么？

- 只能显式选择 core（用于排障/对照），禁止隐式 fallback。

## 4) 下一步要做什么？

- 按 `specs/048-core-ng-default-switch-migration/tasks.md` 落地实现与证据；
- 完成后把 046 的 M4 更新为指向 `specs/048-core-ng-default-switch-migration/`。

## 5) 性能证据（US3）当前状态

证据文件（`profile=default`，P1 suites=Node+Browser）：

- before：`specs/048-core-ng-default-switch-migration/perf/before.38db2b05.default.p1.json`
- after：`specs/048-core-ng-default-switch-migration/perf/after.worktree.default.p1.json`
- diff：`specs/048-core-ng-default-switch-migration/perf/diff.before.38db2b05__after.worktree.default.p1.json`（`comparability.comparable=true` 且 `summary.regressions=0`）

> 备注：全量矩阵 diff（非 P1 子集）见 `specs/048-core-ng-default-switch-migration/perf/diff.before.38db2b05__after.worktree.default.json`。
