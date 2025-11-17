# Quickstart: 052 diagnostics=off 近零成本 Gate（怎么用）

## 1) 052 的核心目标是什么？

- 把 off 档位的“近零成本”做成可验收 Gate（不是口头约定）。
- 用测试 + perf evidence（Browser `diagnostics.overhead.e2e`）拦截回归。
- Node+Browser 都必须 Gate PASS；before/after/diff 必须隔离采集（混杂结果仅作线索）。

## 2) 052 覆盖哪些 specs？

- 作为全局闸门覆盖 `049/050/051` 的 off 行为（见 `specs/046-core-ng-roadmap/spec-registry.md`）。

## 3) 下一步做什么？

- 按 `specs/052-core-ng-diagnostics-off-gate/tasks.md` 推进实现与证据落盘。
- 命令与判据详见 `specs/052-core-ng-diagnostics-off-gate/plan.md` 的 `Perf Evidence Plan（MUST）`。

## 4) 最近一次 Gate PASS（证据）

- Node（`converge.txnCommit`）：`specs/052-core-ng-diagnostics-off-gate/perf/diff.node.converge.txnCommit.372a89d7__worktree.darwin-arm64.default.json`
- Browser（`diagnostics.overhead.e2e`）：`specs/052-core-ng-diagnostics-off-gate/perf/diff.browser.diagnostics-overhead.372a89d7__worktree.darwin-arm64.default.json`
- 结论：两份 diff 均满足 `meta.comparability.comparable=true && summary.regressions==0`（profile=default）
