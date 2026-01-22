---
title: 观测 / 证据 / 回放 教程 · 剧本集（DebugSink → DevtoolsHub/EvidenceCollector → EvidencePackage → ReplayLog）
status: draft
version: 1
---

# 观测 / 证据 / 回放 教程 · 剧本集（DebugSink → DevtoolsHub/EvidenceCollector → EvidencePackage → ReplayLog）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味与平台/工具开发对齐。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。  
> **你将学会**：如何把“运行时发生了什么”稳定地落成可序列化证据（EvidencePackage），并把它用于 Devtools、CI 审阅、离线分析与回放（re-emit）。

这条链路在本仓的核心目标不是“更花哨的日志”，而是三件事：

1. **可解释**：任何一个异步/并发/收敛结果，都能回答“为什么发生 / 由谁触发 / 影响范围是什么”。
2. **可对比**：同一模块/同一脚本在不同版本、不同运行中能被 diff（且能归因到结构变化，而不是随机噪声）。
3. **可回放**：问题复现依赖“事件事实源（Event Log）”，不是“重新发真实请求”。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速把“这条证据链路怎么跑起来”塞进脑子：

1. 先读 SSoT（协议口径）：
   - Debug/Devtools 入口：`docs/ssot/runtime/logix-core/observability/README.md`
   - DebugSink 与事件投影：`docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md`、`docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`
   - Replay 口径（re-emit）：`docs/ssot/runtime/logix-core/observability/09-debugging.06-replay.md`
2. 再读代码锚点（把文档对齐到实现）：
   - Debug public API：`packages/logix-core/src/Debug.ts`
   - DebugSink 实现：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
   - DevtoolsHub（in-process 聚合）：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
   - EvidenceCollector（trial-run 聚合）：`packages/logix-core/src/internal/observability/evidenceCollector.ts`
   - EvidencePackage 模型：`packages/logix-core/src/internal/observability/evidence.ts`
   - JsonValue 投影与预算：`packages/logix-core/src/internal/observability/jsonValue.ts`
   - TrialRun / TrialRunModule：`packages/logix-core/src/internal/observability/trialRun.ts`、`packages/logix-core/src/internal/observability/trialRunModule.ts`
