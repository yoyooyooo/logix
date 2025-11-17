---
title: Runtime v3 Core · 事务、稳定锚点与 Trace 贯穿
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - ../../../../../specs/009-txn-patch-dirtyset/spec.md
  - ../../../../../specs/016-serializable-diagnostics-and-identity/spec.md
  - ../../../../../specs/014-browser-perf-boundaries/perf.md
---

# 事务、稳定锚点与 Trace 贯穿（对齐最新实现）

本节只回答一件事：**锚点如何在“事务 → EffectOp → Debug/Devtools 导出”里贯穿**，以及新增边界时必须补齐哪些字段。

## 1. 锚点定义（对外唯一口径）

- `moduleId`：`Module.make(id)` 的长期稳定 id（语义锚点）。
- `instanceId`：Runtime/Adapter 为每个 ModuleRuntime 分配的稳定实例 id（可被 Devtools/React 绑定）。
- `txnSeq`：同一 instance 内单调递增（事务序列）。
- `txnId`：稳定可读 id（当前实现形态：`instanceId::t${txnSeq}`）。
- `opSeq`：同一 instance 内单调递增（边界操作序列；用于 service/source/converge 等）。

代码落点：

- `txnSeq/txnId`：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `opSeq`：`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/source.ts`
- 承载字段：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

## 2. 事务窗口（StateTransaction）做了什么

- begin：拿到当前 state 快照，分配 `txnSeq/txnId`，初始化 `draft`。
- write：`.update/.mutate/reducer` 只修改 `draft`；full 模式记录 patch；始终记录 `dirtyPaths`。
- commit：**只写一次**底层 `SubscriptionRef.set`；计算 `dirtySet`；返回聚合后的 `StateTransaction`（供 Debug/Devtools 生成摘要）。

见：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

## 3. EffectOp（可观测边界）必须补齐的 meta

EffectOp 的 `meta` 是“可解释链路”的最低事实源：必须能把每一次边界执行挂回稳定锚点。

最小字段（按需补齐）：

- `moduleId` / `instanceId`
- `txnSeq` / `txnId`（若该 op 属于某次事务）
- `opSeq`（同一 instance 内递增）
- 语义字段（可选）：`fieldPath` / `traitNodeId` / `stepId` / `resourceId` 等

见：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`

## 4. Debug/Devtools 导出：只导出 JsonValue + Slim

现实约束：Devtools/Studio 只能消费可序列化、可裁剪的结构；因此必须区分：

- 宿主内 Debug.Event：允许携带 `data?: unknown`（但不得作为可导出事实源）。
- Devtools 导出 RuntimeDebugEventRef / EvidencePackage：必须经过 JsonValue 投影与裁剪。

见：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/Observability.ts`

## 5. 新增一个核心边界时的最小自检

- 是否能在 `DiagnosticsLevel=off` 下退化为“几乎零开销”？（默认应为是）
- 是否为 `meta.opSeq` 提供了分配逻辑（或复用现有分配点）？（必须为是）
- 是否能在 014 跑道里解释：发生了什么（what）、为什么（why）、对应哪份 IR/版本（where）？（必须为是）
