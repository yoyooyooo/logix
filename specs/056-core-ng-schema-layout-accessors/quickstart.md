# Quickstart: 056 Schema Layout Accessors（怎么测）

## 1) 我什么时候需要 056？

- 你已经有 049 的 Exec VM/JIT 预编译基座，希望进一步把热路径字段访问推向 “pathId → accessor 表”；
- 你在 Node/Browser 证据中观察到“字段访问/路径遍历”成本显著，且仅靠 runtime 小修小补难以继续下降。

## 2) 056 的验收方式是什么？

- `$logix-perf-evidence`：Node + Browser before/after/diff（matrix SSoT + `profile=default`；diff 必须 `comparable=true && regressions==0`）。

## 3) 如何采集 perf evidence（Node + Browser）？

> 固定 kernel=core-ng 且固定 execVmMode（建议 `on`），避免把开关噪声混入结论。

### Node（converge.txnCommit）

- before：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/056-core-ng-schema-layout-accessors/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- after：
  - `LOGIX_PERF_KERNEL_ID=core-ng LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf bench:traitConverge:node -- --profile default --out specs/056-core-ng-schema-layout-accessors/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/056-core-ng-schema-layout-accessors/perf/before.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --after specs/056-core-ng-schema-layout-accessors/perf/after.node.core-ng.execVm.on.converge.txnCommit.<envId>.default.json --out specs/056-core-ng-schema-layout-accessors/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.<envId>.default.json`

### Browser（matrix priority=P1）

- before：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/056-core-ng-schema-layout-accessors/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- after：
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng VITE_LOGIX_CORE_NG_EXEC_VM_MODE=on pnpm perf collect -- --profile default --out specs/056-core-ng-schema-layout-accessors/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- diff：
  - `pnpm perf diff -- --before specs/056-core-ng-schema-layout-accessors/perf/before.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --after specs/056-core-ng-schema-layout-accessors/perf/after.browser.core-ng.execVm.on.matrixP1.<envId>.default.json --out specs/056-core-ng-schema-layout-accessors/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.<envId>.default.json`

## 4) Failure Policy

- 若 diff 出现 `stabilityWarning` / `comparable=false` / `timeout`：先复测（必要时 `profile=soak` 或缩小 `--files` 子集），禁止直接下硬结论。

## 5) 当前证据（PASS）

- Node diff：`specs/056-core-ng-schema-layout-accessors/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-075738.default.json`
- Browser diff：`specs/056-core-ng-schema-layout-accessors/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-075738.default.json`
