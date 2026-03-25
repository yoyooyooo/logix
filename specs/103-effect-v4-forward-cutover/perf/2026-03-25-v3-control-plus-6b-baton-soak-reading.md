# 2026-03-25 · V3 control plus 6B baton soak reading

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- purpose:
  - measure the V3 control state after adding `6B caller-fiber baton skeleton`

## Code state in this run

Relative to `v3control-plus-cont-handle`, this state additionally includes:

1. `6B caller-fiber baton skeleton`
  - replace `wakeQueue + consumerLoop` with a caller-fiber baton state machine in `ModuleRuntime.txnQueue.ts`
  - keep `6C/6D` out of scope

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

Still not in:

- `5D` deferred-flush / sequence layer
- `6C` same-tick direct-idle fast path + reset
- `6D` trace/startMode details
- `dispatch-shell` pieces

## Verification

- typecheck:
  - `pnpm -C packages/logix-core typecheck:test`
- txnQueue protection tests:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts`
- collect:
  - `pnpm perf collect -- --profile soak --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6b-baton.local.darwin-arm64.soak.json`
- hard diff vs same-node `main v3`:
  - `pnpm perf diff -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-24-converge-steps.before.main-same-node-v22.19.0.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6b-baton.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-plus-6b-baton.local.darwin-arm64.soak.diff.json`
- hard diff vs previous V3 best:
  - `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-cont-handle.local.darwin-arm64.soak.json --after specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-plus-6b-baton.local.darwin-arm64.soak.json --out specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.v3control-plus-cont-handle-vs-plus-6b-baton.local.darwin-arm64.soak.diff.json`

## Hard reading vs same-node main v3

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.032ms`
- median p95 ratio about `1.074x`
- worst p95 ratio about `1.365x`

Representative points:

- `full 200 @ 0.005`
  - `0.168 -> 0.164 ms`
- `full 800 @ 0.005`
  - `0.284 -> 0.282 ms`
- `full 2000 @ 0.005`
  - `0.554 -> 0.646 ms`
- `auto 800 @ 0.05`
  - `0.230 -> 0.250 ms`
- `auto 1600 @ 0.9`
  - `1.432 -> 1.620 ms`
- `auto 2000 @ 0.005`
  - `0.590 -> 0.402 ms`

Largest sparse win:

- `auto 2000 @ 0.005`
  - `p95 -0.188ms`

Largest visible regressions:

- `full 2000 @ 0.7`
  - `p95 +0.512ms`
- `full 1600 @ 0.8`
  - `p95 +0.402ms`
- `full 1600 @ 0.75`
  - `p95 +0.368ms`
- `dirty 1600 @ 0.5`
  - `p95 +0.294ms`

## Reading vs previous V3 best

Summary:

- `regressions=0`
- `improvements=0`
- `budgetViolations=0`
- `comparable=true`

Aggregate:

- median p95 delta about `+0.012ms`
- median p95 ratio about `1.029x`
- worst p95 ratio about `1.560x`

Representative points vs `plus-cont-handle`:

- `full 200 @ 0.005`
  - `0.170 -> 0.164 ms`
- `full 800 @ 0.005`
  - `0.312 -> 0.282 ms`
- `full 2000 @ 0.005`
  - `0.652 -> 0.646 ms`
- `auto 800 @ 0.05`
  - `0.238 -> 0.250 ms`
- `auto 1600 @ 0.9`
  - `1.540 -> 1.620 ms`
- `auto 2000 @ 0.005`
  - `0.424 -> 0.402 ms`

Largest regressions vs previous V3 best:

- `dirty 2000 @ 0.005`
  - `p95 +0.196ms`
- `full 2000 @ 0.7`
  - `p95 +0.512ms`
- `full 1600 @ 0.75`
  - `p95 +0.266ms`
- `dirty 2000 @ 0.6`
  - `p95 +0.216ms`

Largest improvements vs previous V3 best:

- `dirty 1200 @ 0.33`
  - `p95 -0.346ms`
- `full 1600 @ 0.33`
  - `p95 -0.198ms`
- `dirty 600 @ 0.33`
  - `p95 -0.180ms`
- `full 2000 @ 0.33`
  - `p95 -0.174ms`

## Interpretation

`6B` 单独落地后的读数是混合的。

可见趋势：

- 低 sparse 区的一部分固定税确实被压掉了
- 但中高 dirty 带又抬起了一段
- 整体上，它没有把 V3 control 推到比 `plus-cont-handle` 更接近 `main v3`

这意味着当前这版 `6B` 更适合作为下一步 `6C` 的脚手架，不适合作为新的 standalone best checkpoint。

## Decision

- classify as `mixed / provisional`
- do not promote this state to `current best checkpoint`
- current V3 best remains `v3control-plus-cont-handle`

## Follow-up

1. keep `6B` as staging only if the next step is `6C`
2. implement `6C same-tick direct-idle fast path + reset` on top of this state
3. rerun the same targeted soak
4. if `6C` still cannot recover the median p95 gap, drop `6B` from the accepted line
