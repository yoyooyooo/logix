---
title: 事务窗口与 Tick 参考系教程 · 剧本集（tickSeq/txnSeq/opSeq 从 0 到 1）
status: draft
version: 1
---

# 事务窗口与 Tick 参考系教程 · 剧本集（tickSeq/txnSeq/opSeq 从 0 到 1）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味与平台/工具开发对齐。
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

你会在 Runtime 内部同时看到 `txnSeq/txnId`、`tickSeq`、`opSeq` 等多个“序号/锚点”。它们不是重复造轮子，而是一套彼此正交的**参考系**：每个锚点都对应一种必须被稳定化的语义边界。

本文目标：把它们放进同一个坐标系，从“入口 → 事务 → tick → React/Devtools”的 0→1 链路讲透，并给出可复用的剧本与排障清单。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速建立“事务窗口 vs tick”的正确心智模型：

1. 读 SSoT（术语/约束的最终口径）：
   - 逻辑入口/事务窗口：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.06-statetransaction-entry.md`
   - Flow 侧如何拆分长链路（多入口、多事务）：`docs/ssot/runtime/logix-core/api/03-logic-and-flow.03-flow.md`（关注事务窗口相关章节）
2. 读实现小抄（为什么要 tick，为什么要 HostScheduler）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`（2/3/4/5）
3. 读 073（ExternalStore + tick 的最小闭环与诊断口径）：
   - `specs/073-logix-external-store-tick/quickstart.md`
   - `specs/073-logix-external-store-tick/contracts/diagnostics.md`
4. 看代码锚点（把“口径”对齐到“真实实现”）：
   - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
   - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
   - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
   - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
   - `packages/logix-core/src/internal/state-trait/external-store.ts`
5. 对照测试（可运行说明书）：
   - `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`
   - `packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts`
   - `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

## 1. 心智模型（把这些序号放进同一个坐标系）

### 1.1 两条主线：事务（txn）与 tick（tickSeq）

把 Runtime 想象成两条正交的主线：

- **事务线（StateTransaction / txnSeq）**：描述“某次逻辑入口导致的状态演进”。目标是**0/1 次对外提交**与**可解释的写入证据**（dirtySet/patches/origin）。
- **tick 线（TickScheduler / tickSeq）**：描述“对外可观察快照的推进”。目标是**跨模块一致性**与**无 tearing 的订阅真相源**（React/Devtools/测试都只认同一个 tick-token）。

它们的关系是：

> 事务负责“把某个入口内的多次写入收敛成 0/1 次提交”，tick 负责“把多个模块的提交收敛成一个对外原子快照”。

换句话说：事务是**模块内原子性**，tick 是**跨模块原子性**。

### 1.2 三个常见锚点：`tickSeq` / `txnSeq` / `opSeq`

你会经常在日志/诊断/Devtools 里看到这三个：

- `tickSeq`：RuntimeStore 的快照 token（全局单调递增）。
  - 语义：**“这次 render/订阅读到的是哪一个全局快照”**。
  - 目的：消灭 tearing（同一次 render 读到来自不同快照的混合值）。
  - 真相源：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（`getTickSeq` / `commitTick`）。
- `txnSeq` / `txnId`：模块实例内的事务序号与确定性 id。
  - 语义：**“这次状态提交属于哪个逻辑入口/事务窗口”**。
  - 目的：把 debug 事件/patch/dirtySet/commitMeta 归到同一笔事务上，支撑解释链路与回放。
  - 真相源：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（`beginTransaction` / `commit`）。
- `opSeq`：运行期 operation 的序号（EffectOp/RunSession 维度）。
  - 语义：**“这次事务/提交由哪次 operation 触发”**（用于把 state/update 与更长链路的 effect op trace 对齐）。
  - 目的：去随机化、稳定归因、在 evidence/diff 中消除“看似不同其实只是运行顺序噪声”的漂移。
  - 真相源：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`（`RunSession.local.nextSeq('opSeq', key)`）。

