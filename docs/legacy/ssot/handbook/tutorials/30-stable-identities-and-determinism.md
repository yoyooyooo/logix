---
title: 稳定标识与去随机化教程 · instanceId/tickSeq/txnSeq/opSeq/eventSeq/runId（从 0 到 1）
status: draft
version: 1
---

# 稳定标识与去随机化教程 · instanceId/tickSeq/txnSeq/opSeq/eventSeq/runId（从 0 到 1）

> **定位**：本文把“稳定标识（stable identities）”当作一等公民：它不是日志细节，而是平台/Devtools/CI/回放/性能证据的共同地基。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（Digest/Diff/Anchors）与 `docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`（参考系），再读本篇会更顺畅。

## 0. 最短阅读路径（10 分钟上手）

1. 先读「1.2 稳定性的三个等级」——避免把“稳定”理解成一个词。  
2. 再读「2.1 instanceId」与「2.2 txnSeq/txnId」——它们是大多数链路的起点。  
3. 最后读「2.5 eventSeq/eventId」——理解“为什么排序不能靠时间戳”。  

如果你是来排障的：直接跳「3.1 剧本 A：为什么 diff/证据在漂？」。

## 1. 心智模型（稳定标识到底解决什么）

### 1.1 稳定标识不是“为了好看”，而是为了可解释与可比

当我们说“稳定标识/去随机化”，本质上是在回答三个问题：

1. **对齐**：动态证据如何回链到静态结构（Static IR/Manifest/Anchors）？  
2. **可比**：两次运行（或两次构建）能否做无噪 diff？能否对比性能基线？  
3. **可回放**：replay/试运行能否在不依赖外部世界的前提下复现同一条链路？  

如果没有稳定标识，这三件事会退化为：

- UI 只剩“时间线上的一堆点”，但无法回答“这个点属于谁/因为什么发生”；  
- CI diff 永远有噪音（时间戳/随机数/Map 顺序），导致门禁不可用；  
- 回放变成 re-fetch（碰运气），而不是 re-emit（确定性）。

### 1.2 稳定性的三个等级（不要混用）

“稳定”至少有三种不同等级，混用会造成误判：

1. **L0：单次运行内单调（Monotonic-in-run）**  
   目标：排序/去重/解释链路，不能依赖时间戳。  
   例：`eventSeq`、`opSeq`、`txnSeq`、`tickSeq`（在各自作用域内）。
2. **L1：构建产物可比（Comparable-as-artifact）**  
   目标：同一份源码/同一套输入导出的 JSON/digest 可稳定对比。  
   例：`manifest.digest`、`staticIrDigest`、artifact digest 前缀版本。
3. **L2：跨运行/跨宿主确定性（Deterministic-across-runs）**  
   目标：同输入在不同机器/不同 CI 运行仍能对齐（极难，需要严格约束）。  
   例：平台出码的 `stepKey`、Root IR 的 control surface digest（必须剔除所有宿主噪声）。

经验法则：运行时默认至少保证 L0；平台/协议产物必须达到 L1；L2 需要显式设计与强约束（不要“顺手做了但其实没做到”）。

### 1.3 静态锚点 vs 动态锚点：Anchors 的两条腿

Anchors 不是一个 ID，而是一组“能把不同平面连起来”的标识：

- **静态锚点**：`moduleId/actionTag/serviceId/staticIrDigest/fieldPathId/stepId/stepKey/...`  
- **动态锚点**：`instanceId/tickSeq/txnSeq/txnId/opSeq/eventSeq/runId/snapshotToken/...`

本文主要覆盖动态锚点与“去随机化”的工程边界，并说明静态锚点与它们如何对齐。

## 2. 核心链路（从 0 到 1：这些 ID 在哪生成、用来干什么）

> 本节只讲“真实落点与真实语义”。你不需要记住所有细节，但要记住：**每个 ID 都有作用域**，一旦跨作用域复用就会出 bug 或噪音。

### 2.1 `instanceId`：运行时实例锚点（single source of truth）

`instanceId` 是 ModuleRuntime 的稳定实例锚点（单一真相源）：

- 定义与约束：`packages/logix-core/src/internal/runtime/core/module.ts`（`ModuleRuntime.instanceId` 注释强调“禁止默认随机/时间”）
- 实际注入点：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`（`ModuleRuntime.make` 从 options 读 `instanceId`）

默认行为（兜底，不是终态）：

- 如果未提供，`ModuleRuntime.impl.ts` 使用进程内单调序号生成：`i1/i2/i3...`（`makeDefaultInstanceId`）。
- 这是 L0 稳定（单次运行内可排序/可解释），但不是 L2（跨运行可能变化）。

何时必须显式提供稳定 `instanceId`：

- 你要做 CI/平台对齐（跨运行对齐事件链路、比对 evidence 的聚合结果）；  
- 你要把某个 runtime 作为长期“资产实例”讨论（例如一个长期运行的 root，或一个固定的 sandbox kernel）。  

经验写法：把 `instanceId` 视为“可注入/可派生”，从上层组合根（Root/Runtime.make）统一生成并传下去，而不是让各层各自造。

### 2.2 `txnSeq` / `txnId`：事务锚点（instance 内单调递增）

StateTransaction 在每个 ModuleRuntime 内维护事务上下文：

- 入口：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- 生成规则：`beginTransaction` 会递增 `ctx.nextTxnSeq`，并用 `instanceId` 作为 anchor 生成 `txnId = \"${instanceId}::t${txnSeq}\"`。

