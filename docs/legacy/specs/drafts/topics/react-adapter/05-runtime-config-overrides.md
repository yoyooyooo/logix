---
title: React Runtime Config Overrides · useModule / ModuleCache 与 RuntimeProvider 的配置路径重构
status: draft
version: 2025-12-08
value: core
priority: next
---

> 草稿定位：React Adapter Topic（问题拆解为主，结论弱），聚焦于「如何在不破坏 Effect / React 不变量的前提下，为 `@logixjs/react` 提供**真正安全的 runtime 级 React 配置覆盖能力**」，是后续对 `ReactModuleConfig` / `ReactRuntimeConfigTag` / `RuntimeProvider` 组合方案的前置分析。

## 1. 背景：我们想要的“runtime 级覆盖”到底是什么

当前 React 侧有两套配置来源：

- 全局 Config：通过 Effect 的 `ConfigProvider` 提供 `logix.react.gc_time` / `logix.react.init_timeout_ms`，在任意 runtime 下给 `useModule` / `ModuleCache` 提供默认值；
- runtime 级 Config：通过 `ReactRuntimeConfigTag` + `ReactRuntimeConfig.replace`，在某个 `ManagedRuntime` 的 Layer 内覆盖上述配置，**期望**表现为：
  - 同一进程内可以有多个 Runtime，各自有不同的 `gcTime` / `initTimeoutMs`；
  - React 集成（`RuntimeProvider` + `useModule` / `useLocalModule`）在各自 Runtime 内读取各自的配置；
  - 不要求 ConfigProvider 真正“感知 React”，但希望可以借由 Layer 组合把 runtime 级覆盖自然拼进去。

额外的硬约束：

- React 侧不能在 render 阶段对“可能异步”的 Effect 使用 `runSync`；
- Runtime 的 `layer` 未来会挂载 Debug、DevTools、sandbox 等复杂 Layer，它们的初始化**必须允许异步**；
- StrictMode + Suspense 是默认场景，`useModule` / `ModuleCache` 必须在这两个模式下都不炸。

## 2. 现状与踩过的坑（2025-12） 

### 2.1 旧方案：在 render 链路用 `runtime.runSync` 读配置

旧实现大致是：

- `ReactModuleConfig.gcTime` / `initTimeoutMs` 是一个 `Effect.Effect<number, _, ReactRuntimeConfigTag | ConfigProvider>`；
- `useModule` / `ModuleCache.getModuleCache(runtime)` 在 React render 过程中调用：

```ts
gcTime = runtime.runSync(
  Effect.gen(function* () {
    const value = yield* ReactModuleConfig.gcTime
    return value
  }),
)
```

在没有复杂 Layer 的时候，这个方案“看起来没问题”，因为：

- `ManagedRuntime.make(layer)` 对简单 `Layer.empty` / 纯同步 Layer 的构建可以被当作同步操作；
- `runSync` 只是在当前 Runtime 上下文里跑了一个“读取 Config 的小 Effect”，不会明显暴露问题。

### 2.2 加入 Debug.layer + Debug.traceLayer 后的破口

一旦 Runtime.layer 变成类似：

```ts
const appRuntime = Runtime.make(AppCounterImpl, {
  layer: Debug.traceLayer(Debug.layer({ mode: "dev" })),
})
```

问题出现了：

  - `Debug.layer({ mode: 'dev' })` 内部会组合：
  - `withPrettyLogger(Logger.prettyLogger({ mode: 'browser', ... }))`;
  - `browserConsoleLayer`（基于 FiberRef.currentDebugSinks 的浏览器 sink）；
- 这条 Layer 链在 Effect 内部是通过 `Layer.unwrapScoped(Effect.gen(... Layer.buildWithScope ...))` 之类的形式构造出的“统一 App Layer”，而 `ManagedRuntime.make(finalLayer)` 的实现是：
  - 构造一个 scope；
  - 在 scope 内 Fork 一条 fiber 去异步构建整棵 Layer；
  - `runSync`/`runPromise` 再去等待/复用这个构建结果。

当我们在 React render 里调用 `runtime.runSync(ReactModuleConfig.gcTime)` 时，Effect 检测到：

- 这个 runtime 内部还没完成 Layer 构建，存在未决异步；
- 你却要求 `runSync` 立刻给出结果；

于是抛出典型的：

> (FiberFailure) AsyncFiberException: Fiber #X cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work.

