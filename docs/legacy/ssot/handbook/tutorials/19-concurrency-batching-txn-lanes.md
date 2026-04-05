---
title: 并发与批处理：Txn Lanes / ConcurrencyPolicy / backpressure / scheduling budget 教程 · 剧本集
status: draft
version: 1
---

# 并发与批处理：Txn Lanes / ConcurrencyPolicy / backpressure / scheduling budget 教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Logix 在高频交互场景里的并发治理与调度治理讲清楚——Txn Lanes（urgent/nonUrgent）、ConcurrencyPolicy（并发上限/背压）、以及 budget/time-slicing/coalesce/starvation protection 的可解释证据链。  
> **重要**：本文不是裁决来源；协议/边界最终以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。当文档与类型提示冲突，以本地 TypeScript 类型与实现为准。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

1. 事务窗口与参考系：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
2. React 集成与 tick 参考系：`docs/ssot/handbook/tutorials/11-react-runtime-store-no-tearing.md`
3. （产品视角）Txn Lanes：`apps/docs/content/docs/guide/advanced/txn-lanes.cn.md`
4. TxnLanePolicy（resolver）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
5. txnQueue（urgent/nonUrgent 队列 + 背压）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
6. ConcurrencyPolicy（resolver + unbounded gate）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`
7. Txn Lane 证据（event types）：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

---

## 1. 心智模型：你要治理的是“事务之后的拖尾”，不是“让事务可中断”

当你看到“输入/点击很频繁时明显卡顿”，常见根因不是一次 transaction 本身做了太多（事务窗口本来就禁止 IO），而是 **事务之后的 follow-up work 堆积**（backlog）：

- 派生/补算（例如 trait computed 的 deferred flush）
- 通知/同步（例如对外订阅、事件汇报）
- 并发 fan-out（例如 Flow.runParallel/task runner 触发的外部 IO）

Logix 用两组“治理旋钮”把这些成本变成可控、可解释、可回退：

1. **ConcurrencyPolicy**：限制“同时在跑的东西”与“可堆积的队列上限”（concurrencyLimit + losslessBackpressureCapacity）。
2. **Txn Lanes**：把 follow-up work 分成 urgent/nonUrgent 两条车道，保证关键交互优先完成；nonUrgent 可延后但必须在上界内追平（budget/maxLag/coalesce/yield）。

> 关键点：Txn Lanes **不改变事务语义**。事务依然同步、事务窗口禁 IO。Txn Lanes 管的是事务之外（outside txn window）的 follow-up work 调度。

---

## 2. 核心链路（从 0 到 1）：从 Runtime.make 到 trace:txn-lane

本节只讲最小闭环：你能从代码理解“为什么会让路/为什么会合并/为什么会强制追平”，并且能在 Devtools/日志里拿到证据。

### 2.1 ConcurrencyPolicy：并发上限与背压容量的统一入口

定义与字段来源（实现类型）：`packages/logix-core/src/internal/runtime/core/env.ts`

核心字段：

- `concurrencyLimit: number | 'unbounded'`：Flow.runParallel / TaskRunner 等“并发 fan-out”使用的并发度上限。
- `losslessBackpressureCapacity: number`：lossless channel 的背压容量（例如 txnQueue、actionHub 发布队列）。
- `allowUnbounded: boolean`：unbounded 的显式开关（没有它，requested unbounded 会被降级并产生诊断）。
- `pressureWarningThreshold` + `warningCooldownMs`：并发压力诊断门控（避免刷屏）。

resolver（优先级与 gate）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`

- 覆盖优先级：`provider > runtime_module > runtime_default > builtin`
- unbounded gate：`concurrencyLimit='unbounded'` 必须同时 `allowUnbounded=true` 才会真正生效，否则会回退到最后一个 bounded 值并发出诊断。

诊断（可解释链路）：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`

- `concurrency::pressure`（warning）：backpressure/saturation 达到阈值时输出一次（带 cooldown + suppressedCount）
- `concurrency::unbounded_enabled`（error）：effective unbounded（高风险）
- `concurrency::unbounded_requires_opt_in`（error）：requested unbounded 但未 allow，系统降级

### 2.2 txnQueue：所有入口串行化（并带 lanes + 背压）

实现：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`

它做了三件“很不显眼但很关键”的事：

