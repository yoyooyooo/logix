# 2026-03-14 · C-3：`react.bootResolve.sync` readSync scope-make fastpath 试探失败

## 目标

验证 `react.bootResolve.sync` 的小固定税，是否部分来自
`ModuleCache.readSync(...)`
里对 `Scope.make()` 也走了一次 `runtime.runSync(...)`。

假设：

- `Scope.make()` 本身不依赖 runtime env
- 若把 `readSync` 冷启动里的 `Scope.make()` 改成 `Effect.runSync(...)`
- 应该能在不动 `factory(scope)` 的前提下，给 `sync` 冷启动收回一小段固定税

## 试探内容

文件：

- `packages/logix-react/src/internal/store/ModuleCache.ts`

试探逻辑：

- 仅把 `readSync(...)` 冷启动分支中的：
  - `this.runtime.runSync(Scope.make())`
- 改成：
  - `Effect.runSync(Scope.make())`

不改：

- `factory(scope)` 的执行方式
- `useModule` / `useModuleRuntime`
- `RuntimeProvider`
- `suspend` / `defer` 路径

最终裁决后，runtime 改动已全部回退；当前工作树只保留证据和文档。

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/vitest/vitest.mjs run packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx
```

结果：

- `Test Files  3 passed (3)`
- `Tests  12 passed (12)`

### 2. typecheck

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/typescript/bin/tsc -p packages/logix-react/tsconfig.test.json --noEmit
```

结果：

- 成功退出
- 无 TS 错误

### 3. browser quick baseline

before：

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-current.json`

after：

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-scope-make-fastpath.json`

diff：

- `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-current__scope-make-fastpath.json`

## 结果

### `sync` 直接看

`impl/tag` 两条指标在这个 suite 里同步变化，以下只列 `impl`：

- `sync + explicit + none`
  - `median 9.7ms -> 14.9ms`
  - `p95 18.8ms -> 19.1ms`
- `sync + auto + none`
  - `median 9.8ms -> 15.3ms`
  - `p95 18.1ms -> 19.9ms`
- `sync + explicit + microtask`
  - `median 9.7ms -> 10.6ms`
  - `p95 19.1ms -> 19.6ms`
- `sync + auto + microtask`
  - `median 10.0ms -> 14.4ms`
  - `p95 19.7ms -> 19.4ms`

结论：

- `sync` 没有形成稳定净收益
- `none` 两个切片的中位数直接恶化到 `~15ms`
- `microtask` 也没有给出可复现的改善

### 额外副作用

这刀还误伤了 `suspend`：

- `suspend + auto + none`
  - `median 9.7ms -> 14.6ms`
  - `p95 17.6ms -> 19.6ms`
- `suspend + explicit + none`
  - `median 10.8ms -> 11.5ms`
  - `p95 17.7ms -> 18.8ms`

说明：

- 这个切口不只没帮 `sync`
- 还把 `suspend` 一起拉差

## 裁决

- 这刀不保留
- `readSync` 的 `Scope.make()` 入口不是当前 `react.bootResolve.sync` 的正确切口
- 当前只保留证据和结论，不保留代码

## 当前结论

- `react.bootResolve.sync` 仍是 watchlist
- 但当前已经明确排除：
  - `config reload skip`
  - `readSync scope-make fastpath`

若后续继续重开，优先顺序应是：

1. 先补 phase 证据，把税分到：
   - `provider.gating`
   - `config snapshot`
   - `ModuleCache.readSync`
   - `module tag resolve`
2. 再决定是否值得继续动 runtime 代码
