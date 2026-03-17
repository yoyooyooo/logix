# 2026-03-20 · P1-2 next expansion（BoundApi.state.update）evidence-only

## 结果分类

- `discarded_or_pending`
- `accepted_with_evidence=false`
- 本轮按 failure gate 收口：回滚全部实现与测试改动，仅保留 docs/evidence。

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-2-next-expansion`
- branch：`agent/v4-perf-p1-2-next-expansion`
- 唯一目标：在 `P1-2` 已吸收主线、v2/v3 与 mixed-known/unknown 收紧后，评估 `BoundApi.state.update` / 相关 state write 入口是否还能减少 whole-state fallback。
- 禁止重做切口：`p3 no-prod-txn-history`、`p4 DevtoolsHub projection hints`、`p5 full-lazy raw eager-only meta`、`p6 full-lazy traitConverge heavy decision/detail`。

## 尝试内容（已回滚）

1. 在 `BoundApiRuntime.applyKnownTopLevelDirtyStateUpdate` 试探“仅记录声明内 top-level key，过滤 mixed-known/unknown 的 unknown key”。
2. 在 `BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off` 增加 `mixedUnknown` case 观察贴边收益。
3. 三轮重复采样后，结果方向不稳定，且 `mixedUnknown` 出现回摆，未满足“可归因硬收益”。

## 关键采样（实验分支内临时实现）

- run A：
  - `mixedUnknown` `legacy.p95=0.154ms`，`current.p95=0.241ms`（`1.565x`，变慢）
  - `mixedUnknown` `legacy.avg=0.089ms`，`current.avg=0.121ms`（`1.360x`，变慢）
- run B：
  - `mixedUnknown` `legacy.p95=0.075ms`，`current.p95=0.074ms`（`0.987x`，接近持平）
  - `many` `legacy.p95=0.077ms`，`current.p95=0.091ms`（`1.182x`，变慢）
- run C：
  - `mixedUnknown` `legacy.p95=0.072ms`，`current.p95=0.117ms`（`1.625x`，变慢）
  - `eight` `legacy.p95=0.079ms`，`current.p95=0.126ms`（`1.595x`，变慢）

结论：该切口没有稳定、可归因、可复现的正收益，不进入母线代码。

## 最终验证（回滚后基线）

1. `pnpm -C packages/logix-core typecheck:test`：通过
2. `pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts`：通过
3. `python3 fabfile.py probe_next_blocker --json`：`status=clear`

## 证据锚点

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.probe-next-blocker.json`