1. **单实例串行队列**：所有 entry（dispatch/source-refresh/trait flush…）最终以 FIFO 语义串行执行，避免并发状态写入破坏事务模型。
2. **队列分 lane**：有 `urgentQueue` 与 `nonUrgentQueue`；consumer loop 总是先 drain urgent，再 drain nonUrgent（优先关键交互）。
3. **lossless 背压**：每个 lane 有 backlogCount；超过 `losslessBackpressureCapacity` 时 enqueue 会等待 Deferred signal（不会无限堆积内存），并能输出 `concurrency::pressure` 诊断。

还要注意一个硬门：

- 在同步事务窗口内禁止 enqueue（否则可能死锁/违反背压约束），会发 `state_transaction::enqueue_in_transaction` 的 error 诊断并 die（dev/test）。

### 2.3 TxnLanePolicy：Txn Lanes 的配置与覆盖优先级

resolver：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

它把 `TxnLanesPatch`（来自 runtime_default/runtime_module/provider/provider_module）合成成一个可执行策略：

- `enabled`：是否启用 lanes（默认 true）
- `overrideMode: forced_off | forced_sync`：强制回退/对照（只要存在 overrideMode，就会 effective disabled，`queueMode='fifo'`）
- `budgetMs / debounceMs / maxLagMs / allowCoalesce / yieldStrategy`
- `configScope`：最后一次改变策略的来源（用于解释“谁覆盖了我”）
- `queueMode: lanes | fifo`：最终队列模式（给证据链/Devtools 消费）

覆盖优先级与 ConcurrencyPolicy 一致：

> `provider > runtime_module > runtime_default > builtin`

### 2.4 Txn Lanes 的主要落点：deferred converge flush（time-slicing scheduler）

Txn Lanes 的价值不在于“把所有事都塞进 nonUrgent”，而在于把**最典型、最容易拖尾的 follow-up work**收敛到一条可解释路径。

当前最核心的落点是 **trait computed 的 deferred flush**（time-slicing scheduler）：

- 实现位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- 触发源：事务窗口内积累 dirty-set/backlog，然后通过 signal 在事务外执行 deferred flush（避免在 txn window 里做重计算）
- 执行方式：
  - TxnLanes **开启**：把每个 slice 作为 `enqueueTransaction('nonUrgent', ...)` 的任务入队，并在 slice 之间 `Effect.yieldNow()` 让路（budget/inputPending/16ms forced frame）
  - TxnLanes **关闭/forced_sync/forced_off**：直接 `enqueueTransaction('urgent', ...)` 同步追平（仍会输出 forced_* 的证据，便于对照）

### 2.5 证据链：`trace:txn-lane`（Slim、可序列化、可对齐 txnSeq）

事件类型与证据结构：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

关键结构（概念）：

- `anchor: { moduleId, instanceId, txnSeq, opSeq? }`
- `lane: urgent | nonUrgent`
- `policy`：resolved policy（含 configScope/queueMode/overrideMode）
- `backlog`：pendingCount/ageMs/coalescedCount/canceledCount
- `budget`：budgetMs/sliceDurationMs/yieldCount/yielded/yieldReason
- `reasons[]`：稳定 reason code（forced_sync/budget_yield/max_lag_forced/coalesced…）

事件投影（保证 slim）：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（对 `trace:txn-lane` 做 `projectJsonValue`）

回归用例（证据不漂）：见本教程的 “验证方式”。

---

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：默认开启 lanes（builtin），应能看到 nonUrgent evidence

你想验证“Txn Lanes 真的生效了”，最直接的方式不是体感，而是找 `trace:txn-lane`：

- 代表性回归：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
  - 构造大量 deferred computed（`scheduling:'deferred'`）
  - 启用 time-slicing（`traitConvergeTimeSlicing.enabled=true`）
  - 断言 `trace:txn-lane` 里出现 `lane='nonUrgent'`，且 `policy.queueMode='lanes'`、`configScope='builtin'`

### 3.2 剧本 B：强制回退（forced_off / forced_sync），但必须留下证据

两个 overrideMode 的价值：

- `forced_off`：回到 baseline（不走 lanes），用于止血/排障
- `forced_sync`：强制全同步（忽略延后与 time-slicing），用于对照测差异（更容易做 perf evidence）

要求：即使 effective disabled，也要输出 `trace:txn-lane`，并在 reasons 里体现 forced_*（方便“解释当前到底在跑什么”）。

回归用例同样在：`ModuleRuntime.TxnLanes.DefaultOn.test.ts`

