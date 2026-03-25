# 2026-03-25 · V3 control plus 6C direct-idle soak reading

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- purpose:
  - measure the V3 control state after adding `6C same-tick direct-idle fast path + reset`

## Code state in this run

Relative to `v3control-plus-6b-baton`, this state additionally includes:

1. `6C same-tick direct-idle fast path + reset`
  - skip policy resolution on uncontended idle executions when diagnostics are off
  - reuse a same-tick off fast-path flag
  - add direct-path backpressure wakeup and cleanup

Already present from previous V3 control steps:

- state-bookkeeping minimal patch
- TaskRunner shadow API
- shadow-fastpath minimal hot section
- pre-resolved converge env
- sync body runner correctness fix
- services-cache on sync body runner
- `6A`
- `9`
- `10`
- `5A`
- `5C`
- `6B`

Still not in:

- `5D` deferred-flush / sequence layer
- `6D` trace/startMode details
- `dispatch-shell` pieces

## Verification

- typecheck:
  - `pnpm -C packages/logix-core typecheck:test`
- txnQueue protection tests:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts`
- collect:
  - `pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6c-direct-idle.local.darwin-arm64.soak.json`
- hard diff vs same-node `main v3`:
  - `pnpm perf diff -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-24-converge-steps.before.main-same-node-v22.19.0.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6c-direct-idle.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-plus-6c-direct-idle.local.darwin-arm64.soak.diff.json`
- hard diff vs `6B`:
  - `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6b-baton.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6c-direct-idle.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.v3control-plus-6b-baton-vs-plus-6c-direct-idle.local.darwin-arm64.soak.diff.json`
- hard diff vs previous V3 best:
  - `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-cont-handle.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6c-direct-idle.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.v3control-plus-cont-handle-vs-plus-6c-direct-idle.local.darwin-arm64.soak.diff.json`

## Hard reading vs same-node main v3

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.020ms`
- median p95 ratio about `1.050x`
- worst p95 ratio about `1.563x`

Representative points:

- `full 200 @ 0.005`
  - `0.168 -> 0.164 ms`
- `full 800 @ 0.005`
  - `0.284 -> 0.278 ms`
- `full 2000 @ 0.005`
  - `0.554 -> 0.646 ms`
- `auto 800 @ 0.05`
  - `0.230 -> 0.222 ms`
- `auto 1600 @ 0.9`
  - `1.432 -> 1.604 ms`
- `auto 2000 @ 0.005`
  - `0.590 -> 0.612 ms`

Largest visible regressions:

- `auto 2000 @ 0.4`
  - `p95 +0.564ms`
- `dirty 1600 @ 0.6`
  - `p95 +0.340ms`
- `full 2000 @ 0.9`
  - `p95 +0.296ms`
- `full 1600 @ 0.8`
  - `p95 +0.290ms`

Largest visible improvements:

- `auto 2000 @ 0.02`
  - `p95 -0.246ms`
- `dirty 2000 @ 0.02`
  - `p95 -0.210ms`
- `auto 1600 @ 0.33`
  - `p95 -0.200ms`
- `dirty 2000 @ 0.25`
  - `p95 -0.166ms`

## Reading vs 6B

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `-0.008ms`
- median p95 ratio about `0.979x`

Representative changes vs `6B`:

- `auto 800 @ 0.05`
  - `0.250 -> 0.222 ms`
- `auto 1600 @ 0.9`
  - `1.620 -> 1.604 ms`
- `full 800 @ 0.005`
  - `0.282 -> 0.278 ms`
- `auto 2000 @ 0.005`
  - `0.402 -> 0.612 ms`

Interpretation:

- `6C` 大体把 `6B` 带来的中位数回归拉回去了
- 但它也引入了新的极端 sparse regression pocket

## Reading vs previous V3 best

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.002ms`
- median p95 ratio about `1.002x`

Representative changes vs `plus-cont-handle`:

- `full 800 @ 0.005`
  - `0.312 -> 0.278 ms`
- `auto 800 @ 0.05`
  - `0.238 -> 0.222 ms`
- `auto 1600 @ 0.9`
  - `1.540 -> 1.604 ms`
- `auto 2000 @ 0.005`
  - `0.424 -> 0.612 ms`

## Interpretation

`6C` 把 queue 链的整体读数拉回到接近 `plus-cont-handle` 的位置。

可以明确说的部分：

- 它比 `6B` 单独落地更好
- 它没有把 V3 control 明显推到比 `plus-cont-handle` 更强的新 best
- queue 链在 `6A -> 6B -> 6C` 之后，继续作为主攻方向的边际收益已经很小

## Decision

- classify as `near-tie / provisional`
- do not promote this state to a new standalone best checkpoint
- current V3 best remains `v3control-plus-cont-handle`
- `6C` 说明 queue 链不是当前最优先的剩余主攻方向

## Follow-up

1. keep the queue-chain reading on file
2. deprioritize `6D` as a perf lever
3. shift the next mainline attempt to `5D deferred-flush / sequence`
