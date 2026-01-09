---
title: Runtime / Debug / Logger 彩色日志与诊断链路梳理（奔着 FiberRef+纯 Layer 的最终形态）
status: draft
version: 2025-12-06
value: core
priority: next
---

> 草稿定位：Runtime Observability Topic（结论已收敛为 v3/vNext 目标形态），用于沉淀 Logix Runtime + React RuntimeProvider + Debug 模块在「诊断日志 + Logger.pretty 彩色输出」上的最终链路与回归点。  
> 早期的 DebugHub / Tag 模型已退场，仅在少量段落以“历史方案”形式保留。

## 1. 问题背景：为什么 Logger/Debug 一起挂上去就“变丑了”

- 早期阶段：在 React 侧给 `RuntimeProvider` 的 `layer` 传入 `Logger.pretty` 时，Logic 内部调用 `Effect.log(...)` 可以在浏览器控制台看到 Effect 官方提供的彩色 / 分组日志（`Logger.pretty` 的 browser 模式）。
- 当前阶段：
  - Demo 中 Runtime 的 Layer 改为组合 Logger 与 `Logix.Debug.layer()` 等调试层后；
  - Logic 内的 `Effect.log` 输出退化为 logfmt 风格（`timestamp=... level=INFO message=...`），彩色消失；
  - Debug 模块产生的诊断日志（如 reducer 重复注册、缺少 `$.lifecycle.onError` 等）同样走了 logfmt 风格。
- 直观感受：**「以前只传 Logger.pretty 就能彩色，现在挂了 Debug 层之后就变成无色 logfmt」**。

## 2. 可疑回归点（高层推断）：是谁在“覆盖” Logger

结合当前实现演进，可以粗分为两类变更：

1. **Runtime / Provider 链路调整**
  - 引入了应用级 `Logix.Runtime.make`，默认由调用方在 Layer 中组合 `Logix.Debug.layer()` 或自定义 DebugLayer；
   - React 侧的 `RuntimeProvider` 不再直接对 `ManagedRuntime` 追加 Layer，而是：
     - 先通过 `Layer.buildWithScope` 把 Layer 构造成 `Context.Context`；
     - 再把该 `Context` 合并到内部维护的一组 `contexts` 中，由 `createRuntimeAdapter` 在 `run*` 时通过 `Effect.mapInputContext` 注入。
   - 这条链路对「基于 Context 的服务」（例如 `Context.GenericTag` 的 Service）是友好的，但对 **通过 FiberRef 改写的全局行为（Logger、LogLevel 等）** 没有显式兜底。

2. **Debug 模块输出方式变更**
   - 早期：Debug 或诊断层偏向「直接 console.log / console.group」；
   - 目前：Debug 的 `errorOnlyLayer` / `consoleLayer` / `browserConsoleLayer` 等大部分逻辑改为：
     - 先构造一段字符串（header + detail）；
     - 通过 `Effect.logInfo` / `Effect.logWarning` / `Effect.logError` 打到 Effect 的 Logger 管线；
     - 再依赖运行时是否提供了 `Logger.pretty` / `Logger.replace` 决定输出格式。
   - 结果：只要 runtime 上的 logger 替换链路稍有缺口，Debug 输出就会退回默认 logfmt。

> 推断：**根因更可能是「Logger 的 FiberRef 替换链路在 RuntimeProvider/Runtime.make/ModuleRuntime 某处被绕开或覆盖」+「Debug 输出过度绑定 Effect.log」，而不是 Effect 本身的行为变化。**

> 本节保留问题分析与历史症状，作为 Debug/Logger 设计取舍的背景材料；具体方案与实现以后文 FiberRef 模型为准。

## 3. 历史症状回顾：Logger/Debug 叠加时的典型问题（已修复）

### 路线 A：恢复「Debug 自己负责浏览器彩色输出」（早期缓解方案，现已吸收进 FiberRef 模型）

**思路：**

- 把 Debug 模块重新定位为「事件 → 诊断 → 友好输出」的层，而不是 Logger.pretty 的另一个包装：
  - 在浏览器环境下，`lifecycle:error` / `diagnostic` 事件直接使用 `console.groupCollapsed` + `console.error` / `console.warn` / `console.log` 输出；
  - 非浏览器环境下继续使用 `Effect.log*` 作为兜底。
- Logger.pretty 保持“业务日志彩色输出”的职责：
  - 业务/Flow/Service 想要彩色日志 → 在 Runtime / Provider 中传入 `Logger.pretty` 或 `Logger.prettyLoggerLayer`；
  - Debug 诊断层不再强依赖 logger 是否被替换。

