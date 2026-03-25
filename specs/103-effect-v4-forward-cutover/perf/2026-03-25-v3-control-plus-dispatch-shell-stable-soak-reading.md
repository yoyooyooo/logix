# 2026-03-25 · V3 control plus dispatch-shell stable soak reading

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- purpose:
  - measure the V3 control state after adding the committed-stable dispatch-shell observation gate

## Code state in this run

Relative to `v3control-plus-cont-handle`, this state additionally includes:

1. dispatch-shell committed stable part
  - gate post-commit observation on actual observer surfaces
  - skip enqueue-time TickScheduler env capture when no post-commit observation can run
  - keep the patch inside `ModuleRuntime.impl.ts`, `ModuleRuntime.transaction.ts`, `SelectorGraph.ts`

Still intentionally out:

- `dispatch-shell current-best extra shape`
- `5D`
- queue-chain `6B/6C/6D`

## Verification

- typecheck:
  - `pnpm -C packages/logix-core typecheck:test`
- focused guards:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts -t "captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2"`
- collect:
  - `pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-stable.local.darwin-arm64.soak.json`
- hard diff vs same-node `main v3`:
  - `pnpm perf diff -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-24-converge-steps.before.main-same-node-v22.19.0.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-stable.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-plus-dispatch-shell-stable.local.darwin-arm64.soak.diff.json`
- hard diff vs previous V3 best:
  - `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-cont-handle.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-stable.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.v3control-plus-cont-handle-vs-plus-dispatch-shell-stable.local.darwin-arm64.soak.diff.json`

## Hard reading vs same-node main v3

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.002ms`
- median p95 ratio about `1.004x`

Representative points:

- `full 200 @ 0.005`
  - `0.168 -> 0.152 ms`
- `full 800 @ 0.005`
  - `0.284 -> 0.302 ms`
- `full 2000 @ 0.005`
  - `0.554 -> 0.622 ms`
- `auto 800 @ 0.05`
  - `0.230 -> 0.294 ms`
- `auto 1600 @ 0.9`
  - `1.432 -> 1.548 ms`
- `auto 2000 @ 0.005`
  - `0.590 -> 0.620 ms`

## Reading vs previous V3 best

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `-0.016ms`
- median p95 ratio about `0.961x`

Representative points vs `plus-cont-handle`:

- `full 200 @ 0.005`
  - `0.170 -> 0.152 ms`
- `full 800 @ 0.005`
  - `0.312 -> 0.302 ms`
- `full 2000 @ 0.005`
  - `0.652 -> 0.622 ms`
- `auto 800 @ 0.05`
  - `0.238 -> 0.294 ms`
- `auto 1600 @ 0.9`
  - `1.540 -> 1.548 ms`
- `auto 2000 @ 0.005`
  - `0.424 -> 0.620 ms`

## Interpretation

这刀是目前最强的 V3 checkpoint。

能确定的部分：

- compared to `plus-cont-handle`, it is a real net improvement on the median
- compared to `main v3`, it is now effectively near parity
- remaining gap is already much smaller than the earlier queue-chain or pre-dispatch-shell states

## Decision

- classify as `new current best checkpoint on V3 control`
- promote this state over `v3control-plus-cont-handle`

## Follow-up

1. next cut should be extremely small
2. if another runtime-side cut cannot clearly beat this checkpoint, treat the remaining gap as mostly `effect v4` territory
