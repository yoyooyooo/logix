---
title: 诊断协议教程 · Slim 事件、预算与“可解释链路”（从 0 到 1）
status: draft
version: 1
---

# 诊断协议教程 · Slim 事件、预算与“可解释链路”（从 0 到 1）

> **定位**：本文是面向维护者/平台开发者的“诊断协议教程/剧本集”。目标是把“默认近零成本的运行时”与“按需可解释/可回放的证据”统一到一条可落地的链路里。  
> **重要**：本文不是裁决来源；最终 MUST/边界/协议以 `docs/ssot/platform/**` 与 `docs/ssot/runtime/**` 为准；本文负责把它们落到“怎么实现、怎么验证、怎么排障”。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速把“诊断协议到底解决什么、链路在哪里”塞进脑子里：

1. 读「1.1 诊断不是日志：它是最小动态 IR」与「1.3 Slim：可序列化 + 有预算」。
2. 读「2.2 `DebugSink.record` 的三条 fast-path」理解“默认近零成本”如何实现。
3. 读「2.4 `toRuntimeDebugEventRef`：把 Event 变成可导出的引用」理解“可解释链路”的结构。
4. 最后挑一个剧本（3.x），按“代码锚点”去定位你要改的落点。

如果你想先看“观测/证据/回放”的整体闭环，再回到本文深挖事件模型：先读 `docs/ssot/handbook/tutorials/04-observability-evidence-replay.md`。

## 1. 心智模型（统一口径）

### 1.1 诊断不是日志：它是最小动态 IR（Dynamic Trace）

在本仓语境里，“诊断（Diagnostics）”不是 `console.log` 的升级版，而是一种 **最小动态 IR**：

- **结构化**：事件必须能投影成 `JsonValue`（可序列化，便于导出/存档/对比）。
- **可解释**：事件要携带足够锚点（moduleId/instanceId/txnSeq/…），能回链到静态结构（Manifest/Static IR）与源码锚点（Anchors）。
- **可控成本**：默认 `diagnosticsLevel=off`（近零成本）；需要时“抬档位取证”，但仍有硬上界与降级理由。
- **可扩展**：允许 `trace:*` 作为扩展钩子，但必须遵守 Slim/预算/稳定性约束。

经验法则：如果某个信息需要进入 Devtools/CI/平台对齐，就应该以“事件（Event）”进入诊断链路，而不是写散落日志。

### 1.2 三层对象：`Event` / `RuntimeDebugEventRef` / `EvidencePackage`

诊断链路的三个关键对象（从“产生”到“导出”）：

1. **`Debug.Event`（原始事件）**：运行时/React/Process 等层直接发出的事件结构。它允许携带 `unknown`/原始对象，但不能直接导出。
   - 定义入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type Event = ...`）
2. **`RuntimeDebugEventRef`（可导出引用）**：把 `Event` 规范化后的可导出结构（强约束：`meta?: JsonValue`）。
   - 转换入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const toRuntimeDebugEventRef`）
3. **`EvidencePackage`（证据包）**：面向 CI/离线分析/回放的协议产物（事件 envelope + summary + protocolVersion）。
   - 典型导出入口：
     - `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`exportDevtoolsEvidencePackage`）
     - `packages/logix-core/src/internal/observability/evidenceCollector.ts`（`exportEvidencePackage`）

这三者的边界很关键：**允许在 `Event` 层写“方便生产者”的字段；但导出边界必须统一投影为 Slim 的 `JsonValue`**。

### 1.3 Slim：可序列化 + 有预算 + 可解释降级

所谓 Slim，不是“字段少”，而是同时满足三点：

- **可序列化**：最终进入 `RuntimeDebugEventRef.meta` / `EvidencePackage` 的必须是 `JsonValue`（对象/数组/字符串/数字/布尔/null）。
- **有预算**：任何投影都可能触发裁剪（dropped/oversized/nonSerializable），必须可统计、可解释、可回溯。
- **可解释降级**：当投影裁剪发生时，事件里要能携带 `downgrade`（原因码），并在导出侧累计 `exportBudget`，避免“用户看到信息缺失但不知道为什么”。

实现抓手：

- `projectJsonValue(...)`：投影为 `JsonValue`，并返回 `stats`（dropped/oversized/nonSerializable）与 `downgrade`。
  - 入口：`packages/logix-core/src/internal/observability/jsonValue.ts`
- `toRuntimeDebugEventRef` 内对不同事件的 `metaInput` 选择（light/full 的不同投影）。
  - 入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

### 1.4 两个门控旋钮：sinks vs `DiagnosticsLevel`

理解“为什么默认近零成本”最重要的一点：**本仓把‘是否处理事件’与‘事件是否能导出/多详细’拆成了两层门控**。

1. **Sinks（`currentDebugSinks`）**：是否有 sink 会消费事件（可能是 error-only、console、devtools、evidence collector…）。
   - 定义入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const currentDebugSinks`）