**优点：**

- 实现简单直观，回到当初「诊断日志 = 自定义 Debug 层 + console 彩色输出」的模式；
- 不再对 FiberRef / currentLoggers 的细节有强依赖，减少 Debug 层回归风险；
- 与浏览器 DevTools 的体验更可控（可以根据 Debug 事件类型定制 label / 分组）。

**缺点：**

- Debug 输出风格与 Effect 官方 Logger.pretty 会有一定差异（不过可以有意向 logger.pretty 的风格靠拢，而非强一致）；
- 如果业务方想统一用 Logger.pretty 控制所有日志（包括 Debug），需要额外的适配层。

### 路线 B：坚持「Debug 通过 Effect.log 输出，依赖 Logger.pretty」（已被新模型重构吸收）

**思路：**

- 保持 Debug 模块内部只做 `Effect.log* + annotateLogs`，所有格式化统一交给 Effect Logger 体系；
- 修复/强化 Logger 替换链路：
  1. 在 `Logix.Runtime.make` 层面，明确约束 Debug 层只负责 Sink，不修改 Logger；Logger 相关 Layer 由调用方自行组合；
  2. 在 React `RuntimeProvider`：
     - 构建 Layer 时，通过 `FiberRef.get(FiberRef.currentLoggers)` 捕获该 Layer 对 logger 的修改；
     - 在 `createRuntimeAdapter` 里，对所有 `run*` 调用统一包一层 `Effect.locally(FiberRef.currentLoggers, capturedSet)`，保证 Provider 范围内的逻辑实际跑在新的 logger 集合下；
  3. 在 ModuleRuntime / LogicRuntime 内减少对 logger 的直接操作，统一依赖外部提供的 Env+FiberRef。

**优点：**

- 日志输出路径更加统一（都走 Logger），便于与 Effect 生态的其他工具集成（如 structured logger / tracing）；
- Debug 的实现更「effect-native」，符合 runtime-logix 以 Effect/Layer/Logger 为一等公民的设计目标。

**缺点：**

- 实现复杂，容易引入隐性回归（尤其是 React Provider 与 ModuleRuntime 的交互）；
- 调试难度较高：一旦某处未正确提供 logger layer，所有依赖 Effect.log 的诊断输出都会退回默默的 logfmt。

**升级要点（让路线 B 可执行）：**

- Logger 捕获与传递：
  - RuntimeProvider 构造 runtime adapter 时，同时捕获 `FiberRef.currentLoggers` 与 `FiberRef.currentLogLevel` 的 snapshot，写入 `ReactRuntimeContextValue`；
  - 所有 `run*` 入口统一用 `Effect.locally` 套用上述 snapshot，确保 render/commit 之外的 fiber 也继承 Logger。
- Debug Sink 组合原则：
  - `Debug.layer` 只负责 sink 集合（errorOnly/console/browserConsole），不再附带 Logger.pretty；
  - `Debug.traceLayer` 变为单参纯 Layer 工厂（trace sink），与 Logger.pretty/Logger.replace 的组合顺序无关；
  - 对外倡导 `Layer.merge(Logger.prettyLoggerLayer, Debug.layer(...), Debug.traceLayer(...))` 的组合范式。
- 兼容与迁移：
  - 保留现有 `Debug.traceLayer(base)` 形态作为过渡壳，内部改用 FiberRef 机制实现；
  - Demo/测试优先切到新组合方式，观察彩色输出是否恢复。
- 可验证性：
  - 新增专项测试：
    - Provider 层挂 `Logger.prettyLoggerLayer` 后，在子组件 `Effect.sync(FiberRef.get(currentLoggers))` 能看到 pretty logger；
    - 叠加 `Debug.layer` / `Debug.traceLayer` 后 logger 不被覆盖，输出仍彩色；
    - Node 环境退化为结构化输出，符合预期。
  - Debug 输出保留 console fallback，便于肉眼确认。

## 4. 当前已知行为（对比早期 vs 现在）

### 4.1 早期资料点（理想状态）

- Demo 配置：
  - `RuntimeProvider` 的 `layer` 直接传 `Logger.pretty` 或其 Layer 变体；
  - Logic 内部：
    - `yield* Effect.log("分组", "详情")` 在浏览器中表现为彩色、带时间戳、可展开的分组日志；
    - 即便未使用 Debug 模块，业务日志体验已经足够友好。