3. 最后把它放进“参考系”里对齐：
   - tick/txn/op 的锚点关系：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
   - digest/diff/anchors 的稳定心智：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`

## 1. 心智模型（把观测与证据放进同一个坐标系）

### 1.1 你看到的不是“日志”，而是“事件事实源 + 投影边界”

在这仓里，观测链路是两层结构：

1. **宿主内事件（Debug.Event）**：允许携带 richer 对象图（例如 state/cause/内部引用），但这层不是协议，不保证可序列化。
2. **可导出投影（RuntimeDebugEventRef / JsonValue）**：必须可 JSON 序列化、Slim、受预算裁剪，并能在离线环境被工具消费。

核心约束是：

> 可以在宿主内“知道很多”，但导出边界必须“知道得很克制”。

对应实现里，这条边界由 `toRuntimeDebugEventRef(...)` + `projectJsonValue(...)` 强制执行：

- `toRuntimeDebugEventRef`：把 Debug.Event 归一化为 `RuntimeDebugEventRef`（稳定字段位 + meta/错误摘要）。
- `projectJsonValue`：把任何对象投影成 `JsonValue`，并统计 `dropped/oversized/nonSerializable`（用于 explainability）。

### 1.2 三个“收敛单位”：事务、tick、证据包

你可以把“观测数据”按三个粒度理解：

- **事务粒度**（txnSeq/txnId）：解释“这次入口里写了什么、影响域是什么、为什么只 commit 一次”。
- **tick 粒度**（tickSeq）：解释“哪些模块/哪些 topics 在同一次对外快照里被推进、为何 yield-to-host、为何 stable=false”。
- **证据包粒度**（EvidencePackage/runId）：解释“这次运行的可导出事实源”，用于 CI/审阅/离线。

这些粒度之间靠锚点串联：`moduleId/instanceId/txnSeq/txnId/opSeq/linkId/tickSeq`。

### 1.3 两个聚合器：DevtoolsHub vs EvidenceCollector

这仓里同时存在两个“把 Debug 事件落地”的聚合器，它们解决不同问题：

1. **DevtoolsHub（进程内、持续运行）**
   - 目标：给 React/Devtools UI 提供“可订阅快照”（ring buffer + latestStates）。
   - 关键不变量：`snapshotToken` 是订阅安全的真相源；token 不变则对外快照不变（避免 tearing）。
   - 入口：`Debug.devtoolsHubLayer(...)`（通过 append sinks 的方式启用，不覆盖其它 sinks）。
2. **EvidenceCollector（试运行/脚本、一次性导出）**
   - 目标：在 trial-run / CI / 工具里把事件导出为 `EvidencePackage`（可落盘、可上传、可 diff）。
   - 特点：每次 trial-run 有独立 `RunSession`（隔离 seq/once，避免跨 run 污染）。
   - 入口：`TrialRun.trialRun(...)` / `TrialRun.trialRunModule(...)`（内部自动装配 collector layer）。

经验法则：

- 做 UI 调试 → 先用 DevtoolsHub（订阅快照）。
- 做 CI/离线分析/合同守护 → 用 EvidenceCollector（EvidencePackage）。

### 1.4 DiagnosticsLevel：默认近零成本，但可“抬档位取证”

观测链路的最大敌人是“为了可观测性把核心路径拖慢”。因此本仓把诊断分档并强制门控：

- `off`：尽可能接近零成本（可完全不导出事件；或只留极少错误）。
- `light`：可解释但克制（Slim 元信息 + 预算裁剪，禁止长列表/大对象图）。
- `full`：允许携带更多证据（仍有硬上界），用于深挖/回放/对齐。

`DiagnosticsLevel` 不只是“写多少日志”，它会影响：

- 是否分配 `eventSeq/opSeq`（RunSession 维度序号）；
- `meta` 的投影与裁剪；
- 是否导出 converge 静态 IR 的去重摘要（见 `DevtoolsHub.exportDevtoolsEvidencePackage` 与 `EvidenceCollector.registerConvergeStaticIr`）。

## 2. 核心链路（从 0 到 1：事件 → 聚合 → 导出证据）

下面按“真实代码路径”串起整条链路。

### 2.1 事件从哪里来：`Debug.record(event)`

所有运行时/内核/trait/调度相关的“可解释事实”最终都会调用 `Debug.record(...)`：

- 业务入口：`packages/logix-core/src/Debug.ts`
- 内部实现：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（由 `DebugSink.ts` re-export）

DebugSink 本质是一个 **FiberRef 驱动的 sink 列表**：

- 当前 fiber 的 sinks 存在 `Debug.internal.currentDebugSinks`；
- `Debug.appendSinks(...)` 会在当前 scope/fiber 上追加 sinks（不覆盖已有 sinks）；
- `Debug.layer()` 是“默认策略”，按 mode（dev/prod/off）选择 console/error-only/noop sinks。

### 2.2 DevtoolsHub：把 Debug 事件聚合成可订阅快照

启用方式：`Debug.devtoolsHubLayer(...)`。

它会做三件事：

1. `DevtoolsHub.configureDevtoolsHub(options)`：启用 hub 并设定 bufferSize。
2. `Debug.appendSinks([DevtoolsHub.devtoolsHubSink])`：把 hub sink 加入 DebugSink 列表。
3. 打开 exportable diagnostics + converge sampling（可选）：
   - `diagnosticsLevel(options.diagnosticsLevel ?? 'light')`
   - `traitConvergeDiagnosticsSampling(...)`（若配置）
   - `appendConvergeStaticIrCollectors([...])`（让 converge IR 能被 hub 去重并导出）

DevtoolsHub 的关键不变量（你在 UI/订阅层必须牢记）：

- `snapshotToken` 单调递增；
- token 不变 → 快照内容不得变化；
- 通知 listener 通过 microtask 批处理（减少事件风暴对主线程干扰）。

代码锚点：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

### 2.3 EvidenceCollector：把 Debug 事件导出为 EvidencePackage（trial-run）

EvidenceCollector 的设计目标是：**把一次运行的证据闭包在一个 RunSession 中**，并把导出边界做成可解释、可度量。

关键组件：

- `RunSession`：`runId/source/startedAt` + `local.once/nextSeq`（隔离每次运行的序号/去重 key）。
  - 入口：`packages/logix-core/src/internal/observability/runSession.ts`
- `makeEvidenceSink(session)`：把事件写成 `ObservationEnvelope[]`（带 `seq/timestamp/type/payload`），导出为 `EvidencePackage`。
  - 入口：同上 `runSession.ts`
- `makeEvidenceCollector(session)`：
  - sink：把 `debug:event` 记录进 EvidenceSink；
  - meta 投影：`toRuntimeDebugEventRef(...)` + `projectJsonValue(...)`；
  - summary：可选挂载 `kernelImplementationRef`、`runtimeServicesEvidence`、`converge.staticIrByDigest`。
  - 入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`