### 3.3 剧本 C：coalesce 与取消（allowCoalesce=true）——“允许拖后，但不能拖尾爆炸”

当 backlog 处理中又来了新的 dirty-set，如果 `allowCoalesce=true` 且未超过 maxLag，上层策略会选择：

- 取消剩余 slice（避免把“已过时的中间态”补算完）
- 合并到新的 backlog（下一轮重新跑）

这会产生两类证据：

- 正常 slice evidence（queued_non_urgent + 可能 budget_yield）
- coalesce/canceled evidence（reasons=['coalesced','canceled']）

这类证据当前在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts` 的 deferred flush scheduler 中产出。

### 3.4 剧本 D：starvation protection（maxLagMs）——“允许延后，但必须追平”

系统必须保证：nonUrgent 不会永远追不平。

当 `lagMs >= maxLagMs`：

- `willCoalesce` 被关闭（不再取消/合并，转为强制追平）
- `budgetMs` 会被放大（更积极追平 backlog）
- reasons 会包含 `max_lag_forced` 与 `starvation_protection`

这保证了“允许延后”不会演化成“永远欠账”。

### 3.5 剧本 E：并发压力（backpressure/saturation）——让系统告诉你“哪里堵住了”

当你遇到“某些 publish/queue enqueue 变慢”，不要只看执行时间本身，更重要的是能在诊断里看到：

- 哪个 trigger 在堵（trigger.kind/name）
  - `txnQueue.enqueueTransaction.urgent|nonUrgent`
  - `actionHub.publish|publishAll`
- backlogCount / saturatedDurationMs / threshold / cooldown / suppressedCount

入口实现：

- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

### 3.6 剧本 F：Flow.runParallel 的并发上限（concurrencyLimit）

Flow 的并发 fan-out 不应该“默认无脑开大”，否则会把外部服务/浏览器调度/内存推到不可控。

实现落点：

- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - `Stream.mapEffect(...,{ concurrency })` 的 concurrency 来自 ConcurrencyPolicy.resolver

---

## 4. 代码锚点（Code Anchors）

### 4.1 配置与 resolver

- `packages/logix-core/src/internal/runtime/core/env.ts`：`TxnLanesPatch`、`ConcurrencyPolicyPatch`、override maps 字段
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`：TxnLanePolicy resolver（priority + overrideMode + queueMode）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`：ConcurrencyPolicy resolver（priority + unbounded gate）
- `packages/logix-core/src/internal/runtime/core/configValidation.ts`：concurrency/txnLanes 输入校验（dev-only warn）

### 4.2 执行与调度

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`：urgent/nonUrgent 队列 + lossless backpressure + context capture
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`：deferred converge flush 的 time-slicing scheduler（slice/coalesce/yield/maxLag）
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`：pressure/unbounded 的结构化诊断事件
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`：Flow.runParallel/runExhaust 的并发控制入口

### 4.3 证据链与事件

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`TxnLaneEvidence`、`trace:txn-lane` 投影（Slim+可序列化）

---

## 5. 验证方式（Evidence）

### 5.1 代表性测试（不进入 watch）

- Txn lanes default-on + forced overrides evidence：
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- Txn lanes runtime overrides（provider/runtime_default scope）：
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`
- txnQueue urgent/nonUrgent 公平性（urgent 优先 + nonUrgent 不饿死）：
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`

一次性运行建议入口：`docs/ssot/handbook/playbooks/quality-gates.md`

---

## 6. 常见坑（Anti-patterns）

1. **把 Txn Lanes 当成“可中断事务”**：Txn Lanes 只治理事务之后的 follow-up work；事务窗口仍同步、禁 IO。
2. **在事务窗口内 enqueue/跑任务**：会导致死锁/违背背压约束；相关 hard gate 会直接报错（见 txnQueue/TaskRunner）。
3. **只看体感，不看证据**：必须用 `trace:txn-lane` + `concurrency::*` 诊断把“让路/合并/追平”解释出来，再做调参。
4. **一刀切关闭 lanes 当成长期方案**：`forced_off/forced_sync` 适合止血/对照，但长期应回到“budget+maxLag 的可控延后”，否则会把交互 p95 拉回拖尾模式。
5. **启用 unbounded 却没意识到风险**：unbounded 需要显式 allow；即便允许，也只适合短生命周期、可取消的 fan-out，避免长任务堆积。