作用域：

- `txnSeq`：instance 内单调递增（L0）  
- `txnId`：`instanceId + txnSeq` 的组合键（L0，且可跨模块/跨层复用为引用）  

一个关键约定：`txnSeq=0` 可以作为“装配/非事务阶段”的稳定锚点（例如 wiring-time 错误锚点）：

- 例：`packages/logix-core/src/internal/runtime/core/FullCutoverGate.ts` 明确约定 `txnSeq=0` 表示 assembly。

### 2.3 `opSeq`：不要混淆两种 opSeq

本仓里至少有两种“opSeq”概念，必须区分：

1. **运行时操作序号（EffectOp.meta.opSeq）**：用于把“跨模块/跨层级的一串 operation”做稳定排序与解释链路。  
   - 分配入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`  
   - 分配方式：如果 meta 里没有 `opSeq`，则用 `RunSession.local.nextSeq('opSeq', instanceId)` 分配（避免 Math.random）。  
   - 作用域：RunSession × instance（L0）
2. **事务内 patch 序号（TxnPatchRecord.opSeq）**：用于描述单个 transaction 内 patch 的顺序（patchCount-1）。  
   - 分配入口：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（`recordPatchFull`）  
   - 作用域：单个 txn 内（L0）

经验法则：当你在做“平台/Devtools 解释链路”，用的是第一种（operation 的 opSeq）；当你在解释“一个 transaction 内写了哪些 patch”，用第二种。

### 2.4 `tickSeq`：外部订阅参考系（no-tearing 的时间轴）

`tickSeq` 是 RuntimeStore 面向“外部订阅者（React external store 等）”的参考系：

- TickScheduler 负责递增：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（`tickSeq += 1`）
- RuntimeStore 负责提交并对外暴露：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（`commitTick` 写入 `tickSeq`，`getTickSeq` 暴露）

作用域：

- tick scheduler/store 全局单调递增（在一个 runtime store 生命周期内，L0）

为什么 tickSeq 必须存在：

- 它是“同步快照（getSnapshot）与异步通知（subscribe）”之间的稳定桥梁；  
- 没有 tickSeq，UI 很容易 tearing：读到旧 state，但收到了新通知（或反过来）。

额外要点（去随机化示例）：

- TickScheduler 的可选 telemetry 采样使用 `tickSeq` 做确定性采样：`shouldSampleTick(tickSeq, sampleRate)`，避免 `Math.random()`（`TickScheduler.ts`）。

### 2.5 `eventSeq` / `eventId`：诊断事件的稳定排序（不能靠时间戳）

当 Debug 事件进入“可导出/可订阅”的世界，它会被规范化为 `RuntimeDebugEventRef`：

- 定义与规范化入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`toRuntimeDebugEventRef`）
- `eventId` 规则：`\"${instanceId}::e${eventSeq}\"`（同文件 `makeEventId`）

eventSeq 的来源有两种（取决于消费者）：