### 2.3 临时修复：放弃 runtime 级覆盖，回退到全局 Config

为了解决 AppDemoLayout + Debug.traceLayer 在浏览器下立刻炸掉的问题，现阶段做了一个“保守但安全”的调整：

- 在 `useModule` / `ModuleCache.getModuleCache` / `RuntimeProvider` 中，所有**只为读取 React 配置**而跑的 Effect 改为使用全局 `Effect.runSync(...)`；
- 也就是说：
  - `ReactModuleConfig.gcTime` / `initTimeoutMs` 只通过全局 ConfigProvider 解析；
  - 不再通过当前 Runtime 的 Env（`ReactRuntimeConfigTag` / `ConfigProvider` Layer）做覆盖；
  - Runtime 级的 `ReactRuntimeConfig.replace(...)` 暂时失去实际效果。

优点：

- AppDemoLayout 这类 demo 在挂上 Debug.traceLayer 之后不再抛 AsyncFiberException；
- `@logixjs/react` 内部的所有 `runSync` 都只包裹“确定可以同步结束的小 Effect”（读取全局 Config），符合 Effect 不变量。

缺点（也是本草稿想解决的问题）：

- runtime 级配置覆盖实际被“拔掉”了，只剩全局 Config 一条路径；
- 未来要为不同 Runtime 配不同的 gcTime / initTimeoutMs 就做不到了。

## 3. 目标与约束：我们想要怎样的“完美”方案

### 3.1 行为层面的目标

1. **三层配置合并模型**清晰可见：
   - 全局默认：`DEFAULT_CONFIG`（gcTime=500ms 等）；
   - 全局 ConfigProvider：`logix.react.gc_time` / `logix.react.init_timeout_ms`（全仓统一缺省）； 
   - runtime 级覆盖：某个 `ManagedRuntime` 的 Layer（例如在 `RuntimeProvider` 的 `layer` 里挂 `ReactRuntimeConfig.replace({ gcTime: 1000 })`）。

2. `useModule` / `useLocalModule` / `ModuleCache` 看到的应当是上述三层合并后的**最终值**，并且：
   - 同一 `ManagedRuntime` 下的所有模块共享同一份配置快照；
   - 不同 Runtime 之间的覆盖互不干扰。

3. Debug / DevTools / sandbox 这类“重 Layer”可以自由挂在 Runtime 上，而不会因为配置读取被迫“永远同步”或被禁用。

### 3.2 技术层面的约束

1. React 渲染链路：
   - 不允许在 render 阶段对**可能异步**的 Effect 使用 `runSync`；
   - 允许在 Effect / commit 阶段使用 `runtime.runPromise` 做一次性的初始化；
   - StrictMode 下的双 render / 重 mount 必须不会导致资源泄漏或重复初始化异常。

2. Effect / Layer 不变量：
   - 允许 Layer 使用 `Effect.gen + Layer.buildWithScope` 组合任意异步初始化步骤；
   - `ManagedRuntime.runSync` 只能用于“已确保同步”的路径，例如已经构建好的 Runtime 上执行纯 CPU/内存操作；
   - 不能依赖“Layer 构造永远同步”这种假设。

3. API 兼容性（软约束）：
   - 希望尽量保留 `ReactRuntimeConfig.replace` / `ReactModuleConfig` 等现有类型与路径；
   - 允许在实现和内部 wiring 上大改，但不希望大量破坏调用层 API。

## 4. 已尝试路线小结

### 4.1 路线 A：render 中对 Runtime 直接 runSync（已否决）

- 方案：像前文那样在 `useModule` / `getModuleCache` 中用 `runtime.runSync` 读取配置；
- 优点：简单直观，可以自然利用 runtime layer 内的 ConfigProvider / ReactRuntimeConfigTag；
- 缺点：
  - 一旦 runtime.layer 中引入任何异步初始化（Debug、sandbox、外部服务等），就开始抛 AsyncFiberException；
  - 本质上违反了 Effect 对 ManagedRuntime 的设计初衷（Runtime 自己的构建过程可以是异步的）。

结论：**作为通用设计已不成立**，只能在“完全同步 Layer 栈”的极简场景下另行考虑。

### 4.2 路线 B：退回全局 Config，只用 Effect.runSync（当前临时状态）

