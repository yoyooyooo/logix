# 2026-03-14 · C-6：`react.bootResolve` observer-ready evidence correction

## 目标

基于 `C-4 phase evidence` 与 `C-5 provider.gating idle binding failed`，重新检验
`react.bootResolve`
这条 suite 到底在测什么。

关键怀疑：

- 旧版 `waitForBodyText(...)` 用的是 `requestAnimationFrame` 轮询
- 对于本来就能在同一事件循环内完成的 boot/resolve，它会平白吃掉一帧地板
- 这会把 `~1ms` 级的真实启动，测成 `~10ms ~ 20ms`

## 做法

文件：

- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.wait.ts`
- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.wait.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`

改动：

- 把 `waitForBodyText(...)` 从：
  - 同步首读 + `requestAnimationFrame` 轮询
- 改成：
  - 同步首读 + `MutationObserver` 监听 + timeout

这是一把 benchmark 语义修正，不是 runtime 优化。

## TDD

先写失败测试：

- `react-boot-resolve.wait.test.tsx`
- 断言：
  - 当 `requestAnimationFrame` 不触发
  - 文本只通过 DOM mutation 出现
  - `waitForBodyText(...)` 也必须完成

旧 helper 在这条测试上会直接 timeout。

改完 helper 后：

- 浏览器测试转绿

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/vitest/vitest.mjs run packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.wait.test.tsx packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx
```

结果：

- 全部通过

### 2. typecheck

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/typescript/bin/tsc -p packages/logix-react/tsconfig.test.json --noEmit
```

结果：

- 成功退出
- 无 TS 错误

### 3. browser quick

证据：

- before：
  - `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-phase-evidence.r2.json`
- after：
  - `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-observer-ready.json`
- diff：
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-phase-evidence__observer-ready.json`

结果摘要：

- `sync + explicit + none`: `p95 18.4ms -> 1.5ms`
- `sync + auto + none`: `p95 18.5ms -> 7.4ms`
- `sync + explicit + microtask`: `p95 19.2ms -> 1.3ms`
- `sync + auto + microtask`: `p95 18.3ms -> 1.4ms`
- `suspend` 四个切片也都一起落到 `~1.5ms ~ 1.8ms`

### 4. browser soak

证据：

- before：
  - `specs/103-effect-v4-forward-cutover/perf/after.local.soak.bootresolve-phase-evidence.r2.json`
- after：
  - `specs/103-effect-v4-forward-cutover/perf/after.local.soak.bootresolve-observer-ready.json`
- diff：
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.soak.bootresolve-phase-evidence__observer-ready.json`

结果摘要：

- `sync + explicit + none`: `p95 19.4ms -> 1.3ms`
- `sync + auto + none`: `p95 19.3ms -> 1.4ms`
- `sync + explicit + microtask`: `p95 19.4ms -> 1.2ms`
- `sync + auto + microtask`: `p95 18.9ms -> 1.2ms`
- `suspend` 四个切片也全部落到 `~1.4ms ~ 2.0ms`

## 结论

- 旧 `react.bootResolve` suite 的主税点不是 runtime
- 主要是 `requestAnimationFrame` 轮询带来的帧地板伪影
- `react.bootResolve.sync` 的“小固定税”结论应撤销

## 当前裁决

- 保留这把 evidence correction
- `react.bootResolve.sync` 从默认 watchlist 移除
- `C-2 / C-3 / C-5` 的失败记录仍保留，但应理解为：
  - 它们是在旧 suite 语义下做的试探
  - 不应再按当前主线继续重开