### 2.4 TrialRun / TrialRunModule：最小“可复现证据闭环”入口

你在 CI/工具/平台里最常用的两个入口：

- `trialRun(program, options)`：跑任意 Effect 程序，导出 `{ exit, evidence }`。
  - 入口：`packages/logix-core/src/internal/observability/trialRun.ts`
- `trialRunModule(root, options)`：受控加载模块并 boot/close，导出更完整的 `TrialRunReport`：
  - `manifest`（可序列化）+ `staticIr`
  - `artifacts`（可扩展 exporter，带 digest 去重）
  - `environment`（缺失服务/缺失 config keys 等）
  - `evidence`（EvidencePackage）
  - 入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`

它们的共同点是：**自动装配 RunSession + EvidenceCollector + Debug sinks**，并用 `DiagnosticsLevel` 门控成本与证据密度。

### 2.5 EvidencePackage：统一可搬运的“证据胶囊”

EvidencePackage 的形态非常克制：

- `protocolVersion/runId/createdAt/source`
- `events[]`：按 `seq` 排序的 `ObservationEnvelope`
- `summary?`：可选的 JsonValue（例如 converge staticIrByDigest）

入口：`packages/logix-core/src/internal/observability/evidence.ts`

你可以把 EvidencePackage 视为：

> “给 Devtools/CI/平台搬运的一段事实源录像”，它不依赖宿主环境、不会携带闭包/Effect/cause 对象图。

## 3. 剧本集（用例驱动：你要做什么 → 走哪条路径）

### A) 我想在应用里启用 Devtools（React/调试）

目标：让 Devtools UI 能订阅快照、看到时间线、导出证据。

路径：

- Runtime 层：通过 `Debug.devtoolsHubLayer(...)` 启用 hub sink（并设定 diagnostics 档位）。
- UI 层：订阅 `DevtoolsHub.getDevtoolsSnapshot()` / `subscribeDevtoolsSnapshot(listener)`，使用 `snapshotToken` 做 tearing-safe 订阅。
- 导出：用 `DevtoolsHub.exportDevtoolsEvidencePackage({ source })` 导出离线证据包。

代码锚点：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

### B) 我想在 CI 里做“结构 + 证据”的合同守护（不跑浏览器）

目标：跑一段受控试运行，导出：

- `ModuleManifest` + `StaticIr`（结构证据：可 diff / 可门禁）
- `EvidencePackage`（动态证据：事件链路 / 降级原因）

路径：`trialRunModule(root, { diagnosticsLevel, layer, buildEnv, maxEvents })`。

提示：

- 缺失依赖会被结构化为 `MissingDependency`（并返回 missingServices/missingConfigKeys）。
- `diagnosticsLevel=off` 会极度克制证据密度；要做合同守护通常至少 `light`。

代码锚点：`packages/logix-core/src/internal/observability/trialRunModule.ts`

### C) 我想解释“为什么这次 tick stable=false / 为什么 yield-to-host”

目标：把“调度/预算/降级”从玄学变成可解释事实。

路径：

- 开启 `diagnosticsLevel=light/full`，确保 `trace:tick` 会被投影并进入 EvidencePackage/DevtoolsHub。
- 在时间线里按 `tickSeq` 聚合查看同 tick 的：
  - `trace:tick`（start/settled/budgetExceeded）
  - `warn:microtask-starvation`（若存在）
  - 关联的 `state:update`（包含 txn 证据）

参考：

- tick 参考系教程：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
- 073 诊断口径：`specs/073-logix-external-store-tick/contracts/diagnostics.md`

### D) 我想把一条长链路（action → IO → writeback）串成可解释因果链

目标：把“发生了这些事情”串成一条可读链路（而不是散点日志）。

路径（关键锚点）：

- `txnSeq/txnId`：归因到事务入口（state:update）。
- `linkId`：归因到 operation 链路（跨模块/嵌套操作共享）。
- `opSeq`：用于“同一 run 内稳定排序与对齐”（在 evidence diff 中去噪）。

实现锚点：

- `RuntimeDebugEventRef` 口径：`docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`
- opSeq 生成：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`

