# 2026-03-26 v4 state-txn push closeout

## 目标状态

当前本地已满足：

- `converge-steps soak` 相对 `main`：
  - `summary.regressions=0`
  - `budgetViolations=0`
  - `auto<=full*1.05` 不再在高 dirty band 失败

核心工件：

- after:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.after.debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.json`
- vs main:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.main-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.same-matrix.diff.json`
- vs currentbest:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-steps.v4currentbest-rerun-vs-debug-state-txn-snapshot-reuse.local.darwin-arm64.soak.diff.json`

## proven 核心改动点

当前最硬收益来自：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

两刀内容：

1. committed dirty snapshot ownership transfer
2. materialized dirty snapshot scratch reuse

支持证据：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-cut-reading.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-state-txn-soak-win-reading.md`

## 验证结果

语义测试：

- `pnpm -C packages/logix-core test -- test/internal/Runtime/StateTransaction.LazyDirtySnapshot.test.ts test/internal/Runtime/StateTransaction.SingleDirtyPathKey.test.ts`

focused node：

- matrix:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-converge-band-075-080.node-matrix.json`
- clean baseline:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.before.main.quick.json`
- final after:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.after.state-txn-snapshot-reuse.local.quick.json`
- final diff:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-26-traitConverge-node.band-075-080.clean-v4perf-vs-state-txn-snapshot-reuse.local.quick.diff.json`

focused browser：

- bridge:
  - `packages/logix-react/test/browser/perf-boundaries/converge-band-075-080-bridge.local.test.tsx`
- attribution:
  - `packages/logix-react/test/browser/perf-boundaries/converge-internal-highband-plain-vs-cont.local.test.tsx`
  - `packages/logix-react/test/browser/perf-boundaries/txn-shell-continuation-off.local.test.tsx`

## 待 push 边界

当前 debug worktree 里仍有未证明该一起进入 closeout 的 active diff：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

当前口径：

- 本轮“shared full-path / bookkeeping 税已压下去”的最强证据集中在 `StateTransaction.ts`
- 上述 3 个文件在当前 worktree 中虽然也参与了最终 soak 环境，但尚未被证明是 closeout 必需改动

因此 push 前的最小可执行边界应定义为：

- 必带：
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 本轮 dated evidence / closeout 文档
- 待单独裁决：
  - `ModuleRuntime.transaction.ts`
  - `ModuleRuntime.txnLanePolicy.ts`
  - `converge-in-transaction.impl.ts`

## 下一步可执行收口

1. 在当前 debug worktree 中保持本轮证据文档完整
2. 拆出“StateTransaction 两刀 + docs/evidence”的最小提交边界
3. 用该最小边界重做一次 targeted soak / focused node
4. 边界仍成立后，再 push 并走 GitHub Action 深采
