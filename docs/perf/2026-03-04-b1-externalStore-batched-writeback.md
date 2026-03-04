# 2026-03-04 · B-1 externalStore 写回批处理（in-flight batching）

目标：把 raw external store 的持续写回从“每次 callback 直接开 txn”改为“经 per-module coordinator 合并后写回”，减少 txn 固定成本，直接压 `externalStore.ingest.tickNotify`。

## TL;DR（结论先行）

- 已完成：`packages/logix-core/src/internal/state-trait/external-store.ts` 引入 per-module `ExternalStoreWritebackCoordinator`，对 raw externalStore 写回做 in-flight window 合并（同 module 同时最多 1 笔 writeback txn in-flight）。
- 关键收益：burst 更新时写回 txn 数显著减少，`externalStore.ingest.tickNotify` 的 `full/off<=1.25` 在 `watchers=512` 可通过（见下方证据）。
- 不破坏语义的硬约束仍成立：事务窗口禁 IO；诊断事件 slim 且可序列化；`instanceId/txnSeq/opSeq` 不新增随机源。

## 证据路标（PerfReport）

说明：本刀只针对 `externalStore.ingest.tickNotify` 定向跑 quick。

- before（baseline）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw55.b1-externalStore-baseline.json`
- after（本刀实现后）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw56.b1-externalStore-batched-writeback.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw57.b1-externalStore-batched-writeback.json`

待补（硬结论口径，clean workspace）：
- [ ] clean after + diff（避免 `git.dirty=true` 带来的可比性争论）。

## 改动点（实现细节）

代码落点：
- `packages/logix-core/src/internal/state-trait/external-store.ts`

### 1) 新增 per-module writeback coordinator

- 共享粒度：`WeakMap<RuntimeInternals, Coordinator>`（同 module instance 共享）。
- 合并载体：`pendingWrites: Map<fieldPath, request>`（同字段 burst 最终以 last-write-wins 覆盖）。
- flush 策略：single-flusher（`inFlight` 锁）。
  - 第一个 caller 负责 drain 队列并在当前 fiber 内循环 flush。
  - 其它 caller 只 enqueue，若发现 `inFlight=true` 则直接返回。
  - 不额外引入 microtask/tick 边界，避免把单次更新 latency 变差。

### 2) 批处理写回的 txn 形态

- 批次里只要存在 `priority=normal`，该 txn 统一按 normal commit（避免 urgent 被拖到 low lane）。
- originName：
  - 单笔：`origin.name=fieldPath`（保持可诊断直觉与既有测试锚点）。
  - 多笔：`origin.name='externalStore:batched'`。

### 3) applyWritebackBatch 的分配与读取优化

- hot-path（batch.size===1）：
  - 只读一次 `state.read`，只做一次 `mutative.create`，只记录一次 patch。
- multi-field：
  - 先用旧 state 计算 `changes[]`（跳过 isEqual 的 noop），避免无意义 draft 更新与 patch 记录。
  - 只做一次 `mutative.create`，在一个 draft 内 set 多个 path。

### 4) Module-as-Source 保持立即 writeback

Module-as-Source（DeclarativeLinkRuntime.applyForSources）路径保持“立即 writeback”（不走 batching）。

原因：TickScheduler fixpoint 依赖 `applyValue` 在同 tick 内立刻产生 commit 并回灌 queue；延迟会引入跨模块 tearing 风险。

## 为什么这刀有效

之前的成本结构是“每次 external callback = 1 次 txn 固定成本”，在高频输入（burst）场景下被放大：
- 每笔 txn 都要跑 commit/diagnostics 相关的固定逻辑（即使内容很小）。
- 同一时段 burst 变化会造成 txn 级别的重复工作。

本刀把 burst 更新合并进更少的 txn，把“每笔 txn 的固定成本”在 batch 内摊薄，直接打穿 `externalStore.ingest.tickNotify` 的 full/off 相对预算。

## 回归验证（本次实际跑过并通过）

类型与单测：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-react typecheck:test`

Browser perf-boundaries（最小闭环）：
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`

## 剩余问题与下一刀（不计代价）

1. 适用面更广的下一刀仍是 list/form：
- `C-1：Ref.list(...) 自动增量（txn evidence -> changedIndices）`：让 list-scope validate 即使被 `Ref.list(...)` 触发，也能从 txn 的 dirty evidence 推导出 `changedIndices`，不再要求调用方拆成 item validate。

2. externalStore 仍可继续榨干（如果 future 复发）：
- 把 in-flight window 升级为显式 window（microtask 或 budgetMs），进一步提高 batch 覆盖率（代价：会改变可见时序/latency）。
- 或把 coordinator 做成可选策略（vNext `StateTrait.externalStore({ writeback: ... })`），把“吞吐优先 vs latency 优先”的裁决外显为 API（零存量用户模式下允许破坏式替换）。

