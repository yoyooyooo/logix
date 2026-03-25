# 2026-03-25 · V3 control plus dispatch-shell and early-return soak reading

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- purpose:
  - measure the V3 control state after adding a tiny transaction commit-shell early-return on top of the dispatch-shell stable part

## Code state in this run

Relative to `v3control-plus-dispatch-shell-stable`, this state additionally includes:

1. `transaction commit shell early-return`
  - if `diagnostics=off` and there is no dirty-all diagnostic, no txn history retention, no rowId sync, no commitHub publish, no post-commit observation, and no state:update recording, return before the empty commit shell keeps running

## Verification

- typecheck:
  - `pnpm -C packages/logix-core typecheck:test`
- focused guards:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts -t "captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2"`
- collect:
  - `pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-and-early-return.local.darwin-arm64.soak.json`
- hard diff vs same-node `main v3`:
  - `pnpm perf diff -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-24-converge-steps.before.main-same-node-v22.19.0.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-and-early-return.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-plus-dispatch-shell-and-early-return.local.darwin-arm64.soak.diff.json`
- hard diff vs previous V3 best:
  - `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-stable.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-dispatch-shell-and-early-return.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.v3control-plus-dispatch-shell-stable-vs-plus-dispatch-shell-and-early-return.local.darwin-arm64.soak.diff.json`

## Hard reading vs same-node main v3

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta `0ms`
- median p95 ratio `1.000x`

Representative points:

- `full 200 @ 0.005`
  - `0.168 -> 0.152 ms`
- `full 800 @ 0.005`
  - `0.284 -> 0.292 ms`
- `full 2000 @ 0.005`
  - `0.554 -> 0.634 ms`
- `auto 800 @ 0.05`
  - `0.230 -> 0.224 ms`
- `auto 1600 @ 0.9`
  - `1.432 -> 1.528 ms`
- `auto 2000 @ 0.005`
  - `0.590 -> 0.630 ms`

## Reading vs previous V3 best

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `-0.002ms`
- median p95 ratio about `0.992x`

Representative changes vs `dispatch-shell-stable`:

- `full 800 @ 0.005`
  - `0.302 -> 0.292 ms`
- `auto 800 @ 0.05`
  - `0.294 -> 0.224 ms`
- `auto 1600 @ 0.9`
  - `1.548 -> 1.528 ms`
- `auto 2000 @ 0.005`
  - `0.620 -> 0.630 ms`

## Interpretation

这是一刀很小，但结果足够明确：

- compared to `dispatch-shell-stable`, it is a small net improvement
- compared to `main v3`, the median p95 aggregate is now at parity
- remaining upside已经非常薄，继续在 V3 control 上做大块 runtime 试刀的边际收益很低

## Decision

- classify as `new current best checkpoint on V3 control`
- promote this state over `v3control-plus-dispatch-shell-stable`

## Follow-up

1. stop doing broad V3 control replay
2. treat the remaining `v4-perf` residual as primarily `effect v4` suspect
3. next mainline should switch back to the `v4` debug line and investigate effect-v4-specific shared hot tax
