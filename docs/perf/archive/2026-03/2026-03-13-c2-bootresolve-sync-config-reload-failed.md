# 2026-03-13 · C-2：`react.bootResolve.sync` config-reload skip 试探失败

## 目标

验证 `RuntimeProvider` 在 `policy.mode='sync'` 下，是否因为“sync snapshot 已成功后仍立刻跑一轮 async config reload”而引入固定税。

## 假设

- 当前 `react.bootResolve.sync` 的小固定税，部分来自 `RuntimeProvider` mount 后的第二次 config snapshot 异步刷新。
- 若在“同一 runtime + sync snapshot 已成功 + 未 overBudget”时跳过这次 async reload，`sync` 四个切片应稳定改善。

## 试探内容

文件：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`

试探逻辑：

- 在 `configState` 中记住当前 `runtimeWithBindings`
- 当 `configState.runtime === runtimeWithBindings && loadMode='sync' && loaded=true && syncOverBudget=false` 时，不再立即触发 async config reload effect

## 验证

命令：

- `pnpm -C packages/logix-react exec vitest run test/integration/runtimeProviderTickServices.regression.test.tsx test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- `pnpm -C packages/logix-react typecheck:test`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-boot-resolve.test.tsx --out specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.json`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-boot-resolve.test.tsx --out specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.r2.json`
- `pnpm perf diff:triage -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/specs/103-effect-v4-forward-cutover/perf/before.local.quick.bootresolve-sync-tax.json --after /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4.bootresolve-sync-tax/specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.json --out /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4.bootresolve-sync-tax/specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.json`
- `pnpm perf diff:triage -- --before /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/specs/103-effect-v4-forward-cutover/perf/before.local.quick.bootresolve-sync-tax.json --after /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4.bootresolve-sync-tax/specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.r2.json --out /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4.bootresolve-sync-tax/specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.r2.json`

## 证据

baseline:

- `specs/103-effect-v4-forward-cutover/perf/before.local.quick.bootresolve-sync-tax.json`

after:

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.json`
- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-sync-tax.config-only.r2.json`

triage diff:

- `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.r2.json`

## 结果

### r1

`sync` 切片看起来有明显改善：

- `sync + explicit + none`: `p95 23.1ms -> 17.6ms`
- `sync + explicit + microtask`: `p95 22.4ms -> 19.3ms`
- `sync + auto + none`: `p95 20.2ms -> 18.0ms`
- `sync + auto + microtask`: `p95 20.5ms -> 17.8ms`

但同一轮里 `suspend.none` 已经出现回摆：

- `suspend + auto + none`: `p95 20.3ms -> 23.4ms`
- `suspend + explicit + none`: `p95 18.8ms -> 21.0ms`

### r2

第二轮没有复现“`sync` 全面变好”的盘面：

- `sync + explicit + none`: `p95 23.1ms -> 20.0ms`
- `sync + explicit + microtask`: `p95 22.4ms -> 18.7ms`
- `sync + auto + none`: `p95 20.2ms -> 18.5ms`
- `sync + auto + microtask`: `p95 20.5ms -> 22.4ms`，反向变差

同时 `suspend` 中位数出现更大漂移：

- `suspend + explicit + none`: `median 12.9ms -> 17.6ms`
- `suspend + auto + none`: `median 10.4ms -> 15.2ms`
- `suspend + auto + microtask`: `median 10.6ms -> 14.9ms`

## 裁决

- 这刀没有给出可复现、可稳定背书的净收益。
- `sync` 的收益在 `r1/r2` 之间不稳定，且 `suspend` 出现了不值得接受的分布漂移。
- 因此不保留实现，不合回主线代码。

## 结论

- 当前只保留结论，不保留代码。
- `react.bootResolve.sync` 仍是 watchlist，但这条“config reload skip”不是正确切口。
- 若后续重开，必须先补更细的 phase 证据，把 tax 明确切到：
  - `provider.gating`
  - `config snapshot`
  - `tick services binding`
  - `ModuleCache readSync`
  之后再开新刀。