补充：`instanceId` 是这些锚点的前提（`txnId/eventId` 等通常由它派生）。当前默认 `instanceId = i${n}`（创建顺序决定），可通过 options 显式注入以获得更强的跨运行稳定性：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`。

### 1.3 “事务窗口”和“操作窗口”不是一回事

SSoT 里会把“事务窗口（Transaction Window）”和“操作窗口（Operation Window）”区分开：

- **事务窗口**：实现层语义——从 `beginTransaction` 到 `commit`（通常由一次逻辑入口触发）。
- **操作窗口**：产品/业务叙事语义——一次用户动作触发的收敛窗口；通常与一次事务对齐，但不强制（例如一次用户动作可能触发多个逻辑入口，形成多笔事务）。

实践记忆：当你在做工具/平台/解释链路时，“事务窗口”是可观测的硬边界；“操作窗口”更像是上层叙事的聚合边界。

### 1.4 tick 与 “fixpoint” 的关系：稳定化 vs tearing

在 073 的语境里要小心两种“看起来都像一致性问题”的东西：

- **tearing**：同一次 render/commit 读到来自不同快照 token 的混合状态 —— 这是订阅真相源破坏，必须在 RuntimeStore 层消灭。
- **partial fixpoint（业务层未完全收敛）**：tick 内因预算/循环等原因推迟了部分非关键工作，导致某些派生结果在下一 tick 才补齐 —— 这是可接受的软降级，但必须可解释（`trace:tick`/`warn:*`）。

因此你会看到一个非常重要的约束：

> 允许 `result.stable=false`（业务层未完全收敛），但不允许 tearing（订阅真相源混乱）。

## 2. 核心链路（从 0 到 1：入口 → 事务 → tick → 对外快照）

这一节按真实代码路径把整条链路串起来。

### 2.1 入口（Logical Entry）：谁会开启一笔事务？

SSoT 明确：所有显式进入 ModuleRuntime 的入口都被视为“逻辑入口”，每次进入都会开启新的 StateTransaction。典型入口包括：

- `dispatch` / `ModuleHandle.dispatch` / `handle.actions.xxx(...)`
- `StateTrait.externalStore` 的写回入口（见 2.5）
- “service-callback” 写回入口（例如 IO 完成后 dispatch 结果 action）
- Devtools/time-travel/replay 等入口

最终口径见：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.06-statetransaction-entry.md`

### 2.2 事务（StateTransaction）：入口内多次写入 → 0/1 次提交

事务的核心语义可以用三句话概括：

1. **入口内可以多次写 draft**（例如多次 `$.state.update`），这些写入对外不可见。
2. **提交时最多写 SubscriptionRef 一次**（0 次：无变化；1 次：有变化）。
3. **提交会生成可解释的证据**（origin/txnSeq/dirtySet/patches，可裁剪、可分级）。

对应实现：

- `beginTransaction`：递增 `txnSeq` 并生成确定性 `txnId = ${instanceId}::t${txnSeq}`。
- `updateDraft` / `recordPatch`：只改上下文中的 draft 与记录。
- `commit`：
  - 若 `Object.is(finalState, baseState)` 则 0 commit（不写 SubscriptionRef，不发 state:update）。
  - 否则写 `SubscriptionRef.set(stateRef, finalState)` 一次，并返回聚合后的 `StateTransaction`（含 dirtySet/patchCount/patchesTruncated 等）。

代码锚点：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

### 2.3 提交后发生什么：ModuleRuntime.onCommit → selectorGraph → TickScheduler

当模块发生提交（commit != 0）后，会进入一条“把提交对齐到 tick 参考系”的路径：

1. 生成 `StateCommitMeta`（含 `txnSeq/txnId/origin/priority` 等）。
2. `selectorGraph.onCommit(...)`：更新 readQuery topic 的版本/依赖（使 selector 订阅能按 topic 精细唤醒）。
3. `scheduler.onModuleCommit(...)`：把模块提交入队，并“点亮” module-topic。

这一步通常也会把 `opSeq` 一并带上（用于归因）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

> 重要边界：即使模块内部 stateRef 已经更新，React/Devtools 仍然以 RuntimeStore 的 tick 快照为准；tickSeq 不推进，就不会对外 flush。

### 2.4 TickScheduler：把“很多提交/很多 dirty topic”收敛为一个 tick

TickScheduler 做两类事情：