### E) 我想做离线排障：把证据包发给别人也能看懂

目标：在没有源码环境、没有真实服务的离线环境中也能解释问题。

路径：

- 导出 EvidencePackage（来自 DevtoolsHub 或 trialRun）。
- 重点关注：
  - `exportBudget`（dropped/oversized/nonSerializable）：它解释“为什么某些字段缺失/被截断”。
  - `summary`：例如 converge staticIrByDigest（允许离线解释 converge 决策）。

补充：对“结构 + 动态”的组合排障，优先把 digest/diff 与证据包一起发送（避免只发事件流导致信息不完整）。

### F) 我想做回放（Replay）：复现 bug 但不打真实请求

SSoT 口径：**Replay Mode 下必须 re-emit，而不是 re-fetch**。

这意味着：

- live 模式：source-refresh 正常 fetch，并把 `ResourceSnapshot` 追加进 ReplayLog；
- replay 模式：source-refresh 不发请求，只从 ReplayLog 消费下一条事件并写回；
- 若缺失对应事件：不要静默降级为真实请求，而是停在当前状态以暴露“事实源不完整”。

入口导航：`docs/ssot/runtime/logix-core/observability/09-debugging.06-replay.md`

## 4. 代码锚点（Code Anchors）

- Debug public API（layer/append/replace/devtoolsHubLayer）：`packages/logix-core/src/Debug.ts`
- DebugSink 协议与投影（Debug.Event → RuntimeDebugEventRef）：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- DevtoolsHub（snapshotToken/ringBuffer/export）：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- EvidencePackage 模型：`packages/logix-core/src/internal/observability/evidence.ts`
- EvidenceCollector（trial-run sink + summary）：`packages/logix-core/src/internal/observability/evidenceCollector.ts`
- JsonValue 投影与预算（hard gate）：`packages/logix-core/src/internal/observability/jsonValue.ts`
- RunSession（runId/once/nextSeq）：`packages/logix-core/src/internal/observability/runSession.ts`
- TrialRun/TrialRunModule：`packages/logix-core/src/internal/observability/trialRun.ts`、`packages/logix-core/src/internal/observability/trialRunModule.ts`
- SSoT（协议口径）：
  - `docs/ssot/runtime/logix-core/observability/README.md`
  - `docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md`
  - `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`
  - `docs/ssot/runtime/logix-core/observability/09-debugging.06-replay.md`

## 5. 验证方式（Evidence）

当你改动观测/证据链路（尤其是核心路径上的 DebugSink/投影/聚合器），建议至少做三类验证：

1. **协议边界**：导出的 `EvidencePackage` 必须总是可 JSON 序列化（再坏也要变成 `[Unserializable]` 或 `_tag:'oversized'`），且 exportBudget 计数可解释。  
   锚点：`packages/logix-core/src/internal/observability/jsonValue.ts`
2. **订阅安全**：DevtoolsHub 的 `snapshotToken` 不变时，外部可见快照不得变化；通知必须先推进 token，再通知 listeners（避免 tearing）。  
   锚点：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
3. **可对比性**：同一脚本的证据 diff 应主要由结构变化驱动，而不是 runId/时间戳噪声；关键锚点（txnSeq/opSeq/linkId）需要稳定生成并出现在投影中。  
   锚点：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`、`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`

## 6. 常见坑（Anti-patterns）

- 把 Debug 事件当作“随便塞对象图”的日志：会在投影边界被裁剪/降级，导致“我明明记录了但离线看不到”。
- 在核心路径上无门控地输出密集 trace：没有 `DiagnosticsLevel` 的分档与采样，会把运行时拖慢并污染证据。
- 绕过 `Debug.record` 自己建第二条事件流：会制造并行真相源，Devtools/CI 很难对齐与解释。
- 依赖 re-fetch 回放：回放必须基于事实源重赛，否则无法复现、也无法解释“当时到底发生了什么”。

