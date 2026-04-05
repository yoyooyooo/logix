# 2026-03-06 · O-2：action watcher 直接写 draft（watchers direct writeback）

本刀是 O-1 的第二阶段。

O-1 已经把常见纯 state watcher 从“事务外 batched writeback”推进成“并回原 action txn”。但当时 action-side writeback 仍然是：

- 调用原来的 `$.state.update / $.state.mutate` Effect；
- 只是把它搬到了 action txn 里执行；
- 仍然保留了 Effect 层的解释与通用分支开销。

这条刀继续把它压到更低：

- 对可静态识别的纯 state watcher，直接在 dispatch 路径里改 draft/recordPatch；
- 不再绕回 `BoundApi.state.*` 的通用 Effect 实现。

## 改了什么

### 1) 纯 state watcher 不再注册成 `effect`，而是注册成直接写回 handler

文件：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

- `$.state.update(...)` / `$.state.mutate(...)` 现在携带更具体的 metadata：
  - `kind='update'` + `run(prev) => next`
  - `kind='mutate'` + `run(draft) => void`
- 当 `onAction(tag).runFork/runParallelFork` 遇到这种常量纯 state write effect 时：
  - 不再注册成 `effect` handler；
  - 直接注册成 action-side `update/mutate` handler。

### 2) dispatch 路径直接应用这些 handler

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

- `applyActionStateWritebacks(...)` 现在分三类：
  - `effect`
  - `update`
  - `mutate`
- 对 `update`：
  - 直接 `prev -> next`，然后 `setStateInternal(next, '*', 'unknown', ...)`
- 对 `mutate`：
  - 直接 `mutateWithPatchPaths(prev, ...)`
  - 再 `recordStatePatch(...) + updateDraft(...)`

也就是：这条路径已经不再走通用的 `BoundApi.state.*` Effect 分支，而是直接在 dispatch 事务里落 draft/patch。

## 证据

### before（O-1）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw112.watchers-action-writeback-fusion.targeted.json`

### after（O-2）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw120.watchers-direct-writeback.targeted.json`

### diff（triage）

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw112-to-ulw120.o2-watchers-direct-writeback.targeted.json`

## 关键结果

### 1) `watchers=512` 已经稳定压进 `50ms`

- `reactStrictMode=false`
  - `p95 55.4ms -> 42.8ms`
- `reactStrictMode=true`
  - `p95 50.4ms -> 36.6ms`

### 2) strict 模式下的 `50ms` 线直接打穿到 `512`

- `p95<=50ms {reactStrictMode=true}`
  - `before=maxLevel=32`
  - `after=maxLevel=512`

### 3) non-strict 的 `50ms` 线也终于被撬开

- `p95<=50ms {reactStrictMode=false}`
  - `before=maxLevel=null`
  - `after=maxLevel=1`

虽然 non-strict 还没全线压过去，但已经不是“完全失败”。

### 4) 局部回摆存在，但不改变主结论

- 例如 `watchers=32, reactStrictMode=false` 有一次 `47ms -> 60.2ms` 的回摆。
- 但高 watcher 档位的收益远大于这类低档位噪声，主结论仍然成立：
  - 这刀对真正高压场景是有效的。

## 回归验证

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core exec vitest run test/Flow/WatcherPatterns.test.ts`
- `pnpm -C packages/logix-core test`
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw120.watchers-direct-writeback.targeted.json`
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw112.watchers-action-writeback-fusion.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw120.watchers-direct-writeback.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw112-to-ulw120.o2-watchers-direct-writeback.targeted.json`

## 裁决

- 保留这刀。
- O-1 解决的是“别离开 action txn”；O-2 解决的是“既然已经在 action txn 里，就别再绕通用 Effect 层”。
- 下一刀如果继续打 `watchers`：
  - 应该继续把这条直写 draft 路径扩展到更多 `run/runParallel` 常见纯 state write 形态；
  - 而不是再回去依赖事务外 batching。
