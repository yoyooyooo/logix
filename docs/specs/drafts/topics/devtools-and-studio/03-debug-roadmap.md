---
title: 'Logix Debugging & DevTools Roadmap'
status: draft
version: 0.1.0
layer: L9
value: core
priority: 2000
related:
  - ../../runtime-logix/core/09-debugging.md
  - ./runtime-logix-devtools-and-runtime-tree.md
  - ./runtime-logix-core-gaps-and-production-readiness.md
---

# Logix Debugging & DevTools Roadmap (Draft)

> 草稿目的：把当前 DebugSink / Debug.record 的实现现状梳理清楚，给出一条从「简单事件广播」演进到「完整 Trace + DevTools + 产线观测」的分阶段路线图，为后续 runtime-logix 规范与实现演化提供锚点。

## 0. 现状梳理（2025-12）

- 引擎层：
  - `packages/logix-core/src/debug/DebugSink.ts` 已实现 `DebugEvent` / `DebugSink` / `DebugSinkTag` / `NoopDebugSinkLayer` / `ConsoleDebugLayer` 与 `Debug.record` 辅助函数；
  - `ModuleRuntime` 在 `module:init` / `module:destroy`、`state:update`、`action:dispatch` 以及 `lifecycle:error` 时调用 `Debug.record` 广播事件，是当前唯一的核心使用面；
  - 当前 `Debug.record` 内部仍包含临时调试用 `console.log(...)`，这与「引擎不直接打印」的原则有偏差。
- 测试层：
  - `packages/logix-test/src/runtime/TestRuntime.ts` 通过监听 `actions$` / `changes(...)` 构造 `TraceEvent`，并额外通过提供 `DebugSinkTag` 实现捕获 `lifecycle:error` 事件；
  - Trace 目前仅用于测试内部断言与回放，尚未形成统一的 Trace ID / 因果链路语义。
- 规范层：
  - `docs/specs/runtime-logix/core/09-debugging.md` 已定义了 DebugSink 接口与基础事件类型，并提出「Action Trace 全链路追踪」与 Trace ID / Causality Graph 的目标，但尚属 Draft；
  - `docs/specs/drafts/L9/runtime-logix-devtools-and-runtime-tree.md` 聚焦 Runtime Tree / TagIndex / DevTools 观测面，与 DebugSink 存在交集但尚未细化对齐方式。

当前可以粗略认为：**DebugSink 是引擎级「事件广播接口」，TestRuntime/DevTools 是其主要消费者**，但缺少一条清晰的演进路线和分层边界。

## 1. 设计原则（SSoT 级别的约束候选）

1. **事件是接口，不是实现细节**  
   - `DebugEvent` 的字段与语义一旦在 SSoT 稳定，应视为引擎的公开调试协议，对上层 DevTools/Exporter 兼容负责；
   - 引擎内部不得随意增加「缺乏语义的临时字段」，新增事件类型必须经过草稿 → spec 的流程。

2. **引擎不直接打印，只负责广播事件**  
   - `@logix/core` 层不使用裸 `console.log`；所有调试/观测输出都通过 DebugSink / Effect.log* / 上层 DevTools 完成；
   - 开发模式下的「Console 输出」应由 `ConsoleDebugLayer` 或其他 Sink 实现，而不是散落在运行时代码中。

3. **分层清晰：Engine / DebugSink / Bridge / DevTools**  
   - Engine（ModuleRuntime / Logic / Flow DSL）只关心「何时产生什么事件」；
   - DebugSink 接收事件，并可做轻量缓冲 / 过滤，但不引入对外部系统的强耦合；
   - DevToolsBridge 负责把事件转成特定传输协议（postMessage/WebSocket/自定义 RPC）；
   - DevTools（浏览器扩展 / CLI / 可视化）只消费 Bridge 暴露的协议，不直接依赖 `@logix/core`。

4. **产线友好：可配置、可采样、可降级**  
   - 默认配置下，启用 DebugSink 不应显著拖慢引擎执行；需要支持「只采集错误」或「抽样部分 Trace」；
   - 在完全关闭调试的情况下，DebugSink 应降级为接近零成本的 Noop（包括避免大对象序列化）。

5. **与 Runtime Tree / TagIndex 一致的标识体系**  
   - Debug 事件中的 `moduleId` / `runtimeId` / `tag` 等标识应与 Runtime Tree / TagIndex 使用同一命名与 ID 体系；
   - DevTools 能够通过事件中的标识直接在 Runtime Tree 视图上高亮对应节点。

## 2. 演进路线概览

按「易落地 → 高价值」排序，建议拆为三阶段：

1. **Phase 1：DebugSink v1.1 — 稳定事件接口 & 清理实现**  
   - 目标：让 DebugSink 成为引擎可靠的观测接口，消除不必要的噪音与隐患；
   - 范围：仅涉及 `DebugEvent` 细节、`Debug.record` 实现、内置 Sink 类型与测试辅助。

