---
title: EvidenceCollector / TrialRun 教程 · 把“结构 + 动态证据”做成构建产物（从 0 到 1）
status: draft
version: 1
---

# EvidenceCollector / TrialRun 教程 · 把“结构 + 动态证据”做成构建产物（从 0 到 1）

> **定位**：本文讲清楚一条“平台/CI 友好”的闭环：不跑业务 main，仅做受控试运行，就能导出 `manifest/staticIr/environment/evidence/artifacts`，并且失败也能解释。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/04-observability-evidence-replay.md` 与 `docs/ssot/handbook/tutorials/25-diagnostics-slim-events-explainability.md`。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 为什么要把证据做成构建产物」对齐目的。  
2. 读「2.2 `makeEvidenceCollector`：Debug.Event → EvidencePackage」掌握 EvidenceCollector。  
3. 读「2.4 `trialRunModule`：结构 + 环境 + 证据 + artifacts」掌握 TrialRun。

## 1. 心智模型（为什么这条链路必要）

### 1.1 “证据做成构建产物”解决的是平台与 CI 的核心痛点

平台/CI 想做的事，往往不是“跑起来看看”，而是：

- **结构合同守护**：这次 PR 改了哪些 Action/Service/Workflow（表面积），是否触碰敏感边界？
- **依赖预检**：缺哪些 service/config？能否在合并前就给出明确 missing 清单？
- **可解释对齐**：为什么 converge 退化？为什么 tick backlog 变大？为什么出现 microtask starvation？
- **可回放**：出现线上问题时，能否用一份证据包复盘，而不是依赖“猜测 + 复现运气”？

这些都要求：输出必须 **可序列化、可 diff、可存档**，而且默认不能拖垮热路径。

### 1.2 三个对象：RunSession / EvidenceCollector / EvidencePackage

这条链路的三个基础对象：

1. `RunSession`：一次试运行的“会话上下文”，提供 `runId/source/startedAt` 与本地序号分配器（`local.nextSeq`）。
   - 入口：`packages/logix-core/src/internal/observability/runSession.ts`（`makeRunSession`）
2. `EvidenceCollector`：把 Debug 事件与附加摘要收敛为可导出证据包的收集器。
   - 入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`
3. `EvidencePackage`：协议化导出物（`protocolVersion/runId/source/createdAt/events/summary`）。
   - 入口：`packages/logix-core/src/internal/observability/evidence.ts`

关键点：`EvidencePackage.events[]` 是 envelope（有 `seq/timestamp/type/payload`），并且 `exportEvidencePackage` 会按 `seq` 稳定排序，确保 diff 口径一致。

## 2. 核心链路（从 0 到 1：TrialRun 导出产物）

### 2.1 RunSession：把“稳定序号”从全局时间里解耦出来

在可解释链路里，排序与去重不能依赖时间戳（会抖、会漂移），因此：

- `RunSession.local.nextSeq(namespace, key)` 提供“按 namespace/key 的单调序号”。
- 典型用途：为不同 instance 分配 `eventSeq/opSeq`，确保同一输入下排序稳定。

入口：`packages/logix-core/src/internal/observability/runSession.ts`（`RunSessionLocalState.nextSeq`）。

### 2.2 EvidenceCollector：把 Debug.Event 收敛为 `debug:event` envelope

`makeEvidenceCollector(session)` 会构造一个 `collector.debugSink`，其核心步骤：

1. 读取 `currentDiagnosticsLevel`，决定是否生成/导出 `RuntimeDebugEventRef`。
2. 生成每个 instance 的 `eventSeq`（来自 `session.local.nextSeq('eventSeq', instanceId)`）。
3. `toRuntimeDebugEventRef(event, { diagnosticsLevel, eventSeq, onMetaProjection })`：
   - 规范化事件锚点（moduleId/instanceId/txnSeq/…）
   - 投影 meta 并累计预算统计
4. 再对 `RuntimeDebugEventRef` 做一次 `projectJsonValue(ref)`，确保最终 payload 可序列化并统计 budget。
5. `sink.record('debug:event', projected.value, { timestamp: ref.timestamp })` 写入证据流。