### 4.2 当前状态（含 Debug 层）

- Demo 配置：
   - Runtime 通过 `Logix.Runtime.make(RootImpl, { layer: Layer.mergeAll(Logger.prettyLoggerLayer, Logix.Debug.layer(), ...) })` 创建；
  - React 侧通过 `RuntimeProvider runtime={appRuntime}` 注入；
  - Logic 内同时使用：
    - `Effect.log(...)` 做一部分业务日志；
    - Debug 模块广播的 `lifecycle:error` / `diagnostic` 事件也通过 `Effect.log*` 输出。
- 实际观察：
  - 所有日志都呈现为 logfmt 风格，说明当前 `currentLoggers` 中的 active logger 并非 browser pretty 实现；
  - Demo 层面添加 Logger.pretty 并没有如预期那样完全替换 defaultLogger。

> 结合以上：早期 Demo 彩色日志成立，说明「仅 RuntimeProvider + Logger.pretty」这条链路在一开始是 work 的；当前问题更像是 Debug 层与 Runtime.make / Provider 的叠加引入了 logger 覆盖/回退，而非 FiberRef 机制本身失效。

## 5. 第二阶段：Debug 模型与 Logger 完全对齐（FiberRef + 纯 Layer）

> 这一节是**“奔着完美”**的设计蓝图，对应代码层面的目标形态，不要求一步到位，但后续 refactor 应当以此为准绳。

### 5.1 Debug vs Logger：我们真正想要的模型

Logger 当前模型：

- 一个 `FiberRef.currentLoggers: HashSet<Logger>`；
- Layer 负责设置 / 替换这个 FiberRef 的初始值（例如 `Logger.pretty`、`Logger.structured`、`Logger.minimumLogLevel`）；
- 局部覆写靠 `Effect.locally(FiberRef.currentLoggers, ...)`。

Debug 目标模型（最终版）：

- 一个 `FiberRef.currentDebugSinks: ReadonlyArray<Sink>` 或等价结构；
- Layer 只负责“在 Runtime 启动时把默认 sinks 放进去”，例如：
  - `Debug.layer({ mode: 'dev' })`：提供 errorOnly + browserConsole sinks；
  - `Debug.traceLayer(...)`：追加一个只处理 `trace:*` 的 sink；
- `Debug.record` 是 Debug 版的 logger：读取当前 FiberRef 中的 sinks，forEach 调用；
- 局部覆写通过 `Debug.withSink` / `Debug.withTraceSink` 之类的 helper（本质就是对 FiberRef 做 locally）。

关键结论：

- Debug 在**能力层面**不需要比 Logger 多一个“Hub 概念”，只需要“当前 Fiber 上挂着一组 Sink”；
- 现有 Hub（`{ sinks: Sink[]; record(...) }`）只是「在 Context.Tag 世界里聚合多路 Sink 的折衷」，在引入 FiberRef 后应收缩为 internal 细节甚至直接折叠掉。

### 5.2 Debug.traceLayer API 形态（对齐 Logger 的组合风格）

> 目标：让 Debug 的组合方式尽量贴近 Effect.Logger，而不是出现 `Debug.traceLayer(Debug.layer(...))` 这种“把一个 Layer 当成另一个参数”的反直觉用法。

- 当前实现（过渡态）：
  - `traceLayer(base: Layer, onTrace?: (e) => Effect<void>): Layer`，使用方式是 `Debug.traceLayer(Debug.layer({ mode: 'dev' }))`；
  - 内部通过 DebugHub 和 Layer.updateService 叠加 trace sink，已经修复了 “mergeAll 覆盖默认 sink” 等问题，但 API 风格依然不自然。
- 期望的最终形态（对齐 Logger）：
  - 对外只暴露“纯 Layer 工厂版”：
    - `traceLayer(onTrace?: (event: Event) => Effect.Effect<void>): Layer<never>`；
    - 用法统一为：
      ```ts
      const debugLayer = Layer.merge(
        Debug.layer({ mode: "dev" }),
        Debug.traceLayer((event) => Effect.logDebug({ traceEvent: event })),
      )
      ```
  - `Debug.layer` 负责：
    - dev/prod/off 模式切换；
    - 默认 sinks 集合（errorOnly / console / browserConsole）与 Logger.pretty 的组合；
  - `Debug.traceLayer` 只承担“向当前 Fiber 的 Debug sinks 集合追加一个 trace sink”的职责，天然可与任何 `Debug.layer` / `Debug.replace` 结果组合。