2. **Phase 2：Trace & DevToolsBridge — 从事件到链路**  
   - 目标：在不打破现有事件模型的前提下，引入 Trace ID / Flow & Effect 事件，使 DevTools 能构建时间线与因果图；
   - 范围：扩展 DebugEvent 元信息、在 Flow/Effect 关键路径插桩、定义 DevToolsBridge 协议。

3. **Phase 3：Runtime Tree & Observability — 一体化观测面**  
   - 目标：把 TagIndex / Runtime Tree / Debug 事件统一到一个观测面中，为 Studio / 产线观测系统提供稳定接入点；
   - 范围：Runtime Tree 导出接口、与 TagIndex 对齐的 ID 体系、Exporter Sink（如上报到 OpenTelemetry/自研监控）。

后续可以视实现进度，将 Phase 1–2 的稳定部分并入 `runtime-logix/core/09-debugging.md`，Phase 3 与 `runtime-logix-devtools-and-runtime-tree` 草案合并。

## 3. Phase 1：DebugSink v1.1 · 近期落地项

### 3.1 接口与语义收敛

- 对 `DebugEvent` 做最小补充与澄清（候选）：
  - 明确 `moduleId` 的来源：优先使用用户在 `Logix.Module.make('Id', ...)` 层声明的 Id；未提供时允许为空或使用内部生成的 `runtimeId`；
  - 补充 `runtimeId?: string`（候选）：用于 AppRuntime / 分形 Runtime 场景下区分不同 Runtime 实例；
  - 对 `lifecycle:error` 的 `cause` 字段约定为「可序列化，但允许包含 Effect Cause」，DevTools 可选择性截断/摘要。
- 在 `runtime-logix/core/09-debugging.md` 中补充一小节「DebugEvent 语义约定」，明确哪些字段可以在未来扩展，哪些字段一旦稳定就视为协议的一部分。

### 3.2 实现治理与内置 Sink

- 重构 `Debug.record` 实现：
  - 移除当前用于调试的裸 `console.log`；仅保留「尝试获取 DebugSink → 若存在则调用 → 否则 Effect.void」逻辑；
  - 如有必要，在 `ConsoleDebugLayer` 内部使用 `Effect.logDebug` 输出事件，以支持按日志级别过滤。
- 内置三类标准 Sink（命名暂定）：
  - `NoopDebugSinkLayer`：引擎默认；所有事件直接忽略；
  - `ConsoleDebugLayer`：开发模式使用，结构化打印 DebugEvent（例如 JSON 序列化后单行输出）；
  - `MemoryDebugSinkLayer`：维护固定长度的 ring buffer，用于在 DevTools / 测试中回放最近 N 条事件。
- 为 `packages/logix-test` 提供辅助工具：
  - 导出一个 `TestDebugSinkLayer.make(traceRef)` 或类似工厂，内部实现参考当前 TestRuntime 对 `lifecycle:error` 的处理；
  - 确保测试层可以方便地将 Debug 事件合并进自己的 `TraceEvent` 结构，而不需要每个测试场景重新实现 `DebugSinkTag`。

### 3.3 使用约定与文档

- 在 runtime-logix 规范中增加「Engine vs Sink vs DevTools」的分层示意图；
- 在 examples 中提供一个 `debugsink-console-demo`：
  - 使用 `ConsoleDebugLayer` 观察 `module:init` / `action:dispatch` / `state:update` 事件；
  - 文档中示范如何在开发环境/产线之间切换不同 Sink 组合。

## 4. Phase 2：Trace & DevToolsBridge · 从事件到链路

### 4.1 Trace ID 与 Span 语义

- 在 DebugEvent 上新增可选元信息（候选草稿，不立即实现）：
  - `traceId?: string`：标识一次用户交互或外部触发对应的整条链路；
  - `spanId?: string`：标识当前事件所在的执行段；
  - `parentSpanId?: string`：提供简单的因果链路。
- 提供最小的 Trace API（以 Effect 工具函数形式存在）：
  - `Debug.withNewTrace<A, E, R>(effect: Effect.Effect<A, E, R>, options?): Effect.Effect<A, E, R>`：包裹一段逻辑，在其内部自动附加新的 `traceId`；
  - `Debug.tagSpan<A, E, R>(effect: Effect.Effect<A, E, R>, spanMeta): Effect.Effect<A, E, R>`：为一段关键 Effect 附加 `spanId` 等元信息；
  - `Debug.currentTrace`：读取当前 Trace 上下文（只用于调试/观测，不鼓励业务逻辑依赖）。
