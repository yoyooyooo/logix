---
title: DevtoolsHub 教程 · SnapshotToken、RingBuffer 与 no-tearing 订阅（从 0 到 1）
status: draft
version: 1
---

# DevtoolsHub 教程 · SnapshotToken、RingBuffer 与 no-tearing 订阅（从 0 到 1）

> **定位**：本文讲清楚 DevtoolsHub 作为“进程/页面级诊断聚合器”的设计与使用方式：如何做到 UI 可订阅、事件密集但不拖垮热路径，以及为什么 `snapshotToken` 是 no-tearing 的关键。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/25-diagnostics-slim-events-explainability.md` 与 `docs/ssot/handbook/tutorials/26-debugsink-event-model-and-projection.md`。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.2 `snapshotToken` 契约」理解 no-tearing。  
2. 读「2.2 ring buffer 的性能策略」理解为什么不做 per-event copy。  
3. 读「3.1 剧本 A：把 DevtoolsHub 接到 UI」马上能用。

## 1. 心智模型（DevtoolsHub 是什么，不是什么）

### 1.1 DevtoolsHub 是“全局单例聚合器”，但是否导出由 FiberRef 控制

DevtoolsHub 是 global singleton（进程/页面级）：

- 实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

但它并不是“永远开着的全量采集器”，它的写入与导出由 `currentDiagnosticsLevel` 等 FiberRef 控制：

- 只有显式启用 `Debug.devtoolsHubLayer(...)` 才会把 `devtoolsHubSink` append 到当前 Fiber sinks。
- `diagnosticsLevel=off` 时 `toRuntimeDebugEventRef` 返回 `undefined`，DevtoolsHub 不会写 ring buffer / latest* caches（但仍会维护极小 counters/labels，便于 UI 看到“实例数量”变化）。

这让“一个进程里不同 scope 可以有不同诊断基线”成为可能：比如业务逻辑 scope 维持 `off`，而某个试运行/对齐 scope 提升到 `light/full`。

### 1.2 `snapshotToken` 契约：它是 no-tearing 的唯一真相源

DevtoolsHub 的 Snapshot API 有一个硬约束（写在类型注释里）：

- `snapshotToken` 单调递增；
- **任何对外可见变化都必须 bump token**；
- **如果 token 没变，对外可见的 snapshot 字段不得变化**（否则订阅者会 tearing/漏更新）。

实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`bumpSnapshotToken` / `markSnapshotChanged`）。

这也是为什么 Snapshot 允许直接引用内部 Map/Array（只读约定）——只要 token 作为订阅协议被严格维护，就能做到“读快 + 不撕裂”。

### 1.3 Snapshot 的内容：三类缓存 + 一个窗口

DevtoolsHub 维护四类面向 UI 的结构：

1. `instances: Map<runtimeLabel::moduleId, count>`：实例计数（由 `module:init/module:destroy` 维护）。
2. `events: RuntimeDebugEventRef[]`：ring buffer（窗口化事件流）。
3. `latestStates: Map<runtimeLabel::moduleId::instanceId, JsonValue>`：最新 state 快照（来自 `state:update` 投影）。
4. `latestTraitSummaries: Map<runtimeLabel::moduleId::instanceId, JsonValue>`：最新 trait summary（来自 `state:update` 投影）。

加上 `exportBudget`（投影裁剪统计），用于解释“为什么信息缺失/被裁剪”。

## 2. 核心链路（从 0 到 1：Event → Snapshot）

### 2.1 `devtoolsHubLayer`：把 sink append 进 Debug sinks

公共入口：`packages/logix-core/src/Debug.ts`（`Debug.devtoolsHubLayer(options?)`）。

它做了三件事：

- `DevtoolsHub.configureDevtoolsHub(options)`：启用 hub、设置 bufferSize；
- `appendSinks([DevtoolsHub.devtoolsHubSink])`：把聚合 sink append 到当前 Fiber；
- `diagnosticsLevel(options?.diagnosticsLevel ?? 'light')`：默认抬档到 `light`，让事件可导出（否则 ring buffer 永远是空）。

### 2.2 ring buffer 的性能策略：small strict bound / large slack + batch trim

为什么不用 `shift()` 每次维护严格窗口？因为事件密集时会造成 O(n) 移动成本。

DevtoolsHub 的策略：

- 小窗口（`bufferSize <= 64`）：严格上界（每次都 ensure），避免“size=5 但 events.length 暂时 > 5”的惊讶。
- 大窗口：允许短 burst，超过阈值才批量 `splice(0, excess)`，并提供 slack（最多 1024 或 bufferSize/2）。

实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`trimRingBufferIfNeeded`）。

### 2.3 订阅通知：microtask 批处理，避免 per-event notify

DevtoolsHub 不会每条事件都同步通知订阅者，而是：

- 只要 snapshot 有变化，就 `scheduleMicrotask` 批量通知；
- 同一 microtask 内把多个事件合并成一次通知（减少主线程干扰）。

实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`scheduleNotify`，依赖 `HostScheduler`）。

### 2.4 hub sink 的职责边界：计数/缓存/窗口化，不做重逻辑

`devtoolsHubSink.record(event)` 内部按顺序做：

1. 读取 `currentDiagnosticsLevel`（决定是否导出/写窗口）。
2. 处理轻量 side-channel：
   - `trace:instanceLabel`：写入 `instanceLabels`（供 UI 展示友好名字）。
   - `module:init/module:destroy`：维护 instance 计数与 liveInstanceKeys，并在 destroy 时清理 latest* caches。
3. `toRuntimeDebugEventRef(event, ...)`：规范化事件并累计 `exportBudget`。
4. 如果 ref 存在：
   - 对 `state:update` 更新 latestStates/latestTraitSummaries（仅对“仍存活的 instanceKey”生效，避免 module:destroy 后重建缓存）。
   - 写 ring buffer（窗口化事件流）。
5. 若发生任何对外可见变化，调用 `markSnapshotChanged()` bump token + schedule notify。

实现入口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`export const devtoolsHubSink`）。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：把 DevtoolsHub 接到 UI（最小订阅闭环）

目标：UI 能订阅 snapshot 变化，并拿到“实例计数 + 最新 state + 事件窗口”。

步骤：

1. Runtime 侧启用：`Debug.devtoolsHubLayer({ diagnosticsLevel: 'light', bufferSize: 500 })`。
2. UI 侧订阅：
   - 用 `Debug.subscribeDevtoolsSnapshot(listener)` 注册监听；
   - 在 listener 里读取 `Debug.getDevtoolsSnapshotToken()` 与 `Debug.getDevtoolsSnapshot()`；
   - 如果你做外部订阅桥接（React external store），把 token 当作“版本号”。

代码锚点：

- `packages/logix-core/src/Debug.ts`（subscribe/getSnapshotToken）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（snapshotToken 契约）

### 3.2 剧本 B：导出 EvidencePackage（用于离线分析/回放/PR 附件）

目标：把当前 ring buffer 导出为 `EvidencePackage`（协议化产物）。

入口：

- `Debug.exportEvidencePackage({ runId?, source?, protocolVersion? })`（内部调用 `DevtoolsHub.exportDevtoolsEvidencePackage`）

注意：

- `diagnosticsLevel=off` 时 ring buffer 为空，导出的 package 也会极度稀疏；想要可解释链路至少 `light`。
- DevtoolsHub 在 full diagnostics 下会额外导出 converge static IR summary（按 staticIrDigest 去重）。

代码锚点：

- `packages/logix-core/src/Debug.ts`（`exportEvidencePackage`）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`exportDevtoolsEvidencePackage`）

### 3.3 剧本 C：为什么 UI 订阅到了变化，但读到的数据不一致？

排查 checklist（按优先级）：

1. 订阅者是否把 `snapshotToken` 当作版本号？（没有 token，必然 tearing）
2. 订阅者是否在 token 不变时仍假设 snapshot 内容会变？（违反契约）
3. 是否有人在 UI 侧误改了 snapshot 的 Map/Array？（只读约定被破坏）
4. 是否 bufferSize 为 0 或过小导致窗口看起来“跳”？

## 4. 代码锚点（Code Anchors）

- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：hub 的全部机制（token/窗口/订阅/导出/预算）。
- `packages/logix-core/src/Debug.ts`：公共接入点（devtoolsHubLayer/subscribe/export）。
- `packages/logix-core/src/internal/runtime/core/HostScheduler.ts`：microtask 调度（通知批处理的基础设施）。
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`toRuntimeDebugEventRef`（决定 ref 是否存在与 meta 结构）。

## 5. 常见坑（Anti-patterns）

- 在 hub 内部做 per-event 深拷贝/immutable snapshot：事件密集时会把 UI 自己拖慢。
- 在 token 不变时仍触发 UI 更新：会制造“幽灵重渲染”，且掩盖真实变更。
- 把 hub 当作“全量数据库”：它是窗口 + 最新缓存，不负责长期存储；长期存储应该走 EvidencePackage/Artifact。