2. **`DiagnosticsLevel`（`currentDiagnosticsLevel`）**：是否做 enrichment / 是否把事件规范化为可导出的 `RuntimeDebugEventRef` / meta 投影有多详细。
   - 定义入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type DiagnosticsLevel = 'off' | 'light' | 'sampled' | 'full'`）

关键结论：

- **没有 sinks**：绝大多数高频事件直接走 fast-path 丢弃（只保留 `lifecycle:error/diagnostic` 的极小子集）。
- **有 sinks 但 `diagnosticsLevel=off`**：依然尽量不做额外 `FiberRef` 读取与 `Date.now()`；`toRuntimeDebugEventRef` 直接返回 `undefined`。
- **启用 DevtoolsHub/EvidenceCollector**：它们会把 `diagnosticsLevel` 提升到至少 `light`（默认），并承担投影/预算统计。

## 2. 核心链路（从 0 到 1：事件 → 聚合 → 导出）

### 2.1 事件从哪里来：统一入口 `Debug.record(event)`

所有“希望被解释/被导出/被回放”的事实，最终都应走 `Debug.record(event)`：

- 公共入口：`packages/logix-core/src/Debug.ts`（`export const record = Internal.record`）
- 事件 union：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type Event = ...`）

你会在事件里看到多个层级的信号（示例，不穷举）：

- 生命周期：`module:init`、`module:destroy`、`lifecycle:phase`、`lifecycle:error`
- 状态/动作：`action:dispatch`、`state:update`
- 进程：`process:*`
- 诊断与警告：`diagnostic`、`warn:*`
- 扩展 trace：`trace:*`（含 `trace:trait:*`、`trace:tick`、`trace:effectop` 等）

### 2.2 `DebugSink.record` 的三条 fast-path：默认近零成本的关键

`Debug.record` 实际执行的是 `DebugSink.record`（Effect）：

- 实现入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const record`）

它有三条关键 fast-path（每条都在“热路径成本”上非常关键）：

1. **errorOnly 单 sink fast-path**：production 默认只装 `errorOnlyLayer`（只保留 `lifecycle:error` 与 `diagnostic(warn/error)`），高频事件不做任何 enrichment/投影。
2. **sinks 为空 fast-path**：没装任何 sink 时，仍只保留极小子集（browser 下做 console 渲染；node 下写 error/diagnostic 日志）。
3. **`diagnosticsLevel=off` 的 enrichment 抑制**：即使装了 sinks，高频事件也尽量不额外 `Date.now()` / `FiberRef`；只有低频 `lifecycle:error/diagnostic` 才允许补 timestamp 以便调试。

这是“性能与可诊断性并存”的底层保证：**诊断不是常态税（tax），而是按需付费**。

### 2.3 `DiagnosticsLevel`：off / light / sampled / full 的语义

`DiagnosticsLevel` 影响的是“事件能否被规范化/导出，以及 meta 投影的颗粒度”：

- `off`：近零成本；`toRuntimeDebugEventRef` 返回 `undefined`；多数事件不会补 timestamp/runtimeLabel 等。
- `light`：Slim 元信息（偏“解释链路”）；对 meta 做克制投影（只保留最必要字段）。
- `sampled`：light-like（在实现里与 `light` 同类投影），但语义上允许上层按采样策略减少事件密度。
- `full`：允许更丰富的 meta（仍需预算/可序列化），用于深挖/回放/对齐。

实现入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export type DiagnosticsLevel = ...`）。

### 2.4 `toRuntimeDebugEventRef`：把 `Event` 变成可导出引用（含稳定锚点）

`toRuntimeDebugEventRef(event, options?)` 做了两件事：

1. **补齐稳定锚点**（让事件能“对齐/排序/回链”）：
   - `moduleId/instanceId/runtimeLabel`
   - `txnSeq/txnId`（默认会把 `txnSeq>0` 的事件构造成 `txnId = "${instanceId}::t${txnSeq}"`）
   - `linkId`（trace:* 可从 `data.meta.linkId` 兜底提取）
   - `eventSeq/eventId`（单调递增，`eventId = makeEventId(instanceId, eventSeq)`）
2. **把 payload 投影为 Slim `meta?: JsonValue`**（并累计 downgrade）：
   - light/sample：只保留 meta 的最小子集（例如 `trace:tick` 只保留 tickSeq/phase/budget/backlog 等摘要）
   - full：允许 meta 更详细，但仍要经过 `projectJsonValue` 的预算裁剪

实现入口：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`export const toRuntimeDebugEventRef`）。