入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`。

结论：EvidenceCollector 是“导出边界的最终把关者”——它确保导出的每条事件都符合 Slim/预算约束。

### 2.3 EvidencePackage：事件 envelope + summary（协议化、可 diff）

EvidenceCollector 最终导出 `EvidencePackage`：

- `events[]`：`ObservationEnvelope`（protocolVersion/runId/seq/timestamp/type/payload）
- `summary?`：可选摘要（converge static IR、runtime kernel/services evidence 等）

入口：

- 结构：`packages/logix-core/src/internal/observability/evidence.ts`
- 底层 sink：`packages/logix-core/src/internal/observability/runSession.ts`（`makeEvidenceSink`）

### 2.4 `trialRunModule`：结构 + 环境 + 证据 + artifacts（一次性对齐）

`trialRunModule(root, options?)` 把“平台想要的一揽子输入”一次性导出：

- `manifest`：模块表面积（用于 diff/影响面分析）
- `staticIr`：静态 IR（用于结构解释/锚点回链）
- `environment`：tagIds/configKeys/missingServices/missingConfigKeys（用于依赖预检）
- `evidence`：EvidencePackage（用于可解释链路/离线分析）
- `artifacts`：TrialRunArtifacts（用于扩展导出 side-channel 产物）

实现入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`。

它做的关键编排（理解“失败也能解释”必须看这个）：

- 创建 `RunSession` 与 `EvidenceCollector`
- 通过 `appendSinks` 把 collector.debugSink append 进当前 Fiber sinks
- 通过 `diagnosticsLevel(options?.diagnosticsLevel)` 控制导出档位
- 尝试提取 Manifest/StaticIR/Artifacts，并在失败时解析 Cause：
  - `parseMissingDependencyFromCause` 解析 missing services/config keys
  - `toSerializableErrorSummary` 把错误投影为可序列化摘要

结论：TrialRun 是平台/CI 的“最小可执行规格”入口：不依赖 UI，也不依赖人工读源码。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：CI 合同守护（结构 diff + 证据解释）

目标：PR 里做两道门禁：

1. cheap gate：`manifest.digest/staticIr.digest` 判断是否需要进一步计算；
2. explainable gate：对 `evidence.events` 做结构化检查（例如出现 `warn:priority-inversion` 就提示回链）。

落点入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`。

### 3.2 剧本 B：依赖预检（提前暴露 missingServices/missingConfigKeys）

目标：合并前就告诉作者缺什么，而不是“运行时报错 + 只给堆栈”。

要点：

- TrialRun 会从 Cause/错误消息里保守解析 missing（多策略正则 + 去重排序）。
- 输出字段是稳定数组（排序后），适合 diff 与门禁。

入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`（`parseMissingDependencyFromCause`）。

### 3.3 剧本 C：扩展导出（TrialRunArtifacts）——把特定结构做成 side-channel

目标：某些信息不适合塞进 debug meta（太大/太复杂），但又必须导出给平台使用。

做法：

- 通过 registry 注册 artifact exporter；
- TrialRun 期间收集 artifacts 并输出到 report；
- 平台侧把 artifact 当作“构建产物”消费（而不是从事件里拼装）。

入口示例：`packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts`。

## 4. 代码锚点（Code Anchors）

- `packages/logix-core/src/internal/observability/trialRunModule.ts`：TrialRun 编排与失败可解释性。
- `packages/logix-core/src/internal/observability/evidenceCollector.ts`：EvidenceCollector（双重投影 + budget）。
- `packages/logix-core/src/internal/observability/runSession.ts`：RunSession + EvidenceSink（seq/once）。
- `packages/logix-core/src/internal/observability/evidence.ts`：EvidencePackage 协议（export/import）。
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`toRuntimeDebugEventRef`（事件规范化）。

## 5. 常见坑（Anti-patterns）

- 把 TrialRun 当成“跑业务逻辑”：它的目标是结构/依赖/证据，不是 end-to-end 行为正确性。
- `maxEvents` 不设上界：事件密集场景会产生巨大证据包，影响 diff 与存储成本。
- 永远 `diagnosticsLevel=full`：会把取证成本变成常态税；应先用 `light/sample`，必要时再抬档位。
- 把复杂对象图塞进 summary/meta：summary 也必须是 `JsonValue`，并受预算裁剪影响。
