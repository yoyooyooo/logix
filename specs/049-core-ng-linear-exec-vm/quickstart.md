# Quickstart: 049 Exec VM（怎么用）

## 1) 我什么时候需要 049？

- 你已经有 045 的 Kernel Contract 跑道，且 `@logixjs/core-ng` 可以被试跑注入；
- 你希望把 core-ng 的热路径执行形态推进到“线性 plan + 整型索引 + buffer 复用”。

## 2) 049 的验收方式是什么？

- 045 contract verification：core vs core-ng 语义一致（差异可解释/可白名单）。
- `$logix-perf-evidence`：Node + Browser before/after/diff（matrix SSoT + `profile=default`；Node 与 Browser diff 都要 `comparable=true && regressions==0`，并争取至少 1 个关键收益）。

## 3) 下一步做什么？

- 按 `specs/049-core-ng-linear-exec-vm/tasks.md` 实现 Exec VM/Exec IR，并落盘证据。
- 证据达标后，回写 046 registry（并作为后续 `053/056` 等“更激进优化/工具链”的触发前置）。

## 4) 如何验证 Exec VM 命中（trace:exec-vm）？

- 跑 core-ng 的最小验证用例：`pnpm -C packages/logix-core-ng test ExecVm`
- 预期：
  - `diagnostics=light/sampled/full`：能看到 `trace:exec-vm` 事件（payload.meta.hit=true）
  - `diagnostics=off`：不导出 `trace:exec-vm`（近零成本）
- 手动验证“未命中/禁用”：设置 `LOGIX_CORE_NG_EXEC_VM_MODE=off`，预期 `hit=false` 且 `reasonCode=disabled`

## 5) 如何采集 perf evidence（Node + Browser）？

> 以 `$logix-perf-evidence` 为准：Node + Browser 必须分别 `comparable=true && regressions==0`。

### Node（converge.txnCommit）

- before（core-ng / execVm=off）：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=off pnpm perf bench:traitConverge:node -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/before.node.core-ng.execVm.off.converge.txnCommit.<envId>.default.json`
- after（core-ng / execVm=on）：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/049-core-ng-linear-exec-vm/perf/before.node.core-ng.execVm.off.converge.txnCommit.<envId>.default.json --after specs/049-core-ng-linear-exec-vm/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --out specs/049-core-ng-linear-exec-vm/perf/diff.node.core-ng.execVm.off__on.converge.txnCommit.<envId>.default.json`

### Browser（matrix priority=P1）

- before（core-ng / execVm=off）：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=off pnpm perf collect -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/before.browser.core-ng.execVm.off.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- after（core-ng / execVm=on）：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/049-core-ng-linear-exec-vm/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- diff：
  - `pnpm perf diff -- --before specs/049-core-ng-linear-exec-vm/perf/before.browser.core-ng.execVm.off.matrixP1.<envId>.default.json --after specs/049-core-ng-linear-exec-vm/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --out specs/049-core-ng-linear-exec-vm/perf/diff.browser.core-ng.execVm.off__on.matrixP1.<envId>.default.json`

## 6) 已落盘证据（darwin-arm64 / profile=default）

- Browser：`specs/049-core-ng-linear-exec-vm/perf/diff.browser.core-ng.execVm.off__on.matrixP1.darwin-arm64.default.json`
- Node：`specs/049-core-ng-linear-exec-vm/perf/diff.node.core-ng.execVm.off__on.converge.txnCommit.darwin-arm64.default.json`

> 备注：core vs core-ng 的对照 perf 可作为 compare-only 线索，但 049 的 Gate 结论以 “core-ng execVm=off vs on” 为准（避免把跨 kernel 差异混入 execVm 评估）。
