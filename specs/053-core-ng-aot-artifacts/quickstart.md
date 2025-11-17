# Quickstart: 053 core-ng AOT Artifacts（怎么启动）

> 当前状态：`frozen`（仅当证据触发条件满足时解冻启动；避免把工具链长期税提前引入默认路径）。

## 1) 我什么时候需要 053？

- 你已经完成/验证了 runtime-only 的优化地基（例如 049/050/051/059/056），但证据仍显示解释层/预编译成本主导、且 runtime 手段难以再降；
- 你需要把 Static IR / Exec IR 变成“可序列化工件”，以便构建期预生成、运行期快速加载（但必须可回退、可解释、可证据化）。

## 2) 053 的验收方式是什么？

- `$logix-perf-evidence`：Node + Browser before/after/diff（必须 `comparable=true && regressions==0`）。
- fallback 口径：工件缺失/校验失败必须可解释降级到 JIT（并输出稳定 `reasonCode`）；strict gate 下允许升级为 FAIL。

## 3) 下一步做什么？

- 触发条件核对已完成（结论：未触发，保持 `frozen`）：`specs/053-core-ng-aot-artifacts/tasks.md` 的 Phase 2。
- 下一步：无（仅当出现明确证据显示“解释层/预编译成本主导且 runtime 手段难以再降”时，才把 `specs/046-core-ng-roadmap/spec-registry.json` 中 `053` 从 `frozen` 解冻为 `draft/implementing`，再进入 Phase 3+）。
