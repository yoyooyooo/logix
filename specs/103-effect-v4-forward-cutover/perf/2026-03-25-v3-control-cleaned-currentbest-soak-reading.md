# 2026-03-25 · V3 control cleaned current-best soak reading

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- purpose:
  - remeasure the documented V3 current-best state after removing live `6B/6C` queue code and aligning code with the written plan

## Cleanup applied before this run

1. `ModuleRuntime.txnQueue.ts`
  - revert live queue implementation back to the `main`-style consumer loop
  - keep `6A` surface only
2. queue-lane test surface
  - keep the pre-`6B/6C` lane assertions

## Verification

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- `pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-cleaned-currentbest.local.darwin-arm64.soak.json`
- `pnpm perf diff -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-24-converge-steps.before.main-same-node-v22.19.0.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-cleaned-currentbest.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-cleaned-currentbest.local.darwin-arm64.soak.diff.json`

## Hard reading vs same-node main v3

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.018ms`
- median p95 ratio about `1.043x`

Representative points:

- `full 200 @ 0.005`
  - `0.168 -> 0.170 ms`
- `full 800 @ 0.005`
  - `0.284 -> 0.316 ms`
- `full 2000 @ 0.005`
  - `0.554 -> 0.604 ms`
- `auto 800 @ 0.05`
  - `0.230 -> 0.216 ms`
- `auto 1600 @ 0.9`
  - `1.432 -> 1.528 ms`
- `auto 2000 @ 0.005`
  - `0.590 -> 0.406 ms`

## Interpretation

清理 live `6B/6C` 之后：

- V3 control 仍然明显接近 `main v3`
- 之前那份 `median p95 ratio=1.000x` 的 best 结论有一部分来自混合 live state
- 真正 branch-ready 的干净状态，更接近 `1.043x / +0.018ms`

这依然是很强的控制证据：

- runtime accepted cuts 在 effect v3 上已经基本把主要回归吃掉了
- 剩余 gap 已经显著小于 `v4 current-best`

## Decision

- classify as `clean branch-ready checkpoint`
- use this state as the clean V3 best, replacing the older mixed-state wording
