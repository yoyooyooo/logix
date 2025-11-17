# Spec Group Checklist: 046-core-ng-roadmap · 045-dual-kernel-contract + 039-trait-converge-int-exec-evidence + 043-trait-converge-time-slicing + 044-trait-converge-diagnostics-sampling + 047-core-ng-full-cutover-gate + 048-core-ng-default-switch-migration + 049-core-ng-linear-exec-vm + 050-core-ng-integer-bridge + 051-core-ng-txn-zero-alloc + 052-core-ng-diagnostics-off-gate + 056-core-ng-schema-layout-accessors + 057-core-ng-static-deps-without-proxy + 058-sandbox-multi-kernel + 059-core-ng-planner-typed-reachability + 060-react-priority-scheduling + 062-txn-lanes-default-switch-migration

**Group**: `specs/046-core-ng-roadmap`
**Derived From**: `registry`
**Members**: `specs/045-dual-kernel-contract`, `specs/039-trait-converge-int-exec-evidence`, `specs/043-trait-converge-time-slicing`, `specs/044-trait-converge-diagnostics-sampling`, `specs/047-core-ng-full-cutover-gate`, `specs/048-core-ng-default-switch-migration`, `specs/049-core-ng-linear-exec-vm`, `specs/050-core-ng-integer-bridge`, `specs/051-core-ng-txn-zero-alloc`, `specs/052-core-ng-diagnostics-off-gate`, `specs/056-core-ng-schema-layout-accessors`, `specs/057-core-ng-static-deps-without-proxy`, `specs/058-sandbox-multi-kernel`, `specs/059-core-ng-planner-typed-reachability`, `specs/060-react-priority-scheduling`, `specs/062-txn-lanes-default-switch-migration`
**Created**: 2025-12-29

> 本文件是“执行索引清单”：只做跳转与 gate 归纳，不复制成员 spec 的实现 tasks（避免并行真相源）。

## Members

- [x] `045-dual-kernel-contract` 已按其 tasks/quickstart 达标（入口：`specs/045-dual-kernel-contract/tasks.md`、`specs/045-dual-kernel-contract/quickstart.md`）
- [x] `039-trait-converge-int-exec-evidence` 已按其 tasks/quickstart 达标（入口：`specs/039-trait-converge-int-exec-evidence/tasks.md`、`specs/039-trait-converge-int-exec-evidence/quickstart.md`）
- [x] `043-trait-converge-time-slicing` 已按其 tasks/quickstart 达标（入口：`specs/043-trait-converge-time-slicing/tasks.md`、`specs/043-trait-converge-time-slicing/quickstart.md`）
- [x] `044-trait-converge-diagnostics-sampling` 已按其 tasks/quickstart 达标（入口：`specs/044-trait-converge-diagnostics-sampling/tasks.md`、`specs/044-trait-converge-diagnostics-sampling/quickstart.md`）
- [x] `047-core-ng-full-cutover-gate` 已按其 tasks/quickstart 达标（入口：`specs/047-core-ng-full-cutover-gate/tasks.md`、`specs/047-core-ng-full-cutover-gate/quickstart.md`）
- [x] `048-core-ng-default-switch-migration` 已按其 tasks/quickstart 达标（入口：`specs/048-core-ng-default-switch-migration/tasks.md`、`specs/048-core-ng-default-switch-migration/quickstart.md`）
- [x] `049-core-ng-linear-exec-vm` 已按其 tasks/quickstart 达标（入口：`specs/049-core-ng-linear-exec-vm/tasks.md`、`specs/049-core-ng-linear-exec-vm/quickstart.md`）
- [x] `050-core-ng-integer-bridge` 已按其 tasks/quickstart 达标（入口：`specs/050-core-ng-integer-bridge/tasks.md`、`specs/050-core-ng-integer-bridge/quickstart.md`）
- [x] `051-core-ng-txn-zero-alloc` 已按其 tasks/quickstart 达标（入口：`specs/051-core-ng-txn-zero-alloc/tasks.md`、`specs/051-core-ng-txn-zero-alloc/quickstart.md`）
- [x] `052-core-ng-diagnostics-off-gate` 已按其 tasks/quickstart 达标（入口：`specs/052-core-ng-diagnostics-off-gate/tasks.md`、`specs/052-core-ng-diagnostics-off-gate/quickstart.md`）
- [x] `056-core-ng-schema-layout-accessors` 已按其 tasks/quickstart 达标（入口：`specs/056-core-ng-schema-layout-accessors/tasks.md`、`specs/056-core-ng-schema-layout-accessors/quickstart.md`）
- [x] `057-core-ng-static-deps-without-proxy` 已按其 tasks/quickstart 达标（入口：`specs/057-core-ng-static-deps-without-proxy/tasks.md`、`specs/057-core-ng-static-deps-without-proxy/quickstart.md`）
- [x] `058-sandbox-multi-kernel` 已按其 tasks/quickstart 达标（入口：`specs/058-sandbox-multi-kernel/tasks.md`、`specs/058-sandbox-multi-kernel/quickstart.md`）
- [x] `059-core-ng-planner-typed-reachability` 已按其 tasks/quickstart 达标（入口：`specs/059-core-ng-planner-typed-reachability/tasks.md`、`specs/059-core-ng-planner-typed-reachability/quickstart.md`）
- [x] `060-react-priority-scheduling` 已按其 tasks/quickstart 达标（入口：`specs/060-react-priority-scheduling/tasks.md`、`specs/060-react-priority-scheduling/quickstart.md`）
- [x] `062-txn-lanes-default-switch-migration` 已按其 tasks/quickstart 达标（入口：`specs/062-txn-lanes-default-switch-migration/tasks.md`、`specs/062-txn-lanes-default-switch-migration/quickstart.md`）

## Notes

- 若需要跨 spec 联合验收：优先用 `$speckit acceptance <member...>`（multi-spec mode）。
- 若需要查看成员 tasks 进度汇总：用 `extract-tasks.sh --json --feature ...`。
