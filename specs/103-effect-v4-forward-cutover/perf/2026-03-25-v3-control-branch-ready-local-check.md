# 2026-03-25 · V3 control branch-ready local check

## Candidate state

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- candidate label:
  - `v3control-cleaned-currentbest`

## Local gates passed

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/StateTransaction.SingleDirtyPathKey.test.ts`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`
- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- targeted soak:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.after.v3control-cleaned-currentbest.local.darwin-arm64.soak.json`
- hard diff vs same-node `main v3`:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-25-converge-steps.main-same-node-v3-vs-v3control-cleaned-currentbest.local.darwin-arm64.soak.diff.json`

## Local reading

- hard diff summary:
  - `regressions=0`
  - `improvements=0`
  - `budgetViolations=0`
  - `comparable=true`
- aggregate:
  - median p95 ratio about `1.043x`
  - median p95 delta about `+0.018ms`

## Remaining caveat

这只是 branch-ready local check，不是 full CI green。

`verify` 首轮红线的本地复现、根因与修复证据，见：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-25-v3-control-verify-failure-local-fix.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-25-v3-control-runtimeprovider-tickservices-ci-fix.md`

当前若要进一步扩大验证，下一步应是：

1. 单独形成 debug commit
2. 用 debug PR 触发 GitHub Actions
3. 只把 CI 结果当“扩大 correctness 面”的补充，不改这份本地 perf 结论
