---
title: ReplayLog 教程 · 回放 = re-emit（不 re-fetch），以及 ReplayEventRef 如何对齐诊断链路（从 0 到 1）
status: draft
version: 1
---

# ReplayLog 教程 · 回放 = re-emit（不 re-fetch），以及 ReplayEventRef 如何对齐诊断链路（从 0 到 1）

> **定位**：本文把“资源/查询的时间线”从真实 IO 中解耦出来：live 模式记录快照，replay 模式重放快照，让故障复现与时间旅行基于事件事实源（Event Log），而不是基于重新发请求的运气。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/25-diagnostics-slim-events-explainability.md` 与 `docs/ssot/handbook/tutorials/28-evidence-collector-and-trialrun.md`。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 口径：replay 必须 re-emit，不允许 re-fetch」。  
2. 读「2.2 Source 路径：live 记录 / replay 消费」。  
3. 如果你要做复现/时间旅行：只读「3.1 剧本 A：用 ReplayLog 做确定性复现」。

## 1. 心智模型（ReplayLog 解决什么）

### 1.1 口径：Replay Mode 下必须 re-emit（重赛结果），而不是 re-fetch（重算请求）

我们想要的是“复现当时发生过什么”，不是“再跑一次看看会不会发生”。因此 replay 的原则是：

- **事件事实源优先**：以 `ReplayLogEvent` 为事实源（ResourceSnapshot/InvalidateRequest）。
- **禁止 re-fetch**：replay 模式下不要触发真实网络/真实副作用；只消费日志并写回 snapshot。
- **保留时间线形状**：即使是回放，也要保留 `loading → success/error` 的可解释时间线（避免 UI/诊断链路失真）。

相关 SSoT 入口：`docs/ssot/runtime/logix-core/observability/09-debugging.06-replay.md`。

### 1.2 ReplayLog 是一个 Env Service：顺序消费（cursor）模型

ReplayLog 是运行时内置的最小 Env Service：

- 定义入口：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
- 核心能力：
  - `record(event)`：live 模式追加记录
  - `snapshot`：取当前事件数组
  - `resetCursor`：回到起点以重复回放
  - `consumeNext(predicate)`：按 predicate 消费下一条事件（cursor 前进）
  - `consumeNextResourceSnapshot({ resourceId, fieldPath, keyHash?, phase? })`：资源快照的专用消费器

顺序消费是关键：它保证 replay 的事件顺序与当时一致，并且让“同一份证据包”可以稳定复现。

### 1.3 两类事件：ResourceSnapshot / InvalidateRequest

ReplayLogEvent 目前固化两类事件：

1. `ResourceSnapshot`：资源快照（idle/loading/success/error）。
2. `InvalidateRequest`：显式失效请求（Phase 2：固化记录入口，供 Query/Devtools 聚合）。

定义入口：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`（`export type ReplayLogEvent = ...`）。

## 2. 核心链路（从 0 到 1：记录 → 回放 → 对齐诊断）

### 2.1 ReplayMode：live / replay 的开关（Tag/Layer）

ReplayMode 是一个运行时配置 Tag：

- 定义入口：`packages/logix-core/src/internal/runtime/core/env.ts`（`ReplayModeConfigTag` / `replayModeLayer`）
- 语义：
  - `live`：记录事件（record），并触发真实 load（如果需要）
  - `replay`：不触发真实 load，只消费 `ReplayLog` 并写回 snapshot

### 2.2 Source 路径：live 记录 / replay 消费（保留 loading→settled 时间线）

ReplayLog 的核心落地目前在 StateTrait.source 路径：

- 入口：`packages/logix-core/src/internal/state-trait/source.impl.ts`

关键机制（建议结合代码阅读）：

- live 模式：当 source refresh 写入 `Snapshot.loading/success/error` 时，同步 `ReplayLog.record(ResourceSnapshot)`。
- replay 模式：在写入 loading 后，先 `Effect.yieldNow()` 让 loading commit 可见，再 `consumeNextResourceSnapshot(...)` 获取当时的 settled 事件（success/error），并写回对应 snapshot。
- keyHash gate：replay 消费会匹配 `resourceId/fieldPath/keyHash/phase`，避免把错的 snapshot 写回到错的 fieldPath。