- 迁移建议：
  - 实现期第 1 步：在 internal 中把 `traceLayer` 改为以 FiberRef.currentDebugSinks 为核心的“纯 Layer 工厂”，同时保留现有 `(base, onTrace?)` 形式作为兼容壳；
  - 实现期第 2 步：Demo / 测试 / 文档统一改用 `Layer.merge(Debug.layer(...), Debug.traceLayer(...))` 写法；
  - 实现期第 3 步：在全仓调用点切换完毕后，删除 `(base, onTrace?)` 入口，SSoT 只记录 Logger 风格用法。

### 5.3 对代码与文档的影响面（最终版视角）

- Debug 实现（核心）：
  - `packages/logix-core/src/internal/runtime/core/DebugSink.ts`：
    - 把 DebugHub 概念下沉为 internal 结构；  
    - 引入 `FiberRef.currentDebugSinks`，以 FiberRef 为主、Context 为辅；
    - `Debug.record` 从“serviceOption(Debug.tag)”改为优先读 FiberRef。
  - `packages/logix-core/src/Debug.ts`：
    - `Debug.layer`/`traceLayer`/`replace` 只拼接 FiberRef 上的 sinks 集合，不再暴露 Hub 概念。
- Runtime / React 集成：
  - `packages/logix-core/src/Runtime.ts` 不再暗中叠加默认 DebugLayer，而是提供 `Debug.defaultLayer` 等辅助常量，让调用方显式组合；
  - `packages/logix-react/src/components/RuntimeProvider.tsx`：
    - 构建 Layer 时捕获 FiberRef.currentLoggers + currentDebugSinks 的 snapshot，与 logger 一起放入 `ReactRuntimeContextValue`；
    - 在 `createRuntimeAdapter` 内统一用 `Effect.locally` 把 logger + debug sinks 应用到所有 run* 调用。
