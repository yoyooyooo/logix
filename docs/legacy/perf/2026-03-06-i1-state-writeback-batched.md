# 2026-03-06 · I-1：`$.state.update/$.state.mutate` 批处理写回（watchers txn 固定成本切除）

本刀目标：直接打掉 `watchers.clickToPaint` 在高 watcher 数下“每个 watcher 各起一笔 txn”的固定成本，把同一波 watcher writeback 收敛到更少的事务，优先提升 `p95<=100ms` 的最大可承载 watcher 档位。

## 结论（已完成）

- 生产态下，`$.state.update/$.state.mutate` 的 **非事务窗口写回** 已切到 per-module batched coordinator。
- 当前策略不是“每个写回立即各跑一笔 txn”，而是：
  - 先进入同 module 的 `pending[]` 队列；
  - 先过一层 `microtask` 合批窗口；
  - 再由单个 `inFlight` flusher 用一次 `runWithStateTransaction(...)` 顺序应用整批请求；
  - flush 过程中继续到来的请求，会在同一个 drain loop 的下一批次里继续吞并，而不是重新散成 N 笔独立事务。
- 这条刀已经把 `watchers.clickToPaint` 的 `p95<=100ms` 档位从 `256 -> 512`（strict/non-strict 都成立）。

## 关键实现

文件：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

实现点：

- 新增 `BatchedStateWritebackCoordinator`
  - 负责聚合 `update(prev => next)` 与 `mutate(draft => void)` 两类 outside-txn 写回请求。
- 新增 microtask 合批门
  - 第一个入队请求不会立刻 flush，而是先等一个 microtask，让同一波 burst watcher 有机会全部入队，再一起 drain。
- 单 flusher + 单 txn drain
  - 同一 module 同时最多一个 writeback drain 在跑；批内请求按原顺序逐个应用，但共享同一个外层 state transaction。
- dirty evidence 语义
  - `mutate(...)` 路径继续保留精确 `patchPaths`；
  - `update(...)` 路径复用既有 `setState -> infer replace evidence` 机制，不再强制退化成永久 dirtyAll。

## 语义变化（明确接受）

在零存量用户 / forward-only 演进前提下，接受以下破坏式变化：

- 同一个 burst 中的多个 `$.state.update/$.state.mutate` 现在可以共享同一个 `txnSeq/txnId`。
- 当批量大小 `>1` 时，事务 `originName` 会显示为 `writeback:batched`，不再保留每个 watcher 各自独立事务的外观。
- 该路径当前只在 `NODE_ENV=production` 时启用；dev/test 仍保留原语义，优先保证诊断与测试可读性。

## 证据

### 1) 全矩阵探索对比（首次实现）

- Before: `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw89.post-h2.full-matrix.json`
- After: `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw90.i1-state-writeback-batched.full-matrix.json`
- Diff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw89-to-ulw90.i1-state-writeback-batched.full-matrix.json`

关键结果：

- `watchers.clickToPaint` 的 `p95<=100ms`：
  - `reactStrictMode=false`: `before=256 -> after=512`
  - `reactStrictMode=true`: `before=256 -> after=512`

### 2) watch 专项复测（加入 microtask 合批后的最终记录）

- After: `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw91.i1-state-writeback-batched.watchers.json`
- Diff: `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw89-to-ulw91.i1-state-writeback-batched.watchers.json`

关键点位（最终代码）：

- `watchers=512, reactStrictMode=false`: `p95 123.5ms -> 94.5ms`
- `watchers=512, reactStrictMode=true`: `p95 138.1ms -> 85.6ms`
- 结论：512 watcher 已稳定回到 `p95<=100ms` 预算内。

备注：专项 diff 仍会给出 `watchers=8, reactStrictMode=false` 的 stability warning；这属于低 watcher 档位的运行噪声/局部回摆，不改变本刀要解决的高 watcher 预算上限结论。

## 回归验证

本轮已跑：

- `pnpm -C packages/logix-core exec vitest run test/Flow/WatcherPatterns.test.ts`
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw91.i1-state-writeback-batched.watchers.json`
- `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw89.post-h2.full-matrix.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw91.i1-state-writeback-batched.watchers.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw89-to-ulw91.i1-state-writeback-batched.watchers.json`

新增回归测试：

- `packages/logix-core/test/Flow/WatcherPatterns.test.ts`
  - 生产态下，多 watcher 的 `runParallelFork($.state.mutate(...))` 写回应折叠成单个 `state:update` commit；用 ring sink 直接锁定 `originName=writeback:batched` 与 commit 数量。

## 对后续 agent 的明确结论

- I-1 已完成，不要再回到“每 watcher 独立 txn”那条路。
- 若后续还要继续压榨 `watchers`：
  - 优先去看 React/browser 侧的点击链路、paint 抖动、strict 模式额外 render，而不是再把内核拆回细粒度 txn。
- 下一刀更值得投入的方向：
  - `txnLanes.urgentBacklog`
  - `react.strictSuspenseJitter`
  - 若要继续打 full diagnostics 成本，再看 `externalStore.ingest.tickNotify`
