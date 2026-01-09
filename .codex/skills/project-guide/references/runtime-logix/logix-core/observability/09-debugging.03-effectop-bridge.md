# 1.2 与 EffectOp 的对接（trace:effectop 事件）

> 详见 [`05-runtime-implementation.md#14-effectop-middlewareenv-与统一中间件总线（补充）`](../runtime/05-runtime-implementation.md#14-effectop-middlewareenv-与统一中间件总线（补充）) 与 `specs/001-module-traits-runtime/references/effectop-and-middleware.md`。

- Runtime 在内部使用 EffectOp 作为 Action / Flow / State / Service / Lifecycle 等边界事件的统一模型；
- 中间件模块（`@logixjs/core/Middleware`）提供了一个标准的 DebugObserver 实现：
  - 作为 EffectOp MiddlewareStack 中的一员，观察所有 EffectOp；
  - 将每条 EffectOp 以 `type = "trace:effectop"` 的事件写入 DebugSink：
    ```ts
    Debug.record({
      type: "trace:effectop",
      moduleId: op.meta?.moduleId,
      data: op, // 宿主内原始事件（不得进入可导出事件/ring buffer/证据包）
    })
    ```
- DevTools 可以基于 `trace:effectop` 的**可导出投影**重建 EffectOp Timeline（只保留 Slim/可序列化字段，见 009 的 SlimOp 约束），并与 StateTraitGraph / IntentRule Graph 结合，呈现更完整的“结构 + 时间线”视图。

在实际项目中推荐通过 `@logixjs/core/Middleware` 统一组合运行时中间件：

- 推荐使用高层组合入口 `Middleware.withDebug(stack, options?)`，在现有 MiddlewareStack 上一次性追加 DebugLogger（日志）与 DebugObserver（`trace:effectop`）；
- 当需要精细控制顺序或选择性启用 logger/observer 时，再使用底层原语 `Middleware.applyDebug` / `Middleware.applyDebugObserver` 进行组合；
- 其他横切关注点（如监控、限流/熔断、Query 集成等）可以在应用侧实现自定义 `Middleware.Middleware` 并与上述调试中间件叠加，Runtime 内核只负责在 EffectOp 边界调用统一的 MiddlewareStack。

## 1.2.1 DevtoolsHub 与一键启用（RuntimeOptions.devtools）

为了让 Devtools 能够以“进程/页面级”视角观察多个 Runtime/模块实例，runtime 提供了一个全局单例的聚合器：**DevtoolsHub**。

- DevtoolsHub 通过 `Debug.devtoolsHubLayer({ bufferSize? })` 以“追加 sinks”的方式挂入当前 Debug sinks 集合：
  - 不覆盖调用方已有的 `Debug.layer` / `Debug.replace` / 自定义 sinks；
  - 将 Debug 事件归一化并聚合为 `DevtoolsSnapshot`（`snapshotToken` / `instances` / `events` / `latestStates` / `latestTraitSummaries` / `exportBudget`），并提供订阅能力：
    - `Debug.getDevtoolsSnapshot()`
    - `Debug.getDevtoolsSnapshotToken()`（027：外部订阅安全的变更检测事实源；推荐用于 `useSyncExternalStore`）
    - `Debug.subscribeDevtoolsSnapshot(listener)`
    - `Debug.clearDevtoolsEvents()`
    - `Debug.setInstanceLabel(instanceId, label)` / `Debug.getInstanceLabel(instanceId)`
  - DevtoolsSnapshot 契约（027）：
    - **Recording Window**：`events` 是有上界的“录制窗口”，不代表 run 全量历史；窗口满载淘汰必须满足均摊常数级别成本（避免高频 `shift()` 线性搬移）。
    - **累计计数**：`exportBudget`（例如 `dropped/oversized`）是累计计数（默认自上次 `clearDevtoolsEvents()` 起累积），用于解释导出降级；不等价于窗口内事件数量。
    - **派生缓存**：`latestStates/latestTraitSummaries` 是按实例键的最新摘要缓存：
      - `module:destroy` 必须回收对应条目；不得随历史实例无限增长。
      - 销毁后迟到/重放事件允许进入 `events` 用于回放，但对该实例的 `state:update` 必须 Drop 或标记为 Orphan，且绝不重建 `latest*`（避免 resurrection leak）。
    - **SnapshotToken**：`snapshotToken` 是对外变更检测事实源：
      - 任一对外可见变化必须推动 token **单调变化**（至少包括：`events` 窗口变化、`instances` 计数变化、任意 `latest*`/`exportBudget` 变化、实例标签索引变化、以及清空/切换 run/调整窗口大小等控制操作造成的视图变化）。
      - 反向不变量：当 token 未变化时，快照对外可见字段不得变化（包含数组/对象引用与其可见内容），避免外部订阅读到 tearing 或漏更新。
      - 实现允许保持 `DevtoolsSnapshot`/`events` 等引用稳定并原位更新（zero-copy mutable view）；如消费侧需要不可变语义，应在边界自行 copy。
      - 通知语义：`subscribeDevtoolsSnapshot` 允许合并/节流（默认 microtask 合并）；观察延迟上界 = 一次 microtask flush，但不得出现“token 已变化而订阅者永远不被通知”的情况；token 更新必须同步发生（不得仅在 notify 时更新）。
    - React 推荐用法：用 `useSyncExternalStore` 订阅 token（而不是快照对象引用），再在 token 变化后读取快照视图。
  - **Converge Static IR 的导出路径**不再依赖 DevtoolsHub 的“全局 register 函数”，而是通过可注入 `ConvergeStaticIrCollector`（FiberRef）追加 consumer；DevtoolsHub 仅作为其中一个 consumer（collector）填充其内部索引。

- Runtime 提供 `RuntimeOptions.devtools` 作为一键启用入口：
  - `devtools: true` 或 `devtools: { bufferSize?, observer? }`；
  - 自动合并 `Debug.devtoolsHubLayer({ bufferSize })` 到 appLayer；
  - 自动对 `options.middleware ?? []` 追加 DebugObserver（`Middleware.withDebug(..., { logger: false, observer })`），确保产出 `trace:effectop`；处于事务窗口时应携带 `txnId`（用于 UI/聚合），非事务事件允许缺失；
  - 该选项视为**显式 override**：只要传入就生效，不受 `isDevEnv()` 裁剪。

推荐用法：

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  label: "AppRuntime",
  devtools: true,
})
```

## 1.2.2 TrialRun / EvidencePackage（平台侧受控试跑）

> 状态：020 已落地。TrialRun 的目标是为平台/脚本提供“一次跑出证据”的最小闭环：按会话隔离、可注入覆写、导出可序列化 EvidencePackage，且不要求依赖 DevtoolsHub。

- **入口**：`Logix.Observability.trialRun(program, options)`（`packages/logix-core/src/internal/observability/trialRun.ts`）。
- **会话隔离**：每次 trialRun 都创建独立 `Scope` + RunSessionLocalState，避免 once 去重/序列号分配等跨会话污染。
- **证据采集**：使用 per-session EvidenceCollector 采集可导出 Debug events + runtime services evidence + converge static IR 摘要；在 diagnostics=off 时保持近零额外开销。
- **Converge Static IR**：通过可注入 collector 追加采集路径；DevtoolsHub 仅作为可选 consumer，不再是导出依赖。

## 1.2.3 Reflection / BuildEnv（构建态反射与依赖约束）

> 状态：020 已落地。Reflection 的目标是在受控 Build Env 中运行 Builder 一次，导出可比较的 Static IR（含稳定 digest）与模块拓扑摘要。

- **标准 Build Env**：ConfigProvider + RuntimeHost（`packages/logix-core/src/internal/platform/BuildEnv.ts`）。
- **越界依赖诊断**：当 Builder 试图访问运行态业务 Service（缺失 Service）时，通过 `ConstructionGuard` 将缺陷转换为可行动错误（提示把 Service 访问下沉到运行态）。

示例落点：

- Node：`examples/logix/src/scenarios/reflectStaticIr.ts`
- Browser：`examples/logix-react/src/demos/TrialRunEvidenceDemo.tsx`