这一步是“可解释链路”的核心：**不是把所有原始数据塞进去，而是把‘足以解释并能对齐’的最小证据塞进去**。

### 2.5 DevtoolsHub：把事件聚合成 Snapshot（并可导出 EvidencePackage）

DevtoolsHub 是进程/页面级的 Debug 事件聚合器（global singleton）：

- 实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- 开启方式：`packages/logix-core/src/Debug.ts`（`Debug.devtoolsHubLayer(options?)`）

它提供一个对 UI 友好的 Snapshot API（关键点是 `snapshotToken`）：

- `snapshotToken` 单调递增：任何对外可见变化都必须 bump；token 不变则外部不可观察字段不得变化（防 tearing）。
- Snapshot 内部结构采用“只读约定”直接引用内部 Map/Array，避免每个事件都 copy（减少主线程干扰）。
- 订阅通知在 microtask 中批量触发（避免 per-event notify）。

导出：`DevtoolsHub.exportDevtoolsEvidencePackage({ runId?, source?, protocolVersion? })` 会把 ring buffer 的事件封装成 `EvidencePackage`（`type: 'debug:event'`）。

### 2.6 EvidenceCollector：在 TrialRun/CI 场景收集证据包（含预算统计）

EvidenceCollector 面向“离线/CI/工具链”的证据收集：

- 实现入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`
- 关键行为：
  - 读取 `currentDiagnosticsLevel`，为每个 instance 生成 `eventSeq`（RunSession local counter）
  - 把 `Event` → `RuntimeDebugEventRef` → `JsonValue` 投影，并把投影统计累计到 `exportBudget`
  - 允许额外注册：converge static IR、kernelImplementationRef、runtimeServicesEvidence

你可以把它理解为：**把 DebugSink/DevtoolsHub 的能力“转成可落盘的协议产物”**。

### 2.7 `trialRunModule`：结构（Manifest/StaticIR）+ 环境（missing deps）+ 证据（EvidencePackage）

`Observability.trialRunModule` 是把 IR 全链路做成工具/平台输入的关键入口：

- 实现入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`
- 目标特性（面向 CI/平台）：
  - 不执行业务 main：只覆盖 module boot + scope close
  - 失败也能解释：MissingDependency/Timeout/DisposeTimeout 等要分类与给 hint
  - 输出统一最小 IR：尽可能携带 `manifest/staticIr/evidence/environment`
  - 稳定锚点贯穿：`runId/instanceId/txnSeq/opSeq/eventSeq` 不得依赖随机性

这也是“诊断协议”的最佳落地演练场：**你可以用它验证新增事件/新增投影是否满足 Slim/预算/稳定性**。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：本地开发要看 Devtools Timeline（但不想日志淹没终端）

目标：在开发环境开启 DevtoolsHub 聚合事件，同时把 console 输出收敛到“诊断级别”。

建议做法：

- 组合 Layer 时用：
  - `Debug.layer({ mode: 'dev', devConsole: 'diagnostic' })`（让 console 只输出高价值诊断/错误）
  - `Debug.devtoolsHubLayer({ diagnosticsLevel: 'light', bufferSize: 500 })`（让 UI 有 snapshot + ring buffer）
- UI 侧用 `Debug.subscribeDevtoolsSnapshot(listener)` 订阅变化，并用 `Debug.getDevtoolsSnapshotToken()` 做 tearing-safe 判断。

代码锚点：

- `packages/logix-core/src/Debug.ts`（`layer` / `devtoolsHubLayer` / `subscribeDevtoolsSnapshot`）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`snapshotToken` / ring buffer 策略）

### 3.2 剧本 B：CI 要做合同守护（不跑浏览器），同时要“失败也能解释”

目标：对一个 Root 做一次受控试运行，拿到结构 + 证据，并在失败时输出 missing deps/原因链。

建议做法：

- 用 `Observability.trialRunModule(AppRoot, { diagnosticsLevel: 'light', maxEvents: 2000, ... })` 导出 `TrialRunReport`。
- 对比策略：
  - 用 `manifest.digest/staticIr.digest` 做 cheap gate（变没变）
  - 用 `EvidencePackage` 的事件摘要做 explainable gate（变了什么/为什么降级）

代码锚点：