这保证了两点：

- **不 re-fetch**：回放不依赖外部世界；
- **时间线可解释**：UI/诊断仍能看到 loading→settled 的形状。

### 2.3 Query invalidate 记录：把“刷新意图”也做成事实源

Query invalidate 目前通过 trait lifecycle 统一入口记录到 ReplayLog：

- 入口：`packages/logix-core/src/internal/trait-lifecycle/index.ts`（`scopedExecute` 中 `query:invalidate` 分支）
- 事件：`ReplayLogEvent._tag = 'InvalidateRequest'`，携带 `meta: request.request`

它的价值是：让“为什么触发刷新/失效”也能回放与解释（而不是只看最终结果）。

### 2.4 ReplayEventRef：把 replay 事实源嵌入诊断链路（full 档位）

ReplayLogEvent 本身是“独立事实源”，但 Devtools/证据导出希望把它和事务/触发原因对齐：

- DebugSink 定义了 `ReplayEventRef = ReplayLog.ReplayLogEvent & { txnId?: string; trigger?: TriggerRef }`
  - 定义入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type ReplayEventRef = ...`）
- `state:update` 事件里有预留字段 `replayEvent?: ReplayEventRef`（full 档位才投影导出）
  - 投影入口：同文件 `toRuntimeDebugEventRef` 的 `state:update` 分支（metaInput 包含 `replayEvent`）

一句话总结：ReplayEventRef 的目标不是“替代 ReplayLog”，而是让 Devtools/证据包在需要时能把 replay 事件对齐到 txn/trigger，形成可解释链路。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：用 ReplayLog 做确定性复现（测试/离线）

目标：复现一个“资源刷新导致状态变化”的链路，但不发真实请求。

建议套路：

1. 提供 `ReplayLog.layer(initialEvents)`（把当时的 ResourceSnapshot 序列作为初始事件）。
2. 提供 `replayModeLayer('replay')`。
3. 运行你的逻辑（source refresh 会消费 replay 事件并写回 snapshot）。
4. 用 Devtools/Evidence 导出检查：是否按预期消费了对应的 loading/success/error。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
- `packages/logix-core/src/internal/runtime/core/env.ts`（ReplayModeConfigTag）
- `packages/logix-core/src/internal/state-trait/source.impl.ts`（consumeNextResourceSnapshot）

### 3.2 剧本 B：时间旅行/Devtools：把 replay 事件与 txn 对齐

目标：Devtools 能解释“这个 state:update 是哪个资源事件导致的”，并能在离线证据包里复盘。

建议做法：

- full 档位下导出 evidence（让 `state:update.meta.replayEvent` 出现）。
- 在 Devtools 聚合层把 replayEvent 与 txnId/trigger 关联起来，形成“资源时间线 ↔ 事务时间线”的对齐视图。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（ReplayEventRef + state:update 投影）
- `packages/logix-core/src/internal/observability/evidenceCollector.ts`（debug:event 导出）

## 4. 代码锚点（Code Anchors）

- `packages/logix-core/src/internal/runtime/core/ReplayLog.ts`：ReplayLog 的服务定义与 cursor 消费模型。
- `packages/logix-core/src/internal/runtime/core/env.ts`：ReplayModeConfigTag（live/replay 开关）。
- `packages/logix-core/src/internal/state-trait/source.impl.ts`：资源快照记录与 replay 消费（保留时间线形状）。
- `packages/logix-core/src/internal/trait-lifecycle/index.ts`：InvalidateRequest 记录入口（scopedExecute）。
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：ReplayEventRef 与导出对齐点（state:update.meta.replayEvent）。

## 5. 常见坑（Anti-patterns）

- replay 模式下仍触发真实请求（破坏确定性；让复现退化成“碰运气”）。
- 不做 keyHash gate / fieldPath gate（容易把 snapshot 写回到错误位置，造成“回放正确性假象”）。
- 把大对象图塞进 snapshot/meta（最终无法导出或被预算裁剪，导致回放缺失且不可解释）。
- 只记录结果不记录意图（没有 InvalidateRequest，很多“为什么刷新”会变成黑盒）。
