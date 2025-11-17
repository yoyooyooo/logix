# Quickstart: 062 Txn Lanes 默认开启（怎么做）

## 1) 我什么时候应该做 062？

- 你已经完成 `specs/060-react-priority-scheduling/`，Txn Lanes 能被显式开启且证据可解释；
- 你准备把“Txn Lanes 默认关闭”切换为“默认开启”，并提供可回退/可对照口径；
- 你确认 `specs/052-core-ng-diagnostics-off-gate/` 已达标（off 近零成本不回归）。

## 2) 最小闭环是什么？

- 不显式配置时 default-on 生效；
- 提供显式回退/对照：`overrideMode=forced_off|forced_sync`；
- Node + Browser perf evidence：off vs default-on 的 before/after/diff 落盘且无回归（`summary.regressions=0`）；
- 文档更新：用户文档说明默认行为变化与回退方式。

## 3) 下一步做什么？

- 按 `specs/062-txn-lanes-default-switch-migration/tasks.md` 推进实现与证据落盘。

## 4) 默认值（当前实现）

- 默认开启：`txnLanes.enabled=true`
- 默认参数：
  - `budgetMs=1`
  - `debounceMs=0`
  - `maxLagMs=50`

## 5) 已落盘证据（darwin-arm64 / profile=default）

- Browser（core）：`specs/062-txn-lanes-default-switch-migration/perf/diff.browser.txnLanes.off__default.darwin-arm64.default.json`
- Browser（core-ng）：`specs/062-txn-lanes-default-switch-migration/perf/diff.browser.core-ng.txnLanes.off__default.darwin-arm64.default.json`
- Node（core）：`specs/062-txn-lanes-default-switch-migration/perf/diff.node.converge.txnCommit.txnLanes.off__default.darwin-arm64.default.json`
- Node（core-ng）：`specs/062-txn-lanes-default-switch-migration/perf/diff.node.core-ng.converge.txnCommit.txnLanes.off__default.darwin-arm64.default.json`
