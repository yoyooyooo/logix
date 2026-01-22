---
title: DebugSink 事件模型教程 · Event → RuntimeDebugEventRef → 投影/降级（从 0 到 1）
status: draft
version: 1
---

# DebugSink 事件模型教程 · Event → RuntimeDebugEventRef → 投影/降级（从 0 到 1）

> **定位**：本文专注于“事件模型本身”的实现与扩展方式：你要新增/修改/审阅一个 Debug 事件时，应该如何保证它 Slim、可序列化、可 diff、并且默认近零成本。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/25-diagnostics-slim-events-explainability.md`，建立诊断协议的整体心智模型。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 `Event` 是生产者模型，`RuntimeDebugEventRef` 是消费者模型」。  
2. 读「2.2 `toRuntimeDebugEventRef`：补锚点 + meta 投影 + downgrade」。  
3. 如果你要改事件：只读「3.1 新增事件 checklist」。

## 1. 心智模型（两套模型，两个受众）

### 1.1 `Event` 是生产者模型：允许“先粗后细”

`Event` 的首要目标是让事件生产者（Runtime/React/Process/…）“好写、低侵入”：

- 允许携带 `unknown`（例如 `action: unknown`、`state: unknown`、`payload?: unknown`）。
- 允许缺省字段（`moduleId?/instanceId?/txnSeq?` 等），由边界层在合适时机补齐。
- 允许扩展 `trace:*` 作为“平台/对齐实验室”的钩子。

定义入口（单一真相源）：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type Event = ...`）。

结论：**不要试图让 `Event` 直接等价于导出协议**；否则生产者会被协议细节绑死，热路径也会被迫付税。

### 1.2 `RuntimeDebugEventRef` 是消费者模型：必须 Slim、可序列化、可排序

`RuntimeDebugEventRef` 的首要目标是让事件消费者（DevtoolsHub/EvidenceCollector/CI/平台）“好消费、好对齐”：

- 必须具备稳定锚点：`moduleId/instanceId/txnSeq/txnId/eventSeq/eventId/timestamp`（加上可选 `linkId/runtimeLabel`）。
- 必须能导出为 `JsonValue`：`meta?: JsonValue`，并且支持预算裁剪与降级解释。
- 必须有 `kind/label`：帮助 UI/聚合层做分类与稳定渲染（而不是依赖“读 type 前缀猜”）。

定义入口：同样在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export interface RuntimeDebugEventRef`）。

结论：**`RuntimeDebugEventRef` 才是“诊断 IR”的最小对齐面**；所有导出/对比/回放都应该建立在它之上。

## 2. 核心链路（从 0 到 1：Event → Ref）

### 2.1 `Debug.record(event)` 只负责“把事件交给 sinks”

公共入口：`packages/logix-core/src/Debug.ts`（`export const record = Internal.record`）。  
底层实现：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const record`）。

关键事实：

- `record` 不做“协议化”，它只做必要的 fast-path + 少量 enrichment（按 diagnosticsLevel 门控）。
- 真正的协议化发生在 `toRuntimeDebugEventRef`（并且 `diagnosticsLevel=off` 时直接不发生）。

### 2.2 `toRuntimeDebugEventRef`：补锚点 + meta 投影 + downgrade

