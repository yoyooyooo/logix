# 2026-03-06 · S-3：converge gate / matrix applicability 清理

本刀目标：把 `converge.txnCommit / decision.p95<=0.5ms` 中由 `full|dirty` 路径带来的 `reason=notApplicable` 假失败从 current 失败视图里剥掉，同时保留 auto 路径的真实 decision gate。

## 方案

采用最小局部 split-suite：

- 保留原 `converge.txnCommit` suite 的 `txnCommit` 预算与 `auto<=full*1.05` 对比。
- 把 `decision.p95<=0.5ms` 单独拆到新的 auto-only suite：`converge.txnCommit.autoDecision`。
- `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx` 仍只跑一轮采样；第二个 suite 直接复用同一批 auto points，本地计算 auto-only threshold，不触碰 shared harness。

为什么选这个方案：

- 它只改 matrix + 单个 browser perf 用例。
- 不需要动 `harness.ts`、`collect.ts`、`diff.ts` 的 shared 逻辑。
- 既清掉 full/dirty 的假失败，又保住 auto decision gate 的真实约束。

## 改动落点

- `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - 从 `converge.txnCommit` 移除 `decision.p95<=0.5ms`。
  - 新增 `converge.txnCommit.autoDecision`，只覆盖 `steps × dirtyRootsRatio` 的 auto decision budget。
- `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
  - 保持原主 suite 采样逻辑。
  - 从 auto points 派生 `decisionPoints` 与 `decisionThresholds`。
  - 输出两个 suite 到同一份 perf report。

## 证据

- targeted report：`specs/103-effect-v4-forward-cutover/perf/s3.after.local.quick.yoyodeMac-mini.converge-gate-applicability.targeted.json`

抽查结论：

- `converge.txnCommit` 的 budgets 现在只有：
  - `commit.p95<=50ms`
  - `commit.p95<=100ms`
  - `auto<=full*1.05`
- 新的 `converge.txnCommit.autoDecision` 只包含：
  - `decision.p95<=0.5ms`
- `converge.txnCommit.autoDecision` 的 17 个 `dirtyRootsRatio` slice 全部 `maxLevel=2000`，没有 `reason=notApplicable`。

## 验证

- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s3.after.local.quick.yoyodeMac-mini.converge-gate-applicability.targeted.json`
- `pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s3.after.local.quick.yoyodeMac-mini.converge-gate-applicability.targeted.json --allow-partial`
- `pnpm -C packages/logix-react typecheck:test`

说明：

- `validate --allow-partial` 的缺失 suite 仅因为这次是 targeted 单文件采集，不影响本刀结论。
- 本刀没有动 runtime，也没有碰 `txnLanes / externalStore / watchers`。

## 裁决

- 这刀应保留。
- 它把 `converge` 的 current 假失败清掉，同时不需要先改 shared applicability 基础设施。
- 如果后续还要继续演进，应把 `notApplicable / decisionMissing` 提升为 shared 汇总层的一等语义；但那是另一刀，不应阻塞当前主线。
