---
title: Runtime Logix · Watcher 并发与内存泄漏检查设计草案
status: draft
version: 0.1.0
layer: L9
related:
  - ./runtime-logix-core-gaps-and-production-readiness.md
  - ./plan-runtime-logix-v1-readiness.md
  - ../../runtime-logix/impl/app-runtime-and-modules.md
priority: 2100
---

# Runtime Logix · Watcher 并发与内存泄漏检查设计草案

> 目标：为 v1.0 设计一套可执行的「长生命周期 / 高并发 watcher」验证方案，覆盖 `run/runLatest/runFork/runParallel`、Link、`$.useRemote` 等主路径，尽可能提前暴露内存泄漏和性能退化问题。

## 1. 背景与问题定义

当前 Runtime Logix 的并发/长生命周期能力主要通过以下入口暴露：

- Bound API / Flow：
  - `$.onState / $.onAction / $.on`；
  - `$.flow.run / runParallel / runLatest / runExhaust / runFork / runParallelFork`。
- Link：
  - `Link.make` 中长驻的跨模块 Orchestrator 逻辑；
  - `Link` 通常会订阅多个模块的 `actions$` / `changes`。
- Remote：
  - `$.useRemote(Module).onState` / `.onAction` 组合出的跨模块 watcher。

这些 watcher 多数是长生命周期、持续订阅式的 Effect：

- 一旦 Scope / SubscriptionRef / Fiber 管理不当，极易出现：
  - Fiber 池增长不回收；
  - SubscriptionRef/Stream 订阅不解除；
  - ModuleRuntime 多次创建/销毁但老的 watcher 仍在跑。

本草案要解决的问题是：

- 定义一组 **可重复执行的 benchmark / test 场景**，专门针对 watcher 并发与内存泄漏；
- 为日常开发和 v1.0 发布前提供一套“是否有明显内存/资源泄漏”的检查手段。

## 2. 设计目标与范围

### 2.1 设计目标

1. **具备可执行脚本**：提供一套可以通过 `pnpm bench:watchers` 或 `pnpm test:watchers` 运行的脚本，观察资源使用曲线；
2. **覆盖核心模式**：至少覆盖：
   - 单模块高频 `onAction().runFork` / `runParallel`；
   - 多模块 + Link + `$.useRemote` 联动；
   - React 场景下反复 mount/unmount hooks（`useModule` / `useLocalModule`）；
3. **可比较**：能够在不同提交之间对比“泄漏/资源上界是否变差”，而不要求非常精确的数值；
4. **非侵入**：尽量通过现有 API（DebugSink / Lifecycle / 内部计数器）观测，而不在核心路径引入重型 profiling。

### 2.2 范围边界

本草案 focus 的是：

- `@logix/core` 内部 watcher 的 Fiber/Scope/SubscriptionRef 管理；
- `@logix/react` 在典型 React 挂载/卸载场景中的 ModuleRuntime 释放情况。

不包括：

- 浏览器级别的 FPS/渲染时间（这更偏 UI/交互层 benchmark）；
- 复杂业务流程（只抽象最典型的流控模式）。

## 3. 观测指标与工具策略

为了不把核心代码弄得太复杂，建议采用“轻量内部计数 + DebugSink”组合：

- 在 `ModuleRuntime.make` 内部维护一些 debug-only 计数器（通过 `DebugSink` 或专用 tag 暴露）：
  - 当前 active watcher Fiber 数量（或 rough 估算）；
  - 每个 ModuleRuntime 的 `subscriptionCount`（由 `changes` / `actions$` 派生）；
  - ModuleRuntime 创建/销毁次数（已有 `module:init` / `module:destroy` 事件，可用）。
- 在 benchmark/test 脚本中：
  - 通过注入特定的 DebugSink 实现，收集上述事件；
  - 在跑完场景后，对这些计数器做简单 sanity check：
    - Fiber/订阅数量在测试结束后不再增长；
    - destroy 数量与 create 数量匹配（在预期范围内）。

> 说明：这些计数器可以通过“仅在开发/测试环境启用”的方式实现，例如受 `NODE_ENV !== "production"` 控制，避免生产环境性能影响。

## 4. 场景一：单模块高频 `runFork` / `runParallel`

### 4.1 场景描述

- 模块 `Counter`：
  - state: `{ value: number }`；
  - actions: `{ tick: void }`。
- Logic A（runFork）：

```ts
const CounterRunForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("tick").runFork(
      $.state.update((s) => ({ ...s, value: s.value + 1 })),
    )
  }),
)
```

- benchmark 行为：
  - 在一个 ModuleRuntime 实例上，连续 dispatch `tick` N 次（例如 10k 次），间隔尽量短；
  - 等待一段时间（例如 1s），让所有 watcher 有机会执行完；
  - 记录：
    - 最终 state.value 是否为 N；
    - DebugSink 内记录的 watcher Fiber 数量是否在合理上界内（不会随 N 持续线性增长）。

### 4.2 实现要点

- entry：`packages/logix-core/test/watcherPatterns.test.ts` 或单独的 `benchmarks/watcher-fork-bench.ts`；
- 可用 `TestClock` / `Schedule` 控制时间，减少真实时间等待；
- 确保所有 watcher 被绑定到 ModuleRuntime 的 Scope 上（已有 `Effect.forkScoped`），在 Scope close 时自动清理。