入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const toRuntimeDebugEventRef`）。

它对所有事件统一做的“基础工作”：

- **锚点补齐**：
  - `moduleId/instanceId/runtimeLabel`（缺省则回退为 `unknown`）
  - `txnSeq` 缺省回退为 `0`；`txnId` 缺省则在 `txnSeq>0` 时构造 `instanceId::t${txnSeq}`
  - `linkId`：优先读顶层字段；对 `trace:*` 允许从 `data.meta.linkId` 兜底抽取
  - `eventSeq`：优先用 options 注入（例如 EvidenceCollector/RunSession）；否则走本地 `nextEventSeq()`
  - `eventId = makeEventId(instanceId, eventSeq)`
- **档位选择**：
  - `off`：直接返回 `undefined`（近零成本）
  - `light/sample`：走 light-like 投影（metaInput 是摘要，而不是全量 data）
  - `full`：允许更完整 metaInput，但仍必须过 `projectJsonValue`
- **预算裁剪与降级**：
  - 每个分支都会对 metaInput 调用 `projectJsonValue(metaInput)`
  - 把 `projectJsonValue` 的 `downgrade` 合并到事件 ref 的 `downgrade`（reason 码）
  - 可选回调 `onMetaProjection` 暴露 stats/downgrade 供导出侧累计 budget

一句话总结：`toRuntimeDebugEventRef` 做的是 **“在档位与预算约束下，把 Event 翻译成消费者可用的最小 IR”**。

### 2.3 事件命名与分类：type / kind / label 各自负责什么

在这个事件体系里有三个“容易混”的字段：

- `Event.type`：生产者的事件类型（例如 `diagnostic`、`warn:microtask-starvation`、`trace:tick`）。
- `RuntimeDebugEventRef.kind`：消费者侧的稳定大类（例如 `lifecycle/diagnostic/devtools/process/...`）。
- `RuntimeDebugEventRef.label`：消费者侧的稳定展示/聚合标签（例如 `module:init`、`trace:tick`、或某个 lifecycle phase 的 name）。

经验法则：

- 不要让 UI/平台通过“解析字符串前缀”来推断 kind；应该由 `toRuntimeDebugEventRef` 明确给出。
- label 应该稳定且可读，但不应承担“唯一性”；唯一性由 `eventId/eventSeq + anchors` 负责。

## 3. 扩展与演进（新增事件怎么做）

### 3.1 新增事件 checklist（必须过这一关）

当你要新增一个 Debug 事件（或改事件结构）时：

1. **先定语义边界**：它是 lifecycle/action/state/process/diagnostic/warn/trace 哪一类？事件“为什么存在”，用一句话说清楚。
2. **落到 `Event` union**：在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 增加分支。
3. **补齐 `toRuntimeDebugEventRef` 投影**：
   - light/sample：只投影“解释链路必需字段”（摘要）
   - full：可以更详细，但必须经 `projectJsonValue`（预算/可序列化）
4. **给稳定 reason code**：任何退化（truncated/degraded/forced）都必须用稳定字符串 enum（避免 diff 噪音）。
5. **评估 hot-path 成本**：
   - 新事件是否可能高频？如果是，必须在 `diagnosticsLevel=off` 下接近零成本（避免 Date.now/FiberRef 深读/深拷贝）。
6. **补测试**：
   - 至少覆盖“`toRuntimeDebugEventRef(light/full)` 输出可序列化 + 锚点齐全”
   - 对最关键事件，覆盖“同输入下投影稳定（排序/字段/reason 不漂）”

### 3.2 如何判断 metaInput “够 Slim”？

建议用三个问题反问自己：

1. **这份 meta 能否被稳定 diff？**（字段顺序/数组顺序/Map 迭代顺序是否确定）
2. **这份 meta 是否能解释‘为什么发生’？**（要么包含原因码，要么包含可回链锚点/摘要）
3. **这份 meta 是否可能爆炸？**（列表是否可能随规模线性增长；对象图是否可能递归）

如果答案不确定：把细节拆成两步：

- 事件里只放摘要（digest/count/reason）
- 细节走“结构侧”或“artifact side-channel”（例如 Manifest/Static IR/TrialRunArtifacts）

### 3.3 预算统计与 explainability：别把裁剪当成“悄悄发生的事”

当 meta 投影发生 dropped/oversized/nonSerializable 时，如果不把它变成“可解释事实”，就会出现典型噪音：

- Devtools/UI 看不到某些字段，但不知道是“本来就没发”还是“被裁剪了”
- CI diff 看到 evidence 缺失，但无法定位“缺失原因/是否可接受”

建议把预算作为一等公民：

- 导出侧累计预算：`packages/logix-core/src/internal/observability/evidenceCollector.ts`（`exportBudget`）
- UI 侧暴露预算：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`exportBudget` on snapshot）
- 事件 ref 明确降级原因：`RuntimeDebugEventRef.downgrade`

## 4. 代码锚点（Code Anchors）

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：事件模型的 SSoT（Event/DiagnosticsLevel/record/toRuntimeDebugEventRef）。
- `packages/logix-core/src/internal/observability/jsonValue.ts`：Slim 预算边界（projectJsonValue + stats）。
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：消费者聚合（snapshotToken/ringBuffer/exportBudget）。
- `packages/logix-core/src/internal/observability/evidenceCollector.ts`：离线导出（RunSession eventSeq + 双重投影 + exportBudget）。
- `packages/logix-core/src/internal/observability/trialRunModule.ts`：把“结构+证据”变成平台输入。

## 5. 常见坑（Anti-patterns）

- 只改了 `Event`，没改 `toRuntimeDebugEventRef`：结果 UI/CI 永远看不到你新增的信息。
- 在 light 档位投影 full data：预算裁剪必然发生，而且会造成“信息缺失但不可解释”。
- reason code 用动态字符串（拼时间/拼数字）：导致 diff 永远有噪音，无法做门禁。
- 把大对象图塞进 meta：最终要么非序列化要么 oversized，且会带来热路径 GC 压力。
