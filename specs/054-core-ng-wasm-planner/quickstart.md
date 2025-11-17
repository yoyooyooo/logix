# Quickstart: 054 core-ng Wasm Planner（怎么启动）

> 当前状态：`frozen`（仅当证据触发条件满足时解冻启动；默认仍以 059 的 JS baseline 为准）。

## 1) 我什么时候需要 054？

- 你已经完成 `059-core-ng-planner-typed-reachability` 的 JS baseline，但证据仍显示瓶颈由 GC/Map/Set 主导且收益不足；
- 你愿意承担 Wasm 分发与 bridge tax 的复杂度，并能把它做成“trial-only、可回退、可解释、可证据化”的可选路线。

## 2) 054 的验收方式是什么？

- Browser 必须有 `$logix-perf-evidence` 的 before/after/diff（必须 `comparable=true && regressions==0`）。
- bridge tax 必须显式量化（时间/拷贝字节等），且不得成为新的主导瓶颈。
- 失败回退必须可解释：Wasm 不可用/超预算/失败 → 退回 JS baseline（059）并输出稳定 `reasonCode`。

## 3) 下一步做什么？

- 触发条件核对已完成（结论：未触发，保持 `frozen`）：`specs/054-core-ng-wasm-planner/tasks.md` 的 Phase 2（依赖 059 的证据）。
- 下一步：无（仅当证据显示瓶颈仍由 GC/Map/Set 主导且 JS baseline（059）不足时，才把 `specs/046-core-ng-roadmap/spec-registry.json` 中 `054` 从 `frozen` 解冻为 `draft/implementing`，再进入 Phase 3+）。