1. **调度**：把“同一轮 microtask 内密集发生的变更”合并到一次 tick（coalesce）。
2. **稳定化**：在预算内尽量 drain backlog；若超预算则软降级（`stable=false`），把剩余工作 requeue 到下一 tick。

调度边界：

- 默认 microtask：更容易 coalesce。
- 必要时强制 macrotask（yield-to-host）：预算触顶、cycle_detected、microtask starvation 等。

稳定化与提交：

- tick 内会调用 `store.commitTick({ tickSeq, accepted })` 提交 RuntimeStore 快照；
- **先 commit tickSeq，再 notify listeners**（避免 tearing：订阅者醒来时必须能读到新 tickSeq 对应的快照）。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（`scheduleTick` / `flushTick` / `onModuleCommit`）
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（`commitTick` 的“先更新 token 再通知”语义）

### 2.5 ExternalStore trait：Signal Dirty → pull snapshot → 写回事务 → tick

这是把外部输入纳入 tick 参考系的关键样例（073）：

1. `getSnapshot()` 必须同步、可重复调用（throw 会 fuse 并给出诊断）。
2. `subscribe(signal)` 的 listener **只负责 signal**（不携带 payload、不做 IO）。
3. 收到 signal 后：
   - 先 `microtask` 让出，合并 burst（coalesce）；
   - 再 pull 最新 snapshot；
   - 最后用 `runWithStateTransaction` 写回到模块 state（0/1 commit 语义仍成立）。

实现还提供一个很关键的边界保护：

- `readSnapshotOrFuse` 强制将 `TaskRunner.inSyncTransactionFiber=false`，避免 `getSnapshot()` 在事务窗口内被调用（事务窗口禁止 IO/等待/副作用）。

代码锚点：`packages/logix-core/src/internal/state-trait/external-store.ts`

## 3. 剧本集（用例驱动：你遇到的现象应该怎么解释/怎么修）

### A) “我 dispatch 了一次 action，为什么 UI 只更新了一次？”

这是预期行为：一次逻辑入口只允许 0/1 次提交。

常见误区是把“入口内的多次 `$.state.update`”当作“对外多次 commit”。实际上它们都只是 draft 写入，最后在 `StateTransaction.commit` 处收敛。

如果你希望 UI 呈现出“loading=true → loading=false”两次可观察变化，你需要把这条链路拆成**多入口**（多事务），详见剧本 B。

### B) 长链路（发起 IO + 等待 + 写回）：如何拆成多事务

反例（不要这样写）：在同一事务窗口内等待 IO/`Effect.sleep`，会导致：

- 事务 durationMs 被拉长；
- 对外只能看到最后一次提交（中间态不可见）；
- 更容易触发“事务窗口禁止 IO”的约束冲突（未来更严格时会直接门禁）。

推荐模式：**长链路 = 多次入口（多笔事务）**。你有两条常用路线：

1. 手写结果 action：`refresh → refreshSuccess/refreshFailed`（每个 action 都是一次入口）。
2. 使用 Task Runner sugar：`runExhaustTask/runLatestTask/...`（由 runtime 自动拆 pending/IO/writeback）。

SSoT 示例与语义解释见：`docs/ssot/runtime/logix-core/api/03-logic-and-flow.03-flow.md`

### C) ExternalStore：为什么只 signal 不传 payload？

目的不是“少传点数据”，而是确保：

- 对外可观察单位始终是 tick（tickSeq token）；
- burst 变化能自然 coalesce；
- snapshot 的真相源只有一个：`store.getSnapshot()` 的当前值，而不是 listener 的 payload（payload 很容易携带过期值或放大队列）。

你可以把它理解为：

> listener 只做“点灯”，tick flush 才做“读表 + 写回”。

实现细节（含 atomic init 语义、防丢更新）见：`packages/logix-core/src/internal/state-trait/external-store.ts`

### D) “稳定化失败（stable=false）”是不是 bug？UI 会不会 tearing？

`stable=false` 不是 tearing。它表达的是：本 tick 因预算/循环等原因没有完全 drain backlog，系统选择暴露 partial fixpoint 并在下一 tick 追赶。

你应该做的是：

