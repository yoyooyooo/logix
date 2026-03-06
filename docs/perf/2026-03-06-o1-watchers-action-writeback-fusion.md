# 2026-03-06 · O-1：纯 state watcher 写回并回原 action txn（watchers action-writeback fusion）

本刀目标：继续打 `watchers.clickToPaint`，但不再靠 outside-txn batching 补救，而是把最常见的一类 watcher 直接重新编译回原 action transaction。

## 问题判断

此前即使有 I-1，`runParallelFork($.state.update/mutate(...))` 这类 watcher 仍然存在结构性损耗：

- 它们先通过 `FlowRuntime.runParallel` 在 watcher 层并发运行；
- 然后每个 watcher 的 state write 再走 outside-txn writeback；
- I-1 只能在外层做 batched writeback，砍掉的是“多笔 txn 的固定成本”，但 watcher 本身仍然先离开了原 action txn。

这说明 I-1 只是补救，不是最优解。

真正更好的路径是：

- 对于 `onAction(tag)` 上那些 **纯 state write** 的 watcher；
- 直接把它们注册成 action-side writeback，和 primary reducer 一样在原 dispatch txn 内顺序执行；
- 不再先 fork watcher，再在事务外回写。

## 改了什么

### 1) `$.state.update / $.state.mutate` 打上 direct-state-write 标记

文件：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

- `state.update(...)` / `state.mutate(...)` 返回的 Effect 现在会带一个内部标记：
  - 表示“这是纯 state write effect，本身不该被当成普通 IO watcher”。

### 2) `runFork / runParallelFork` 针对 `onAction(tag)` + 纯 state write 做 setup-time 降解

文件：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

- 当满足以下条件时：
  - trigger 是 `onAction(tag)`（也就是 `triggerName` 明确是 action tag）
  - effect 是常量的 direct-state-write effect
- 不再真正创建 flow watcher fiber；
- 而是直接注册到 `registerActionStateWriteback(tag, ...)`。

### 3) dispatch 内新增 action-side writeback 链

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

- 在 primary reducer 之后，新增 `applyActionStateWritebacks(action, analysis)`；
- 所有通过上述快路径注册的纯 state write watcher，都会在 **同一个 dispatch txn** 里顺序执行。

### 4) runtime internals 增加内部注册口

文件：

- `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

新增内部能力：
- `registerActionStateWriteback(tag, run)`

这是 internal-only 能力，不对外暴露。

## 语义变化（明确接受）

在零存量用户 / forward-only 模式下，接受以下新默认：

- `onAction(tag).runFork($.state.update/mutate(...))`
- `onAction(tag).runParallelFork($.state.update/mutate(...))`

当 effect 是纯 state write 且可静态识别时，不再真的“fork + 并发 watcher + 事务外回写”，而是直接并回原 action txn。

对外可见变化：

- `state:update.originName` 从 `writeback:batched` 回到 `dispatch`
- 同一个 action 的多个纯写回 watcher，不再形成独立 writeback txn

## 证据

### before（I-1 后的 targeted watchers）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw91.i1-state-writeback-batched.watchers.json`

### after（action-writeback fusion）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw112.watchers-action-writeback-fusion.targeted.json`

### triage diff

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw91-to-ulw112.o1-watchers-action-writeback-fusion.targeted.json`

说明：diff 是 triage 口径，因为穿过了后续 matrix hash 变化；硬结论以 after 报告和 threshold 为准。

## 关键结果

### 1) 高 watcher 数直接打穿

- `reactStrictMode=false, watchers=512`
  - `p95 94.5ms -> 55.4ms`
- `reactStrictMode=true, watchers=512`
  - `p95 85.6ms -> 50.4ms`

也就是说：`512 watcher` 已经从接近 `100ms` 级压到了 `50ms` 边缘。

### 2) strict 模式下的 `50ms` 门第一次不再全灭

- `p95<=50ms {reactStrictMode=true}`
  - `before=maxLevel=null`
  - `after=maxLevel=32`

虽然还没把 strict 全线打穿，但这是第一次把 `50ms` 门从“完全失败”推进到“至少一部分档位通过”。

### 3) `100ms` 门保持全绿

- `p95<=100ms` 继续在 `watchers=512` 通过。

## 回归验证

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core exec vitest run test/Flow/WatcherPatterns.test.ts`
- `pnpm -C packages/logix-core test`
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw112.watchers-action-writeback-fusion.targeted.json`
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw91.i1-state-writeback-batched.watchers.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw112.watchers-action-writeback-fusion.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw91-to-ulw112.o1-watchers-action-writeback-fusion.targeted.json`

现有回归已同步更新：

- `packages/logix-core/test/Flow/WatcherPatterns.test.ts`
  - 生产态 burst watcher 写回现在仍应只有一个 `state:update` commit；
  - 但 origin 已从 `writeback:batched` 变成 `dispatch`，因为写回已回到原 action txn。

## 裁决

- 这刀值得保留，而且比 I-1 更接近最终形态。
- I-1 解决的是“事务外 writeback 的固定成本”；O-1 解决的是“本不该离开 action txn 的纯 state watcher 根本不该出事务”。
- 下一刀如果继续打 `watchers`：
  - 优先扩展这条融合面，从 `runFork/runParallelFork + 常量纯 state write` 继续覆盖到更多常见写法；
  - 而不是再回去抠 outside-txn batching 的边角料。