### 4.3 验收标准（示例）

- 在 N = 10k 时，测试可以在限定时间内完成（例如 <5s），state.value == N；
- 模块销毁后（Scope close）不会再有新的 DebugSink 事件（如 action dispatch / state update）；
- watcher Fiber 的最大数量在 N 的数量级附近，但在测试结束后不再增长。

## 5. 场景二：多模块 + Link + `$.useRemote`

### 5.1 场景描述

- 模块：
  - `Source`：触发 action 流；
  - `Target`：实际做一些轻量 state 更新；
  - `Badge`：通过 `$.useRemote(Target)` 监听 Target 状态，更新自己的展示字段；
  - Link：在 Source 和 Target 之间做额外 Orchestrator（例如过滤、聚合）。
- 目标：
  - 在有 Link + useRemote 的状态下，频繁触发 Source/Target 的 action，验证：
    - 所有联动链路在高频下保持正确；
    - Link / Remote watcher 的 Fiber/订阅在结束时被回收。

### 5.2 行为脚本（简要）

```ts
// 伪代码结构

const app = Logix.app({
  layer: Layer.empty,
  modules: [
    Logix.provide(Source, Source.live(...)),
    Logix.provide(Target, Target.live(...)),
    Logix.provide(Badge, Badge.live(...)), // 内部用 $.useRemote(Target)
  ],
  processes: [LinkLogic], // Link.make(...)
})

const program = Effect.gen(function* () {
  const source = yield* Effect.provide(Source, app.layer)
  const badge = yield* Effect.provide(Badge, app.layer)

  for (let i = 0; i < N; i++) {
    yield* source.dispatch({ _tag: "trigger", payload: ... })
  }

  yield* Effect.sleep("1 second")

  const badgeState = yield* badge.getState
  // 断言 badgeState 反映了所有有效触发
})
```

### 5.3 观测点

- DebugSink 中：
  - Link 相关的 error/event 是否可见；
  - 在 app Scope 关闭后，不再有 Link 或 Remote watcher 发出的事件。
- Fiber/订阅：
  - 每个 ModuleRuntime 的 watcher 数量是否稳定在预期上界；
  - 多次重复运行 benchmark（例如 10 次）后，资源占用不呈线性增长。

## 6. 场景三：React 下的 mount/unmount 压力

### 6.1 场景描述

- 使用 `@logix/react` 的 hooks：
  - `RuntimeProvider` 提供一个包含若干模块的 AppRuntime；
  - 子组件 A 使用 `useModule(Module)` 或 `useModule(Module, selector)`；
  - 子组件 B 使用 `useLocalModule(ModuleImpl)`。
- 测试行为：
  - 循环 mount/unmount A/B 组件 N 次（例如 1000 次）；
  - 在每次 mount 期间 dispatch 若干 action，观察 state 正常更新；
  - 在全部 unmount 后，验证：
    - DebugSink 中 `module:destroy` 事件数量与 `module:init` 大致匹配；
    - Runtime 内部 Scope/Fiber 没有持续增长。

### 6.2 实现建议

- 使用 `vitest` 的 jsdom/happy-dom 环境，在 `packages/logix-react/test` 中添加 `useLocalModule.leak.test.tsx`：
  - 用一个简单的 `TestComponent` 包一层 `RuntimeProvider`；
  - 在测试中手动控制 mount/unmount（`render` / `unmount`）；
  - 通过自定义 DebugSink 收集 module init/destroy 事件。

## 7. 任务拆分与落地顺序

参考 `runtime-logix-core-gaps-and-production-readiness.md` 和 v1 Plan，建议按以下顺序实施：

1. **核心计数与 DebugSink 扩展**  
   - 在 `ModuleRuntime.make` 内增加 debug-only 的计数器（Fiber/订阅数量）和 DebugSink 事件；
   - 确保这些计数在生产构建下可以关闭或降级。

2. **核心 watcher 场景的单元/集成测试（core 包）**  
   - 在 `watcherPatterns.test.ts` 或新增文件中实现“单模块高频 runFork/runParallel”场景；
   - 增加 Link + useRemote 联动场景的高频测试。

3. **React 挂载/卸载场景测试（react 包）**  
   - 新增 hook 层面的 leak/pressure 测试，覆盖 `useModule` / `useLocalModule` / `useLayerModule`；
   - 与 core 的 DebugSink 计数结合，验证没有明显泄漏。

4. **可选：简单的 bench 脚本**  
   - 在 `benchmarks/` 目录下补充脚本，方便本地或 CI 上做粗粒度的性能/内存回归检查；
   - 不强制集成到常规 test suite，但在 release 前做一次人工/自动跑通。

## 8. 与 v1.0 Plan 的关系

- 本草案对应 `plan-runtime-logix-v1-readiness.md` 中 Phase 3 的“压力测试与内存基准”部分；
- 当上述场景与指标落地后，应在：
  - `runtime-logix-core-gaps-and-production-readiness.md` 中将 2.4 条目标记为 Resolved；
  - `runtime-logix` 规范或 impl/README 中补充一节“Watcher 资源管理与压力测试策略”，供未来贡献者参考。