- DevtoolsHub 路径：用 hub 内部的 `nextSeq`（进程级窗口化聚合，L0）  
  - 入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- EvidenceCollector 路径：用 `RunSession.local.nextSeq('eventSeq', instanceId)`（试运行/导出证据包，L0）  
  - 入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`

核心原则：**排序与去重用 eventSeq/eventId，不用 timestamp**。timestamp 可以用于 UI 的时间聚合，但不能作为“唯一性/顺序”的事实源。

### 2.6 `runId`：一次导出/一次试运行的会话标识（允许不稳定）

runId 是“证据包/试运行”的会话维度标识：

- RunSession runId：`packages/logix-core/src/internal/observability/runSession.ts`（默认 `run-${startedAt}.${nextRunSeq()}`，避免随机数）
- DevtoolsHub runId：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`run-${Date.now()}` + seq，避免同毫秒冲突）

runId 的定位：

- 它是“一个会话的分组键”，不是“可比性锚点”。  
- 对比/缓存/门禁不要基于 runId，而应基于 digest（L1）与稳定锚点（L0/L2）。

### 2.7 `snapshotToken`：Devtools Snapshot 的订阅协议（no-tearing）

DevtoolsHub 的 Snapshot API 使用 `snapshotToken` 做“外部订阅的唯一真相源”：

- 入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- 契约：token 不变则对外可见 snapshot 字段不得变化；任何变化必须 bump token（防 tearing）。

如果你在 UI 侧做外部订阅桥接（React useSyncExternalStore 等），应把 token 当作版本号。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：为什么 diff/证据在漂（CI 永远红，或者 PR 永远有噪音）？

排查顺序（从“最常见漂移源”开始）：

1. 你是否把 `Date.now()`/随机数写进了协议产物（Manifest/Static IR/EvidencePackage payload）？  
2. `instanceId` 是否未注入而依赖默认 `iN`？（跨运行不稳定，会放大 diff 噪音）  
3. 你是否依赖 `Map/Set` 的迭代顺序输出数组？（插入顺序漂移会造成 diff 噪音）  
4. 你是否把对象 key 的顺序当作稳定？（应使用 `stableStringify`/稳定排序策略）

建议做法：

- diff/门禁：基于 digest + 可解释 diff（见 `01-digest-diff-anchors.md`），不要基于 runId/timestamp。  
- 证据：导出侧必须投影为 `JsonValue` 并统计预算（见 `28-evidence-collector-and-trialrun.md`）。  

### 3.2 剧本 B：我要新增一个诊断事件，如何确保“稳定 + Slim + 可解释”？

Checklist（最短版）：

1. 事件必须能带锚点：`moduleId/instanceId/txnSeq`（至少）。  
2. 事件 payload 必须可投影为 `JsonValue`（必要时 light 档位只投影摘要）。  
3. 事件顺序必须可重建：不要靠 timestamp；依赖 eventSeq/opSeq/txnSeq。  
4. 任何退化必须有稳定 reason code（字符串 enum），不能拼动态数字/时间。  

相关教程：

- `25-diagnostics-slim-events-explainability.md`
- `26-debugsink-event-model-and-projection.md`

### 3.3 剧本 C：我想做性能对比，但不想让“诊断开销税”污染基线

关键原则：

- 基线对比的默认档位应接近 `diagnosticsLevel=off`；需要证据时再抬档位（light/sample）并明确记录。  
- 采样必须确定性（基于 tickSeq/txnSeq），不要用随机数。  

代码锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（tick telemetry deterministic sampling）
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（trait converge sampling 基于 txnSeq）

### 3.4 剧本 D：我想做回放/时间旅行，如何避免 re-fetch？

原则：replay 模式下必须 re-emit（消费事件），不 re-fetch（不触发真实请求）。

入口：

- `packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
- `packages/logix-core/src/internal/runtime/core/env.ts`（ReplayModeConfigTag）
- `packages/logix-core/src/internal/state-trait/source.impl.ts`（replay consumeNextResourceSnapshot）

详解见：`29-replaylog-and-replayeventref.md`。

## 4. 代码锚点（Code Anchors）

建议把下面这些文件当作“稳定标识与去随机化”的主战场：

1. `packages/logix-core/src/internal/runtime/core/module.ts`：`ModuleRuntime.instanceId/moduleId/txnSeq` 的语义约束（single source of truth）。
2. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`：默认 `instanceId` 生成（`iN`）与注入点（不要依赖随机/时间）。
3. `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`：`txnSeq/txnId` 生成、patch record opSeq、dirty-set 记录的作用域边界。
4. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`：`EffectOp.meta.opSeq/linkId` 的分配与 FiberRef 传播（去随机化）。
5. `packages/logix-core/src/internal/observability/runSession.ts`：RunSession 与 `local.nextSeq`（opSeq/eventSeq 的稳定分配器）。
6. `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`eventSeq/eventId`、`toRuntimeDebugEventRef`（排序/去重不可依赖 timestamp）。
7. `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：`snapshotToken` 契约、runId、ring buffer seq（no-tearing 聚合）。
8. `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：`tickSeq` 与确定性采样（shouldSampleTick）。
9. `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`：`tickSeq` 提交与对外暴露（外部订阅参考系）。
10. `packages/logix-core/src/internal/runtime/core/FullCutoverGate.ts`：`txnSeq=0` 的 assembly 锚点约定（wiring-time failure）。
11. `packages/logix-core/src/internal/digest.ts`：`stableStringify/fnv1a32`（去噪/稳定序列化的基础设施）。
12. `packages/logix-core/src/internal/observability/evidence.ts`：EvidencePackage 的协议字段（避免把不稳定字段当可比性锚点）。

## 5. 验证方式（Evidence）

最少应验证三件事：

- **不引入随机性**：新增链路不使用 `Math.random()` 作为默认唯一性来源；采样基于稳定序号。  
- **锚点可对齐**：导出的 debug:event（EvidencePackage）里，`instanceId/txnId/eventId` 能形成可解释链路。  
- **对比不漂**：同输入下，digest 不抖；事件序列按 seq 排序可稳定 diff（忽略 timestamp/runId）。  

## 6. 常见坑（Anti-patterns）

- 用时间戳当唯一性：时间戳会碰撞/漂移/受宿主影响，且无法作为稳定顺序。  
- 让多个层“各自生成 instanceId”：会产生并行真相源，后续永远对不齐。  
- 把 `Map` 的迭代顺序当稳定排序：一旦插入顺序变化，diff 噪音爆炸。  
- 在协议产物里塞入环境噪声（路径、绝对时间、随机数、对象引用）：会直接破坏 L1/L2 可比性。  
- 忽略作用域：把 txn 内 opSeq 当成全局 opSeq，把 eventSeq 当成 txnSeq（最终解释链路一定错）。  