1. 先看 `trace:tick`（start/settled/budgetExceeded）确认 degradeReason 与 backlog 类型；
2. 若出现 `warn:priority-inversion`，优先检查“有 UI 订阅者的链路是否被标成 nonUrgent”或预算是否过紧；
3. 通过收敛 deps/selector、拆分长链路、或调整优先级/预算解决长期 unstable。

诊断口径见：`specs/073-logix-external-store-tick/contracts/diagnostics.md`

### E) “为什么会 forced macrotask / yield-to-host？”

tick 默认在 microtask boundary 合并触发；当出现反饥饿风险或降级原因时，会强制切到 macrotask（yield-to-host）续跑，以避免长时间占用主线程/测试不确定性。

你可以通过 `trace:tick.schedule.forcedMacrotask` 与 `reason` 解释触发原因（budget/cycle_detected/microtask_starvation）。

实现与测试锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts`

### F) “我明明 commit 了状态，为什么 tickSeq 不走、React 不刷新？”

典型根因：TickScheduler service 在当前 fiber Env 不可见（或被错误组装），导致 `ModuleRuntime.onCommit` 无法调用 `scheduler.onModuleCommit`。

在 dev + diagnostics!=off 时，ModuleRuntime 会给出结构化 diagnostic：

- `code: tick_scheduler::missing_service`
- message/hint 会提示你检查 AppRuntime baseLayer + RootContext wiring。

实现锚点：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

### G) ExternalStore.getSnapshot() 抛错：为什么会 fuse？

因为 `getSnapshot` 是“对外一致性的最底层真相源”，必须同步且最好不抛错；一旦抛错，继续 sync 只会制造更多不可解释状态，所以 trait 会 fuse（停止同步）并发 diagnostic。

实现锚点：`packages/logix-core/src/internal/state-trait/external-store.ts`（`external_store::snapshot_threw`）

## 4. 代码锚点（Code Anchors）

- 术语与边界（SSoT）：
  - `docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.06-statetransaction-entry.md`
  - `docs/ssot/runtime/logix-core/api/03-logic-and-flow.03-flow.md`
- StateTransaction（事务 0/1 commit、dirtySet/patches）：
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- TickScheduler（调度、预算、降级、yield-to-host）：
  - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- RuntimeStore（tickSeq 快照 token、topic 版本与订阅）：
  - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- ModuleRuntime.onCommit → selectorGraph → scheduler：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- opSeq（operation 序号与归因）：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- ExternalStore trait（signal→pull→writeback）：
  - `packages/logix-core/src/internal/state-trait/external-store.ts`

## 5. 验证方式（Evidence）

当你改动了事务/tick 的核心链路，至少应覆盖三类证据：

1. **稳定化语义**：TickScheduler 在预算/循环/饥饿情况下仍能推进 tickSeq，并保持可解释的降级原因。
   参考用例：`packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`、`packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts`
2. **无 tearing**：React/selector 在同一次 render 中只读取单一 tickSeq 对应快照。
   参考用例：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
3. **外部输入闭环**：ExternalStore signal 不丢更新、原子 init 语义成立，且 getSnapshot 抛错可诊断。
   参考实现：`packages/logix-core/src/internal/state-trait/external-store.ts`（T016 注释）

> 提醒：测试里不要用 watch；优先用 `pnpm test:turbo` 或包内 `pnpm -C packages/logix-core test` / `pnpm -C packages/logix-react test -- --project browser`（一次性 run）。

## 6. 常见坑（Anti-patterns）

- 把“事务窗口”当成“会自动切分的 async 区块”：在同一入口内 `await/Effect.sleep` 并期待中间态可见 —— 这会把事务拉长且丢失中间态。
- 在事务窗口内做真实 IO/等待：违反“事务窗口禁止 IO”的硬约束，未来会被更严格门禁。
- ExternalStore 的 subscribe listener 传 payload/做计算：会制造过期值、队列风暴，并破坏 “pull 最新 snapshot” 的真相源模式。
- 绕过 HostScheduler 直接用 `queueMicrotask/Promise.then`：测试不可控、平台差异不可诊断、容易触发 microtask starvation。
- 引入第二套对外快照真相源（绕开 RuntimeStore）：会以非常隐蔽的方式引入 tearing 回归。