- `packages/logix-core/src/internal/observability/trialRunModule.ts`
- `packages/logix-core/src/internal/observability/evidenceCollector.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（`toRuntimeDebugEventRef`）

### 3.3 剧本 C：生产环境默认近零成本，但要保留“出事可取证”的逃生通道

目标：平时保持 production 稳态性能；出现问题时可以提升诊断档位并导出证据。

建议约束：

- 默认用 `Debug.layer({ mode: 'prod' })`（等价于 error-only：只保留 `lifecycle:error` 与 `diagnostic(warn/error)`）。
- 如果要临时取证，优先：
  - `diagnosticsLevel: 'sampled'`（light-like 投影）+ 上层采样策略
  - 而不是直接 `full`（避免把取证成本变成线上常态税）
- 必须确保：取证开启/关闭可解释（通过导出的 budget/降级统计反映），并且不会引入事务窗口内 IO。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（error-only fast-path / diagnosticsLevel）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（导出 evidence package）

### 3.4 剧本 D：我要新增一个 `warn:*` 或 `diagnostic` 事件（并让它可解释、可 diff）

目标：新增事件不破坏“Slim + 预算 + 稳定性”，并能被 Devtools/CI 消费。

Checklist：

1. **先定事件语义边界**：它是 warn（可忽略但重要）还是 diagnostic（必须行动）？
2. **在 `Event` union 增加结构**：字段尽量是稳定原子值（number/string/boolean），复杂对象留到 `meta` 投影。
3. **在 `toRuntimeDebugEventRef` 补齐投影**：
   - light/sample：只保留“解释链路”必要字段
   - full：允许更多字段，但必须过 `projectJsonValue`
4. **稳定 reason code**：任何降级/裁剪/退化必须用稳定 enum 字符串（避免 diff 噪音）。
5. **补测试**：至少覆盖“投影稳定 + budget 统计可预期”。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（Event union + toRuntimeDebugEventRef）
- `packages/logix-core/src/internal/observability/jsonValue.ts`（投影预算）

### 3.5 剧本 E：为什么我在 UI/CI 看不到事件？

快速排查顺序：

1. 是否安装了 sink？（`Debug.layer` / `Debug.devtoolsHubLayer` / `appendSinks`）
2. 是否 `diagnosticsLevel=off`？（`toRuntimeDebugEventRef` 在 off 下直接返回 `undefined`）
3. bufferSize 是否为 0？（DevtoolsHub 会清空 ring buffer）
4. 是否被预算裁剪？（看 `exportBudget` 与事件的 `downgrade`）

## 4. 代码锚点（Code Anchors）

建议把下面这些文件当作“诊断协议的主战场”：

1. `packages/logix-core/src/Debug.ts`：公共 Debug API（record/layer/devtoolsHubLayer/diagnosticsLevel/exportEvidencePackage）。
2. `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：Event union、fast-path、`DiagnosticsLevel`、`toRuntimeDebugEventRef`（投影/降级/锚点补齐）。
3. `packages/logix-core/src/internal/runtime/core/DebugSink.layers.ts`：预置 layers（errorOnly/console/browserConsole/trait sampling）。
4. `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：SnapshotToken、ring buffer、订阅与导出证据包。
5. `packages/logix-core/src/internal/observability/evidenceCollector.ts`：EvidenceCollector（预算统计、debug:event 导出）。
6. `packages/logix-core/src/internal/observability/trialRunModule.ts`：TrialRun（结构+环境+证据的统一最小 IR）。
7. `packages/logix-core/src/internal/observability/evidence.ts`：EvidencePackage 协议与 `OBSERVABILITY_PROTOCOL_VERSION`。
8. `packages/logix-core/src/internal/observability/jsonValue.ts`：`projectJsonValue`（Slim/预算的硬边界）。
9. `packages/logix-core/src/internal/runtime/core/errorSummary.ts`：`SerializableErrorSummary`（错误的可序列化边界）。
10. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`：边界事件补齐（moduleId/instanceId/txnId/linkId 等的产生与传播点）。

## 5. 验证方式（Evidence）

把诊断协议当作“需要回归”的契约，建议最少验证三件事：

- **近零成本不被破坏**：`diagnosticsLevel=off` 下高频路径不引入额外分配/投影。
- **事件可导出且可解释**：`light/full` 下导出的 `RuntimeDebugEventRef` 全部可 `projectJsonValue`，且 budget/降级统计可解释。
- **证据不漂**：同一输入下事件排序、锚点、reason code 稳定（避免 diff 噪音）。

质量门与命令矩阵见：`docs/ssot/handbook/playbooks/quality-gates.md`。

## 6. 常见坑（Anti-patterns）

- 把 `Error` / `Cause` / 函数 / class 实例直接塞进 `meta`（一定会非序列化或产生巨型对象图）。
- 为了“更详细”在 light 档位也塞大列表/大对象（会被裁剪，反而让用户更困惑）。
- 用时间戳/随机数当稳定标识（会让 diff/回放/对齐全部失效）。
- 新增事件但没有稳定 reason code（导致 “为什么退化/为什么裁剪” 无法解释）。
- 在 `diagnosticsLevel=off` 的热路径里仍做昂贵操作（Date.now、FiberRef 深读、JSON stringify、深拷贝）。