- 方案：所有 React 配置统一走 `Effect.runSync(ReactModuleConfig.*)`，不再通过 Runtime Env 读取；
- 优点：
  - 完全规避了 `ManagedRuntime.runSync` VS 异步 Layer 的矛盾；
  - 简化了心智，AppDemoLayout + Debug.traceLayer 这类场景恢复稳定；
  - 保留了全局 ConfigProvider 路径，仍然可以按环境调节默认值。
- 缺点：
  - runtime 级覆盖被禁用，不满足“一个进程多个 Runtime，各自不同配置”的诉求；
  - ReactModuleConfig 与 ReactRuntimeConfigTag 的设计优势发挥不出来。

结论：**适合作为“安全基线”**，但不满足我们“奔着完美”的目标。

## 5. 最终方案：Runtime 级配置快照 + RuntimeProvider 加载

> 本节是 5.x「候选方向」的合并与定稿，基于当前代码实现回填“目标态”设计。

### 5.1 Runtime 级配置快照（已实施）

核心思路：**把“读取 runtime Env 中配置”的工作前移到 RuntimeProvider 生命周期里，生成一份纯数据快照，再由 React 集成在 render 阶段直接使用这份快照。**  
当前实现已完全采用这一路线，具体见 3.3 / 5.1 小节。

### 5.2 其他方向的结论：不再推进的方案

> 以下两个方向在设计期讨论过，但在快照方案落地后不再推进，仅保留为“负例”参考。

1) 显式 `reactConfig` prop + Layer 助手  
   - 优点：调用方可以直观地在 JSX 中配置 React 行为；  
   - 缺点：与 `ReactRuntimeConfigTag` / ConfigProvider 模型重复，增加心智负担，且无法自然复用现有 ConfigProvider 生态。  
   - 决策：不作为主路径；如未来确有需求，可在保持快照方案不变的前提下，额外提供一个将 props 翻译为 `ReactRuntimeConfig.replace` 的薄封装组件。

2) 专门为 Config 构造“轻量 Runtime”  
   - 思路：构造仅包含 ConfigProvider / ReactRuntimeConfigTag 的轻量 Runtime，用于读配置；业务 Runtime 自由挂 Debug/sandbox；  
   - 缺点：工程量和心智成本高，引入两套 Runtime 概念，对调用方不友好。  
   - 决策：放弃。当前快照 + RuntimeProvider 方案已足够满足配置需求且实现简单。

## 6. 已完成的落地与验收对照

1) React render 阶段不再出现针对配置加载的 `runSync`  
   - `useModule` / `ModuleCache` 完全不再调用任何 run API，只消费 Context 中的 `reactConfigSnapshot`。  
   - 所有可能异步的配置加载都在 RuntimeProvider 的 `buildEffect` 中通过 `runtime.runSync` / `runtime.runPromise` 处理。

2) Debug / DevTools / sandbox Layer 与配置加载互不阻塞  
   - Runtime Layer 可以自由组合 Debug.layer / Debug.traceLayer / sandbox 等异步 Layer；  
   - `ReactRuntimeConfigSnapshot.load` 在这些 Layer 构建完成后运行，不会破坏 React render 不变量。

3) 多 Runtime 不同配置可通过测试验证  
   - `packages/logix-react/test/integration/reactConfigRuntimeProvider.test.tsx` 中的 `isolates config per runtime when multiple providers coexist` 用例：  
     - runtimeA 通过 ConfigProvider 配置 `gc_time=700`；  
     - runtimeB 通过 `ReactRuntimeConfig.replace({ gcTime: 900 })` 覆盖；  
     - 两个 Provider 下的 `useModule` 分别看到 700 / 900。

4) StrictMode + 重 mount 场景无重复初始化与资源泄漏  
   - `loads config snapshot once under StrictMode` 用例：  
     - 在 StrictMode 下，快照只加载一次，`configVersion` 保持稳定；  
     - ModuleCache 不重复初始化，仅依赖 snapshot + version 控制 GC。

5) 文档与 API 一致性  
   - 本稿与 `docs/ssot/runtime/logix-react/90-adapter-runtime-integration.md`、`apps/docs` 中的 React 集成章节在以下方面保持一致：  
     - 三层配置模型（默认 / ConfigProvider / Runtime override）；  
     - RuntimeProvider → snapshot → useModule / ModuleCache 的单向依赖；  
     - 不在 render 阶段调用 runSync 的约束。  
   - 任何后续对 React 配置模型的调整，应同步更新这三个事实源。