- 与 Flow / Logic DSL 的结合方式：
  - 在 `$.onAction` / `$.onState` / `$.on` 等 Fluent DSL 中，约定默认继承触发 Action 所在的 Trace 上下文；
  - 为某些高价值 Flow（如调用外部 API）提供示例：如何在 Flow 内部用 `Debug.tagSpan` 标记「EffectStart/EffectEnd」段。

### 4.2 Flow & Effect 级事件

- 在不破坏现有事件类型的前提下，定义一批增量事件类型（候选）：
  - `flow:trigger`：当某个 Flow 被触发时发送，字段包括 `flowId` / `trigger`（来自 Action 或 State 条件）；
  - `effect:start` / `effect:end`：用于标记关键副作用起止，字段包括 `effectId` / `description` / `durationMs`（结束时）；
  - 这些事件应尽量通过 DSL/工具函数自动产生，而不是要求业务手写 `Debug.record`。
- 更新 `runtime-logix/core/09-debugging.md` 中的「通信协议」小节：
  - 把上述 Flow / Effect 事件作为「建议实现」或「扩展级」事件记录下来；
  - 明确哪些事件是所有引擎实现必须具备的（如 Module / Action / State / Lifecycle），哪些可以视场景选择性实现。

### 4.3 DevToolsBridge 协议与参考实现

- 定义 `DevToolsBridge` 接口（可放在 tooling 层 package 中，而非 `@logix/core`）：
  - 接收 `DebugEvent` 流 + 可选的 Runtime Tree 快照；
  - 负责对事件做简单的转换/过滤，并通过指定的 transport 推送给 DevTools。
- 约定一份轻量协议（草稿）：
  - 顶层字段：`version` / `runtimeId` / `timestamp` / `event` / `traceId?`；
  - `event` 字段直接复用/封装 DebugEvent，避免协议层和引擎事件模型重复演进；
  - 保持向后兼容：增加新字段不破坏旧版 DevTools。
- 提供一个参考实现：
  - 浏览器场景：通过 `window.postMessage` 或 `BroadcastChannel` 将事件广播给 DevTools 面板；
  - Node/CLI 场景：通过 WebSocket 或标准输出输出 NDJSON 格式的事件流。

## 5. Phase 3：Runtime Tree & Observability · 一体化观测面

### 5.1 与 Runtime Tree / TagIndex 的对齐

- 基于 `runtime-logix-devtools-and-runtime-tree` 草稿，补充以下设计点：
  - 为每个 Runtime 节点定义稳定的 `runtimeNodeId`，并在 DebugEvent 中增加可选字段；
  - 使 `moduleId` / `runtimeNodeId` / TagIndex 中的 Tag 标识互相可导航；
  - 提供只读查询 API：例如 `AppRuntime.inspect()` 返回当前 Runtime Tree + TagIndex 快照。
- 在 DevTools 视图中统一：
  - Timeline 视图基于 DebugEvent / Trace 构建；
  - Runtime Tree 视图基于 RuntimeMeta / TagIndex 构建；
  - 两者通过 `runtimeNodeId` / `moduleId` 等字段互相跳转。

### 5.2 Exporter Sink 与产线观测

- 在 DebugSink 协议稳定后，设计一系列「Exporter Sink」：
  - `OtelDebugSinkLayer`（候选）：将 DebugEvent 映射为 OpenTelemetry 的 Span / Log / Event；
  - `FileDebugSinkLayer`（候选）：将事件以 NDJSON 格式写入文件，方便离线分析；
  - 可插拔采样策略：例如仅对 `lifecycle:error` 与部分关键 Flow 开启采集。
- 安全与隐私：
  - 在规范中明确 DebugEvent 不应默认包含敏感业务数据（如用户隐私字段），需要时应通过配置白名单方式允许；
  - 为 Exporter Sink 提供字段过滤/脱敏钩子。

### 5.3 与 Studio / 平台集成

- 当 Debug / Runtime Tree 协议稳定后，可以在更上层的平台规范中约定：
  - Studio 如何订阅 Debug/Runtime Tree 观测面（例如通过统一的 DevToolsBridge 通道）；
  - Intent / Flow DSL 与 Debug 观测面之间的映射关系（例如通过 IntentRuleId / FlowId 定位到 DevTools 的节点）。

## 6. 后续动作建议

结合当前实现状态，建议按以下顺序推进：

1. 在本仓清理 `Debug.record` 中的裸 `console.log`，完成 Phase 1.2 的实现治理，并在 `09-debugging.md` 增补「设计原则」小节（对应本草案第 1 节的精简版）；  
2. 为 `@logix/test` 抽出复用的 `TestDebugSinkLayer` 工具，并在一两个示例中演示如何将 DebugEvent 纳入测试 Trace；  
3. 以一个简单的 `DevToolsBridge` + 浏览器示例为目标，验证 Phase 2 的 Trace ID 和 Flow/Effekt 事件设计是否足够；  
4. 在 Runtime Tree / TagIndex 方案更加稳定后，将本草案与 `runtime-logix-devtools-and-runtime-tree` 合并，收敛为 runtime-logix 的统一 observability 规范。

