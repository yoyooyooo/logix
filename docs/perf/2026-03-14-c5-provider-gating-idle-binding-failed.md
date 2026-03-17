# 2026-03-14 · C-5：`provider.gating` idle binding fastpath 试探失败

## 目标

基于 `C-4 bootresolve phase evidence`，继续收口 `react.bootResolve.sync` 的主税点。

当时最可疑的点是：

- `provider.gating` 是 phase probe 里最大的单段
- `config snapshot` 和 `moduleTag resolve` 都接近 `0ms`

进一步排查时，发现：

- `useLayerBinding(enabled=false)` 在默认路径下会多触发一轮 render

于是本刀验证：

- 如果把这轮 idle rerender 去掉
- `react.bootResolve.sync` 是否会稳定向好

## 试探内容

文件：

- `packages/logix-react/src/internal/provider/runtimeBindings.ts`

临时改动：

- `useLayerBinding(...)` 的初始 state
  - 从 `layer`
  - 改成 `enabled ? layer : undefined`

配套验证测试：

- 临时新增 `runtime-provider-useLayerBinding.idle.test.tsx`
  - 证明 `enabled=false` 时当前实现确实会多跑一轮 render

最终裁决后，runtime 改动与临时测试已全部回退；当前工作树只保留证据与文档。

## 验证

### 1. 失败回归先证实问题存在

临时测试结论：

- `useLayerBinding(enabled=false)` 当前实现确实会从 `renderCount=1` 走到 `renderCount=2`

但这只证明“有额外 render”，还不能证明它就是当前 suite 的主税点。

### 2. 邻近 tests 与类型门

在临时 patch 下，以下测试都通过：

- `runtime-bootresolve-phase-trace`
- `runtime-logix-chain`
- `runtimeProviderTickServices.regression`
- `runtimeProviderSuspendSyncFastPath`

类型门：

- `packages/logix-react/tsconfig.test.json` 通过

## 证据

quick：

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-provider-gating-cut.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-phase-evidence__provider-gating-cut.json`

soak：

- `specs/103-effect-v4-forward-cutover/perf/after.local.soak.bootresolve-provider-gating-cut.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.soak.bootresolve-phase-evidence__provider-gating-cut.json`

before 基线：

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-phase-evidence.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/after.local.soak.bootresolve-phase-evidence.r2.json`

## 结果

### quick

`sync` 视角下：

- `sync + explicit + none`
  - `median 13.3ms -> 13.2ms`
  - `p95 18.4ms -> 18.0ms`
- `sync + auto + none`
  - `median 14.0ms -> 12.9ms`
  - `p95 18.5ms -> 19.6ms`
- `sync + explicit + microtask`
  - `median 12.2ms -> 9.9ms`
  - `p95 19.2ms -> 19.0ms`
- `sync + auto + microtask`
  - `median 10.0ms -> 10.5ms`
  - `p95 18.3ms -> 24.8ms`

结论：

- quick 已经是混合收益
- 尤其 `sync + auto + microtask` 出现明显回退

### soak

`sync` 视角下：

- `sync + explicit + none`
  - `median 11.0ms -> 9.9ms`
  - `p95 19.4ms -> 19.2ms`
- `sync + auto + none`
  - `median 14.0ms -> 14.0ms`
  - `p95 19.3ms -> 19.2ms`
- `sync + explicit + microtask`
  - `median 14.8ms -> 16.4ms`
  - `p95 19.4ms -> 23.4ms`
- `sync + auto + microtask`
  - `median 14.6ms -> 15.5ms`
  - `p95 18.9ms -> 19.7ms`

结论：

- `none` 档位只有很小的改善
- `microtask` 两个 sync 切片都变差
- 不符合“稳定净收益”的保留标准

## 裁决

- 这刀不保留
- `provider.gating` 里虽然确实有一轮 idle binding extra render
- 但把它移除后，没有给 `react.bootResolve.sync` 带来稳定净收益

## 当前结论

`react.bootResolve.sync` 当前已明确排除：

- `config reload skip`
- `readSync scope-make fastpath`
- `provider.gating idle binding fastpath`

下一轮若继续，必须重新审视 `provider.gating` 的其它组成部分，不能再重复切这条 idle binding 线。
