---
title: 长链路实现笔记 · E/F/G｜观测、证据与回放（Observability / Evidence / Replay）
status: draft
version: 1
---

# 长链路实现笔记 · E/F/G｜观测、证据与回放（Observability / Evidence / Replay）

> **主产物**：
>
> - E 观测：Slim 事件流 + ring buffer（DevtoolsHub）
> - F 证据：Maps + Traces（Static IR 去重 + Dynamic Events）
> - G 回放：ReplayLog + time travel（dev/test）
>
> 更系统的“Digest/Diff/Anchors”教程与剧本集见：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（本文偏实现笔记）。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. DebugSink → DevtoolsHub（事件如何被采集/聚合）
- 3. Static IR / Evidence Package（Maps + Traces）
- 4. Replay & Time Travel（按 txn 回放）
- 5. 观测分级（off/light/full）与 prod 冷路径
- 6. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - Debug：`packages/logix-core/src/Debug.ts`
  - Observability：`packages/logix-core/src/Observability.ts`
  - time travel：`packages/logix-core/src/Runtime.ts`（`applyTransactionSnapshot`）
- **internal**
  - DebugSink：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - DevtoolsHub：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - Evidence 协议：`packages/logix-core/src/internal/observability/evidence.ts`
  - Static IR collector：`packages/logix-core/src/internal/runtime/core/ConvergeStaticIrCollector.ts`
  - ReplayLog：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
  - ModuleRuntime 回放落点：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（内部 apply snapshot）
- **tests**
  - 观测分级：`packages/logix-core/test/Debug.DiagnosticsLevels.test.ts`
  - DevtoolsHub：`packages/logix-core/test/DevtoolsHub.test.ts`、`packages/logix-core/test/DevtoolsHub.SnapshotToken.test.ts`
  - Evidence 稳定性：`packages/logix-core/test/LogicTraits.Evidence.Stability.test.ts`、`packages/logix-core/test/RuntimeKernel.ServicesEvidence.test.ts`
  - Time travel（UI）：`packages/logix-devtools-react/test/TimeTravel.test.tsx`

## 2) DebugSink → DevtoolsHub（事件如何被采集/聚合）

把 Debug/Devtools 当成一个“进程级事件系统”，而不是日志：

- **DebugSink**：负责接收事件并做 Slim/序列化安全约束（避免把闭包/循环引用塞进 buffer）。
- **DevtoolsHub**：ring buffer + 实例 registry；支持按 runtime/module/instance 维度订阅与清理。

关键约束：

- 事件必须结构化、可序列化（Devtools/CI/证据包都依赖它）。
- 在生产环境默认冷（`off/light`），避免把观测变成热路径。

## 3) Static IR / Evidence Package（Maps + Traces）

证据包的设计关键是**去重与可裁剪**：

- **Static IR（地图）**
  - in-memory：可包含函数引用（为运行时性能服务）。
  - exported：纯 JSON（为序列化/工具消费服务）。
  - 通过 digest 去重存储，避免每条事件都携带大图。
- **Dynamic Events（轨迹）**
  - 事件只引用 digest + integer IDs（低开销、高可解释）。

入口：

- 导出：`packages/logix-core/src/Debug.ts`（`exportEvidencePackage`）→ `DevtoolsHub.exportDevtoolsEvidencePackage`
- 协议：`packages/logix-core/src/internal/observability/evidence.ts`

## 4) Replay & Time Travel（按 txn 回放）

time travel 的关键不是“能不能回放”，而是**回放也要可诊断**：

- 回放发生时要记录 origin（`origin.kind="devtools"`），保证时间线可解释。
- 回放要遵守 A 数据面的事务窗口语义：仍然走 StateTransaction，仍然 0/1 次 commit。
- 默认 dev-only（`isDevEnv`），避免生产误用造成不可控状态漂移。

入口：

- `packages/logix-core/src/Runtime.ts`（`applyTransactionSnapshot`）
- `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（内部 apply snapshot）
- `packages/logix-devtools-react/src/snapshot.ts`（UI 与 snapshot token 交互）

## 5) 观测分级（off/light/full）与 prod 冷路径

把观测分级当产品能力：

- `off`：近零开销，只保留必要的运行。
- `light`：生产默认；只留事务摘要/计数器/关键错误，不留 full timeline。
- `full`：开发/测试；允许 time travel、完整 EffectOp timeline、更多结构化细节。

## 6) auggie 查询模板

- “DebugSink 如何做 Slim 投影与序列化安全？哪些字段会被截断/丢弃？”
- “DevtoolsHub 的 ring buffer 与实例 registry 如何组织？instance cleanup 在哪做？”
- “Static IR 的 digest 如何计算？Exported IR 与 in-memory IR 的差异在哪里落地？”
- “Evidence package 的导出/导入入口在哪？协议版本如何演进？”
- “time travel 为什么是 dev-only？回放时 origin 如何记账，如何确保仍走事务窗口？”
