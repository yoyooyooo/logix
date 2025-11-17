# Quickstart: 051 Txn Zero-Alloc（怎么用）

## 1) 051 的核心目标是什么？

- `instrumentation=light` 下调用点零对象分配（argument-based recording）。
- txn/dirtyset 热路径不引入字符串解析往返与隐式数组分配。
- 用 Node+Browser 证据门禁证明“无回归且可解释”。
- Gate baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`；P1 Gate 覆盖场景触发 `dirtyAll=true` 降级视为 FAIL。
- Node 证据默认用 `converge.txnCommit`（`pnpm perf bench:traitConverge:node`）；Browser 证据用 `converge.txnCommit`（`pnpm perf collect`；converge-only）。

## 2) 051 与 050/052 的关系？

- 050 负责定义 id 语义与映射协议；051 只负责分配行为与分支形态的极致化。
- 052 负责 diagnostics=off 的全局闸门与回归防线；051 的实现必须符合其 gate。

## 3) 下一步做什么？

- 按 `specs/051-core-ng-txn-zero-alloc/tasks.md` 推进实现与证据落盘。
- 证据口径与命令详见 `specs/051-core-ng-txn-zero-alloc/plan.md` 的 `Perf Evidence Plan（MUST）`。

## 4) 当前证据结论（Node + Browser）

> 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true && summary.regressions==0`。

- Node `converge.txnCommit`：PASS（diff=0 回归）
  - `specs/051-core-ng-txn-zero-alloc/perf/diff.node.converge.txnCommit.372a89d7__worktree.darwin-arm64.default.json`
- Browser `converge.txnCommit`（converge-only）：PASS（diff=0 回归）
  - `specs/051-core-ng-txn-zero-alloc/perf/diff.browser.converge.txnCommit.372a89d7__dev.darwin-arm64.default.json`
- 备注：上述对比均带 `git.dirty.*` 警告（工作区存在未提交改动）；如需更“干净”的证据，可在确认工作区可切换后再复测补齐。