## 7. React Devtools 面板（TanStack Query 风格草案）

> 本节是对 Phase 2 的一个具体落地形态：在 React 应用右下角提供一个固定按钮，点击后弹出 Devtools 面板，类似 TanStack Query Devtools。

### 7.1 形态与使用方式（v1）

- 组件形态：  
  - `LogixDevtools`：React 组件，通常挂在应用根部（例如 `examples/logix-react/src/App.tsx` 中直接挂在主布局下方）；  
  - 默认固定在右下角显示一个小按钮（可通过 props 配置方位 / 是否默认展开）。
- 最小可用能力（v1，当前 PoC 已实现在 `@logix/devtools-react` 中）：
  - Runtime 列表：按 `runtimeLabel` 分组展示正在活动的 Runtime（例如 `AppDemoRuntime` / `GlobalRuntime` 等）；
  - Module 列表：在选中的 Runtime 下展示对应的 Module（moduleId）以及当前活跃实例数量；
  - 实例级视图：在 Events 列顶部按 `runtimeId`（内部 runtimeId）区分不同 Module 实例，并允许在实例之间切换；
  - 状态快照：在选中某个实例 + 事件后，右侧展示该实例在“该事件之后”的 `state` JSON 视图；若当前事件没有 `state:update`，则退化为最近一次 `state:update` 的结果；
  - 事件流：底部展示最近 N 条 DebugEvent（当前实现为 50 条窗口），已按 Runtime / Module / 实例三层过滤，可手动清空。
- 使用方式示例（示意）：  
  - 应用中已启用 Logix Runtime（例如 `examples/logix-react`），在 Runtime 的 Layer 组合中叠加 `devtoolsLayer`，并在根组件中挂载 `<LogixDevtools />` 即可开始观察；
  - 仅在开发环境加载：例如通过 `import.meta.env.DEV` 或 `process.env.NODE_ENV !== "production"` 包裹。

### 7.2 数据来源与桥接

- Runtime → Devtools 的数据通路（v1 建议）：
  - 在 Runtime 的 Layer 组合中附加 `devtoolsLayer`：
    - 内部基于 `Logix.Debug.makeModuleInstanceCounterSink` 统计每个 `runtimeLabel::moduleId::runtimeId` 维度的实例计数；
    - 同时使用 `Logix.Debug.makeRingBufferSink(capacity)` 将 DebugEvent 写入内存 ring buffer，并在内存中维护一份 `DevtoolsSnapshot`（instances + events + latestStates）。
  - 在 `@logix/devtools-react` 内部，使用一个专门的 `DevtoolsModule` / `DevtoolsImpl` 作为 Devtools 自己的 Logix 模块：
    - Logic 从 `DevtoolsSnapshot` 计算出 Runtime / Module / Instance 视图与事件时间线（纯函数 `computeDevtoolsState`）；
    - React 面板通过一个局部 `ManagedRuntime` + `useSyncExternalStore` 订阅该模块的 state，实现“Logix 状态管理 + React 视图”的自洽闭环（即 Devtools 自己吃 Logix 的狗粮）。
- Module 列表与状态快照：
  - 当前实现直接依赖 Debug 事件中的 `moduleId` / `runtimeId` 与 `state:update.state`，而不是复用业务 Runtime 中的 `useModuleList`；
  - 这是为了保证 Devtools 只依赖 Debug 协议本身，不反向耦合业务 Runtime 的模块注册细节；后续若有 Runtime Tree 能力，可以在 DevtoolsModule 的 Logic 中补充“模块树”视图。

### 7.3 渐进增强路线

- v1：已完成「Runtime / Module / 实例级列表 + 状态 JSON + 事件时间线」，重点验证 DebugSink/Trace 通路与 Logix 自身作为状态管理内核是否好用；  
- v1.5：  
  - 支持按 Trace ID 查看单条用户操作的完整链路（从 Action → Flow → Effect）；  
  - 在面板中高亮与当前选中模块/Trace 相关的事件。  
- v2：与 Runtime Tree 草案对齐：  
  - 面板中增加 Runtime Tree 视图，点击节点时可同时高亮相关 DebugEvent；  
  - 支持在 Devtools 中动态切换 Sink 配置（例如只看错误、调高/调低采样率）。  

上述 Devtools 面板属于「工具层 UI」，未来实现时应优先作为 `examples/logix-react` 内的 PoC，待 Debug 协议与用户体验稳定后，再考虑抽离为独立的 `@logix/react-devtools` 包或集成到 Studio。
