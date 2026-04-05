# 2026-03-06 · Q-1：`converge auto->full (near_full)` 的 slim decision summary

本刀目标：打掉 `converge.txnCommit` 在 `dirtyRootsRatio=1, steps=2000` 这类 near-full 场景下的最后一点 auto 决策税，同时不丢失 `decision` 证据。

## 问题判断

当前 `auto` 在 `dirtyRootsRatio=1` 时已经会直接执行成 `full`：

- `executedMode=full`
- `reasons=['near_full']`

也就是说，真正的算法选择已经结束了，剩下那点 `auto<=full*1.05` 的失败，主要来自“为了保 decision 证据而构造 summary”的额外开销。

上一版尝试（未提交）曾把 near-full 场景的 decision summary 完全省掉，结果：

- `auto<=full*1.05` 确实过了；
- 但 `decisionDurationMs / executedMode / reasons` 也一起变成 `decisionMissing`，这不符合“性能与可诊断性都要保”的原则。

所以这刀的正确做法不是“删掉 decision”，而是：

- 把 near-full 场景的 decision summary 缩成 **极简版**；
- 保住必要 evidence；
- 不再为 heavy summary 交税。

## 改了什么

文件：`packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

- 新增 `shouldCollectNearFullSlimDecision`：
  - 只在 `diagnostics='off' && requestedMode='auto' && executedMode='full' && reasons=['near_full']` 时成立。
- 保留完整的 `makeDecisionSummary(...)` 给其它路径使用。
- 新增 `makeNearFullSlimDecisionSummary(...)`：
  - 只保留最小必要字段：
    - `requestedMode`
    - `executedMode`
    - `outcome`
    - `configScope`
    - `executionBudgetMs`
    - `executionDurationMs`
    - `decisionBudgetMs`
    - `decisionDurationMs`
    - `reasons`
    - `stepStats`
  - 不再附带 heavy detail（dirty/cache/generation/staticIr/timeSlicing/hotspots 等）。

## 证据

### before（stable-head full matrix）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw115.stable-head.full-matrix.json`

关键点位：

- `dirtyRootsRatio=1, steps=2000`
  - `full.p95 = 1.648ms`
  - `auto.p95 = 1.776ms`
  - `auto<=full*1.05` 在 `steps=2000` 首次失败（`maxLevel=1600 -> firstFail=2000`）

### 中间失败尝试（未提交，仅说明）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw118.converge-nearfull-slim.targeted.json`

这版虽然让 `auto<=full*1.05` 过了，但把 `auto` 的 `decisionDurationMs/executedMode/reasons` 直接打成 `decisionMissing`，因此不保留。

### after（保留 evidence 的 slim decision）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw119.converge-nearfull-slim-with-decision.targeted.json`
- diff（triage 口径）：`specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw115-to-ulw119.q1-converge-nearfull-slim-with-decision.targeted.json`

关键结果：

- `dirtyRootsRatio=1, steps=2000`
  - `full.p95 = 1.628ms`
  - `auto.p95 = 1.564ms`
- `auto<=full*1.05` 提升到 `maxLevel=2000`
- 同时 `decision.p95<=0.5ms` 在 `convergeMode=auto, dirtyRootsRatio=1` 也恢复为可用并通过（不再是 `decisionMissing`）

## 回归验证

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core exec vitest run test/StateTrait/StateTrait.ConvergeAuto.DecisionBudget.test.ts test/StateTrait/StateTrait.ConvergeDirtySet.test.ts`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw119.converge-nearfull-slim-with-decision.targeted.json`
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw115.stable-head.full-matrix.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw119.converge-nearfull-slim-with-decision.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw115-to-ulw119.q1-converge-nearfull-slim-with-decision.targeted.json`

## 裁决

- 这刀值得保留。
- 它把 `auto->full` near-full 路径收敛成了“保留必要 decision 证据，但不再交 heavy summary 税”的新默认。
- 下一刀如果继续打 `converge`，应优先：
  - 处理 `decision.p95<=0.5ms` 对 `full/dirty` 的 `notApplicable` 语义，避免在 gate 层持续被当作失败项；
  - 而不是再去抠 near-full 的那 0.0x ms。
