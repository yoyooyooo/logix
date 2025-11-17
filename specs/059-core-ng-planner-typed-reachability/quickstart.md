# Quickstart: 059 Planner Typed Reachability（怎么测）

## 1) 我什么时候需要 059？

- 你已经在 converge/txn 或 watchers 的证据中看到“plan compute / reachability”成本显著，且仍受 Map/Set/对象分配税拖累；
- 你希望在不引入 Wasm/工具链的前提下，把 reachability 算法极致化为 TypedArray/bitset/queue 的纯内存形态。

## 2) 059 的验收方式是什么？

- `$logix-perf-evidence`：Node + Browser before/after/diff（matrix SSoT + `profile=default`；Node 与 Browser diff 都要 `comparable=true && regressions==0`）。
- JS-first baseline：若 JS 已达标，不启动 `054-core-ng-wasm-planner`。

## 3) 如何采集 perf evidence（Node + Browser）？

> 固定 kernel=core-ng 且固定 execVmMode，避免把开关噪声混入结论。

### Node（converge.txnCommit）

- before：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- after：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/059-core-ng-planner-typed-reachability/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --after specs/059-core-ng-planner-typed-reachability/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --out specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.<envId>.default.json`

### Browser（matrix priority=P1）

- before：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- after：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/059-core-ng-planner-typed-reachability/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- diff：
  - `pnpm perf diff -- --before specs/059-core-ng-planner-typed-reachability/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --after specs/059-core-ng-planner-typed-reachability/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --out specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.<envId>.default.json`

## 4) Failure Policy

- 若 diff 出现 `stabilityWarning` / `comparable=false` / `timeout`：先复测（必要时 `profile=soak` 或缩小 `--files` 子集），禁止直接下硬结论。

## 5) 当前证据（PASS）

- Node diff：`specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-072950.default.json`
- Browser diff：`specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-072950.default.json`