- 文档：
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`：
    - 明确“业务日志（Logger） vs 运行时诊断（Debug）”两条通路；
    - 示例统一使用 Logger 风格的组合：
      - `Layer.merge(Logger.pretty, Debug.layer({ mode: 'dev' }), Debug.traceLayer(...))`。
  - `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`：
    - 从产品视角解释“如何挂上 DevTools / Playground Sink”（通过 `Debug.traceLayer` + DevTools sink Layer，而不是改造 Runtime 本身）。

## 5. Logger / Debug 最终模型（FiberRef + 纯 Layer）

> 本节描述的是 **当前代码实现已经对齐的目标形态**，同时作为 v3/vNext 的长期约束。  
> 关键结论：**没有 Hub，没有 Debug.Tag，只有 FiberRef + Layer + Sink。**

### 5.1 FiberRef 作为单一真相

- 业务日志：
  - `FiberRef.currentLoggers: HashSet<Logger>`；
  - Layer 负责设置 / 替换这个 FiberRef 的初始值（例如 `Logger.pretty`、`Logger.minimumLogLevel` 等）；
  - 局部覆写通过 `Effect.locally(FiberRef.currentLoggers, ...)` 完成。
- 运行时诊断：
  - `FiberRef.currentDebugSinks: ReadonlyArray<Sink>`；
  - Sink 接口：

    ```ts
    export interface Sink {
      readonly record: (event: Event) => Effect.Effect<void>
    }
    ```

  - 由 Layer 在 Runtime 启动时提供默认值，局部覆写同样通过 `Effect.locally(Debug.internal.currentDebugSinks, ...)` 完成；
  - Debug 事件 `Event` 覆盖 module lifecycle / action / state / diagnostic / trace:* 等。

> 历史上的「DebugHub」只是“在 Context.Tag 世界里聚合多路 Sink 的折衷”，在 FiberRef 模型下已经完全移除，仅作为历史背景存在于旧文档片段中。

### 5.2 Debug 公共 API 形态

- 事件与 Sink：

  ```ts
  // @logixjs/core/Debug
  export type Event = Internal.Event
  export interface Sink extends Internal.Sink {}

  export const internal = {
    currentDebugSinks: Internal.currentDebugSinks,
  }
  ```

- 记录事件：

  ```ts
  export const record = (event: Event) => Internal.record(event)
  ```

  - 首选从 `FiberRef.currentDebugSinks` 读取当前 sink 列表并 fan-out 调用；
  - 若列表为空：
    - 浏览器下走 `console.groupCollapsed` + 彩色输出（`browserConsoleSink`）；
    - Node 下只针对 `lifecycle:error` / `diagnostic` 输出结构化日志（`Effect.log*` + annotateLogs）。

- 基础 Layer：

  ```ts
  export const noopLayer: Layer<any, never, never>
  export const layer: (options?: { mode?: "auto" | "dev" | "prod" | "off" }) => Layer<any, never, never>
  export const replace: (
    sinks: ReadonlyArray<Sink>,
  ) => Layer.Layer<any, never, never>
  ```

  - `Debug.layer`：
    - `"dev"`/`"auto"`：挂载浏览器友好彩色输出（`browserConsoleLayer`），不触碰 Logger；
    - `"prod"`：挂载 `errorOnlyLayer`，仅记录 `lifecycle:error` + 严重 `diagnostic`；
    - `"off"`：等价于 `noopLayer`。
  - `Debug.replace`：
    - 高级用法：完全由调用方提供 `[Sink]` 集合接管 Debug 能力；
    - 内部通过 `Layer.locallyScoped(currentDebugSinks, sinks)` 写入 FiberRef，不再引入额外 Tag。

- Logger 适配：

  ```ts
  export const withPrettyLogger: (
    base: Layer.Layer<any, any, any>,
    options?: PrettyLoggerOptions,
  ) => Layer.Layer<any, any, any>
  ```

  - 仅负责 Logger 替换（`Logger.replace(Logger.defaultLogger, Logger.prettyLogger(options))`），不携带 DebugSink。

### 5.3 traceLayer：只追加 trace sink，不再依赖 Hub

- API 形态（已实现）：

  ```ts
  export function traceLayer(
    onTrace?: (event: Event) => Effect.Effect<void>,
  ): Layer.Layer<any, never, never>

  export function traceLayer(
    base: Layer.Layer<any, any, any>,
    onTrace?: (event: Event) => Effect.Effect<void>,
  ): Layer.Layer<any, never, any>
  ```

- 行为：
  - 根据参数是否为 Layer，决定是否包一层 `base`；
  - 总是创建一个只处理 `trace:*` 事件的 `traceSink`，并通过：

    ```ts
    const appendTrace = Layer.fiberRefLocallyScopedWith(
      Debug.internal.currentDebugSinks,
      (sinks) => [...sinks, traceSink],
    )
    ```

    将其追加到当前 Fiber 的 sinks 列表中（基于 FiberRef，而非 Hub / Tag）；
  - 默认 `onTrace` 不传时，使用 `Effect.logDebug({ traceEvent: event })` 作为兜底。

- 推荐组合范式：

  ```ts
  const debugLayer = Layer.mergeAll(
    Logix.Debug.layer({ mode: "dev" }),
    Logix.Debug.traceLayer((event) => Effect.logInfo({ traceEvent: event })),
  )
  ```

### 5.4 Runtime / React 集成：如何保证 FiberRef 快照不丢失

- Runtime 层：
  - `Runtime.make` 不再隐式叠加任何 DebugLayer，所有 Debug/Logger 行为由调用方显式组合：

    ```ts
    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.mergeAll(
        AppInfraLayer,
        Logger.pretty as Layer.Layer<any, never, never>,
        Logix.Debug.layer({ mode: "dev" }),
        Logix.Debug.traceLayer(),
      ),
    })
    ```

  - AppRuntime 内部仅负责：
    - 构造最终 envLayer；
    - 在 Scope 内 `Layer.buildWithScope`；
    - fork processes 时复用 env。

- React 层（`RuntimeProvider`）：
  - 在构建 `LayerBinding` 时：
    - 先在新的 Scope 内 `Layer.buildWithScope(layer, scope)` 得到 `context`；
    - 定义 `applyEnv(effect)` 对传入 Effect 做：

      ```ts
      Scope.extend(effect, scope)
        .pipe(Effect.mapInputContext((parent) => Context.merge(parent, context)))
      ```

    - 在上述 env 下读取：

      ```ts
      const loggers   = yield* applyEnv(FiberRef.get(FiberRef.currentLoggers))
      const logLevel  = yield* applyEnv(FiberRef.get(FiberRef.currentLogLevel))
      const debugSinks = yield* applyEnv(
        FiberRef.get(Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>),
      )
      ```

    - 将三者以「栈」形式挂入 `ReactRuntimeContextValue`（`contexts` / `scopes` / `loggerSets` / `logLevels` / `debugSinks`）。
  - 在 `createRuntimeAdapter` 内，对所有 `run*` 入口统一应用：

    ```ts
    const applyLoggers = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
      const lastLoggers = ...
      const lastLevel   = ...
      const lastSinks   = ...

      let result = effect as Effect.Effect<A, E, any>
      if (lastLoggers) {
        result = Effect.locally(FiberRef.currentLoggers, lastLoggers)(result)
      }
      if (lastLevel) {
        result = Effect.locally(FiberRef.currentLogLevel, lastLevel)(result)
      }
      if (lastSinks) {
        result = Effect.locally(
          Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>,
          lastSinks,
        )(result)
      }
      return result as Effect.Effect<A, E, R>
    }
    ```

  - 从而保证：
    - Provider 层组合的 Logger/DebugLayer 在任意 run*（包含子组件 dispatch、异步流程等）中都可见；
    - 多层 Provider / 多 Runtime 之间互不污染，只取各自 context 栈上的“最后一帧”。

### 5.5 测试与验收：当前实现对应的关键用例

- `packages/logix-core/test/Debug.test.ts`：
  - 验证 `Debug.record` 在无 sink 时为 no-op；
  - 验证通过 FiberRef 挂载 sink 时能收到事件；
  - 验证 `Debug.layer` 是合法的 Layer；
  - 验证 `withPrettyLogger` 能替换默认 Logger。
- `packages/logix-core/test/ModuleRuntime.test.ts`（debug integration）：
  - 通过 `Effect.locally(Debug.internal.currentDebugSinks, [sink])` 追加 sink，验证：
    - logic error → `lifecycle:error`；
    - Env service not found → `logic::env_service_not_found` diagnostic；
    - phase guard 场景（setup 误用 Env / watcher / lifecycle）→ `logic::invalid_phase` diagnostic。
- `packages/logix-core/test/DebugTraceRuntime.test.ts`：
  - 通过 FiberRef 注入 sink，验证 `trace:*` 事件能够到达调用方；
  - 作为 DevTools / Playground 接入 Debug 事件流的最小回归。
- `packages/logix-react/test/integration/reactConfigRuntimeProvider.test.tsx`：
  - `propagates logger/logLevel/debug sinks from provider layer` 用例：
    - 在 `RuntimeProvider.layer` 里同时挂 Logger.minimumLogLevel、Debug.layer、Debug.traceLayer；
    - 在子组件中用 `useRuntime().runSync(...)` 读取 FiberRef 快照，断言 loggers/logLevel/debugSinks 已正确传播。
- `packages/logix-test/src/runtime/TestRuntime.ts`：
  - 在构建 TestRuntime 时，通过 `Effect.locally(Debug.internal.currentDebugSinks, [sink])` 注入专用 sink；
  - 将 `lifecycle:error` 事件收集为 `ExecutionResult` 的 Error trace。

## 6. 未来演进与 DevTools 接入建议

1. **DevTools / Sandbox 接入 Debug 事件流**
   - 推荐统一用 `FiberRef.currentDebugSinks` 作为唯一接入点：
     - 浏览器 Sandbox Worker 中通过 `Debug.replace([...])` 或 `Effect.locally(currentDebugSinks, [...])` 接入；
     - DevTools 扩展通过一个 sink 将事件写入专用桥（如 `postMessage` / `DevToolsBridge`）。
   - 示例：`packages/logix-sandbox/src/worker/sandbox.worker.ts` 中的 `resolveLogixDebugSink` 已改为通过 FiberRef 挂载 sink。
2. **双通路输出（Console + Structured Logs）**
   - DebugSink 默认在浏览器下用 `console.groupCollapsed` 提供彩色分组；
   - 在需要集中采集时，可在自定义 sink 内额外调用 `Effect.logDebug({ debugEvent: event })` 或直接写日志系统。
3. **文档与示例的一致性**
   - 所有对外文档（SSoT 与用户文档）统一使用：

     ```ts
     Layer.mergeAll(
       Logger.pretty,
       Logix.Debug.layer({ mode: "dev" }),
       Logix.Debug.traceLayer(),
     )
     ```

     作为“业务日志 + 诊断日志 + trace”的标准组合。
   - 严禁新文档再引入 “DebugHub / Debug.tag” 叙事，如确需提及，只能放在“历史演进”章节。

---

> 当前实现已经满足本稿 5.x 节定义的目标蓝图；后续若再演进 Debug/Logger 模型，应先更新本稿与 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`，再调整代码与用户文档。***
