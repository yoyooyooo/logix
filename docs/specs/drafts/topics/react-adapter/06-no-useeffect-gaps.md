---
title: Logix React 组件「无 useEffect / useRef」目标与缺口草稿
status: draft
version: 2025-12-06
value: core
priority: next
---

# Logix React 组件「无 useEffect / useRef」目标与缺口

## 背景与目标

- 平台长期目标：在 Logix 成熟后，**业务组件内部除了 `useModule` 等 Logix hooks，不再需要也不鼓励使用 `useEffect`**（包括直接使用和封装到自定义 hooks 中）。
- 理想状态下，业务工程师编写页面/流程时，只需要：
  - 用 `Logix.Module / Logic / Link / Watcher` 定义行为与联动；
  - 在 React 侧用 `RuntimeProvider + useModule / useSelector / useDispatch / useLocalModule` 消费；
  - 不再在组件里写「`useEffect(() => { ... return cleanup })` + 状态胶水」表达业务逻辑。
- 本草稿用于梳理：在当前 Logix/React 组合的能力下，**是否还存在“只能在 useEffect 里干、Logix 体系干不了”的场景**，以及这些缺口对应的演进方向。

## 一、核心业务逻辑层：能力是否覆盖 useEffect

当前认为在「应该收敛到 Logix 的那部分业务逻辑」上，能力基本已经覆盖传统 `useEffect` 的职责：

- **依赖变化触发行为**  
  - 用 `$.onState / $.onAction / $.on(...)` + `.run* / .update / .mutate` 表达「状态/事件变化 → 执行副作用或更新」，替代「`useEffect` + 依赖数组」。
- **生命周期管理**  
  - 用 `$.lifecycle.onInit / onSuspend / onResume` 表达「模块初始化 / 挂起 / 恢复」阶段的 Effect，替代组件级 `useEffect` 的 mount/unmount/visibility 场景。
- **并发与竞态**  
  - 通过 Effect 的 `fork/interrupt/timeout/retry` 以及 Logix Link/Watcher，表达「请求竞态、取消、顺序保证、防抖/节流」等模式，避免在多个 `useEffect` 中用 flag 手写竞态控制。
- **跨模块联动**  
  - 用 `Link.make` / Watcher 体系在模块层表达协作链，而不是在 React 组件树之间通过 `useEffect` + prop 变化联动。

结论：在我们希望“彻底搬出组件”的那部分业务行为上，**目前没有发现必须依赖 useEffect 才能实现的场景**；这一层的缺口更多是“API 易用性与样板”的问题，而不是表达力本身不足。

## 二、容易逼业务回到 useEffect 的场景类型

缺口主要集中在「还没有被 Logix/Platform 抽象为一等能力」「示例/文档仍建议用 useEffect 过渡」的几个方向：

### 2.1 宿主环境事件 / 平台级信号

典型例子：

- Page Visibility (`document.visibilitychange`)；
- Window 级事件：`focus/blur/resize/scroll`；
- `navigator.onLine`、网络状态变化等。

当前状态：

- 有 `SessionPlatformVisibilityBridge` 这类 demo：React 组件里用 `useRuntime + useEffect` 监听 DOM 事件，再调用 `Logix.Platform` 的 `emitSuspend/emitResume`。
- 业务工程师若参考这些 demo，很容易在自己组件里复制同样的 `useEffect` 模式。

潜在演进方向：

- 明确「宿主事件 → Logix Platform/Service Tag → Logic/Watcher」的标准桥接模式；
- 提供可复用的 Platform 层实现（例如 `ReactPlatformLayer` 内建 visibility/focus 路由），让业务不再直接接触 DOM 事件。

### 2.2 第三方 hooks / 库集成（React Query / RHF 等）

典型例子：

- React Query：`useQuery` 结果同步到 Logix 状态；
- React Hook Form：通过 `watch` 监听表单值变化并写回 Logix Module。

当前状态：

- `runtime-logix` 集成文档中仍建议「在组件里用 `useEffect` 监听第三方库的输出，再同步给 Logix Module」。
- `@logixjs/query`、`@logixjs/form` 等插件体系尚在规划阶段，尚未为业务提供「纯 Logix 视角」的集成 API。

潜在演进方向：

- 把这类集成抽象为 Logix 侧插件/Service（例如 `QueryService`、`FormService`），在 Logic/Flow 内部使用；
- React adapter 只负责把基础 runtime 和平台环境挂载好，不要求业务自己写 `useEffect` 胶水。

### 2.3 强 DOM 绑定的 UI 行为

典型例子：

- 基于 `IntersectionObserver` 的懒加载 / 进入视口触发；
- 读写元素尺寸/位置（layout/measure），用于动画或布局调整；
- 调用第三方图表/地图组件实例的 imperative API。

当前状态：

- 没有系统性的「DOM/视图能力作为 Platform Service」抽象；多数场景仍会自然落回组件级 `useEffect + ref`。

潜在演进方向：

- 以 Platform/Service Tag 形式封装 DOM 能力，由 Logic/Effect 驱动；
- 在 React 侧提供少量标准化的桥接组件（例如 `ViewportObserver`, `MeasuredBox`），将 DOM 细节封装在底层，而非让业务组件直接写 `useEffect`。

## 三、React 适配层内部 vs 业务层的边界

当前 `@logixjs/react` 内部仍有一些 `useEffect` 用于管理 Runtime/Layer/ModuleCache 生命周期，例如：

- `RuntimeProvider` 中用 `useEffect` 构建/清理 `Layer` 绑定与 `Scope`；
- `useModule / useLocalModule` 中用 `useEffect` 配合 `ModuleCache` 做引用计数与 GC。

这些属于：

- **React ↔ Logix Runtime 的基础设施桥接**，对业务调用方是透明的；
- 不影响“业务组件是否需要手写 useEffect”这一 UX 目标。

目前不考虑在短期内完全消灭适配层内部的 `useEffect`，而是将其视为底层实现细节。

## 四、结论与后续行动提示

综合当前仓库的实现与文档：

- 在「核心业务逻辑/联动」层面，Logix 已基本具备替代 `useEffect` 的表达力，**业务工程师在这层不需要再写 useEffect**；
- 真正的缺口集中在：
  - 宿主环境事件 / 平台级信号的标准桥接；
  - React Query / RHF 等主流库的 Logix 化集成；
  - 典型 DOM 行为的 Platform 抽象与基础桥接组件。

下一步可以考虑：

- 在 `.codex/skills/project-guide/references/runtime-logix` / React Adapter topic 下，把上述三类场景整理为明确的「能力空位」；
- 为每一类空位设计对应的 Platform/Plugin/Service 形状，并按「插件优先、React 组件只做挂载」的原则推进实现；
- 将现有文档中建议使用 `useEffect` 的集成方案，逐步改写为 Logix 原生能力的示例，收紧对业务侧 `useEffect` 的需求。

## 附录：useRef 场景分类与收编策略

> 现状：上文更多从「副作用表达位置」讨论 `useEffect` 的收编，`useRef` 只在「DOM + ref」场景被顺带提及。这里单独把 `useRef` 拆型，明确在 Logix 视角下应该落到哪一层。

### A. 逻辑状态型 useRef → Module State / SubscriptionRef

典型例子：

- 记录「上一次的值」：`const prev = useRef(value)`，配合 `useEffect` 维护；
- 某个业务 flag / 计数器：`isFirstRenderRef`、`retryCountRef` 等；
- 不直接参与渲染，但会影响逻辑分支的“隐形状态”。

收编策略：

- 能进 Module State 的一律当正常状态建模：  
  - 把 `prevX`、`retryCount` 等直接放进 Module 的 `state`，用 `$.state.update / mutate` 管理；  
  - UI 不需要展示的字段可以作为「internal state」存在，但仍然是状态图的一部分，便于追踪与回放。
- 对于「长逻辑内部要多次读写当前 state/派生视图」的场景，用 `SubscriptionRef` 做“逻辑 Ref”：  
  - Logic/Flow 内通过 `Bound.state.ref(selector)` 或 `ModuleRuntime.ref(selector)` 取得 `SubscriptionRef<V>`；  
  - 在 Effect 里用 `yield* SubscriptionRef.get(ref)` / `SubscriptionRef.update(ref, f)` 读写，替代组件里的 `useRef.current`。

直觉版原则：**业务上有语义的 mutable，都进 Module 的状态图或 SubscriptionRef，不再通过组件层 `useRef` 偷藏。**

### B. Flow 资源型 useRef → Effect.Ref / Service Tag

典型例子：

- Timer/Interval 句柄：`timeoutIdRef`、`intervalIdRef`；
- `AbortController`、重试计数、节流窗口等“跨事件但不需要出现在 state 里”的控制资源；
- 某段长逻辑内部要维护的局部 cache。

收编策略：

- 这类 mutable 本质上是 Flow/Effect 层的「运行时资源」，优先用 Effect 自带的 `Ref` / `Ref.Synchronized`，或封装成 Service：  
  - 在 Logic/Flow 里 `yield* Ref.make(initial)` 拿到 `Ref<A>`，配合 `Ref.get / Ref.set / Ref.update` 管理；  
  - 若需要在多个 Logic/Watcher 间共享，则抽象为 Service Tag（例如 `TimerService`），通过 Layer 注入实现。
- 不再建议在 React 组件里用 `useRef` 存放 timer id / AbortController，然后从事件回调里手动读写；这些都应该收敛到逻辑流程中，由 Effect 处理竞态与清理。

直觉版原则：**只和控制流/资源清理相关、不会影响 UI 结构的 mutable，归 Flow/Effect 层，用 `Ref`/Service 而不是组件 `useRef`。**

### C. 视图句柄 / 第三方实例型 useRef → Platform.ViewHandles + React Hook

典型例子：

- DOM 节点句柄：`inputRef`、`containerRef`，用于聚焦、滚动、测量；
- 第三方组件/图表/地图实例：`chartRef`、`mapRef`，需要调用 imperative API；
- 表单库实例（如 RHF 的 `form` 对象），既要参与 UI，又要被业务逻辑驱动。

收编方向（草案）：

- 在 Runtime/Platform 层定义一类「视图句柄服务」，由平台实现、Logic 消费，例如：
  - `ViewHandles.register(id, handle)` / `unregister(id)`：由适配层在组件挂载/卸载时调用，注册真实句柄；
  - `ViewHandles.get(id)`：逻辑侧按需读取（通常包在 Effect 内部）；
  - `ViewHandles.with(id, f)`：语义化地“在有句柄时执行某个 Effect”。
- 在 `@logixjs/react` 中提供标准 hooks 作为唯一合法的 `useRef` 入口，例如（示意）：

  - `const ref = useViewHandle("usernameInput")`；  
  - 组件中 `<input ref={ref} ... />`；  
  - Logic 中则写 `ViewHandles.with("usernameInput", (input) => /* focus/scroll */)`。

这样，**业务组件写 JSX 时仍然看到 `ref`，但不直接操作 `useRef`；所有持久化与清理逻辑都在 React 适配层 + Platform.Service 中统一实现。**

### D. 回调闭包 / useLatest 型 useRef → Logix 事件 + 集成 Hook

典型例子：

- `useLatest` 模式：`const latestFn = useRef(fn); latestFn.current = fn;`，再把 `() => latestFn.current()` 传给第三方库；
- 需要“稳定引用 + 最新闭包”的场景（订阅库回调、事件总线等）。

收编策略：

- 首选方案是让第三方库看到的永远是「Logix 派发器」或语义化事件函数：  
  - 组件用 `const dispatch = useDispatch(...)` 拿到稳定回调；  
  - 对外传递的都是 `() => dispatch({ _tag: "..." , payload })`，而不是真实业务闭包。
- 对于必须接第三方库、且库要求传入“稳定 callback 句柄”的情况，可以在 React 适配层提供官方的集成 hook（例如 `useLogixCallback`），内部使用 `useRef` 封装 `useLatest` 模式，但**不鼓励业务自己手写这一套**。

直觉版原则：**“稳定回调”问题对业务暴露为 Logix 事件/dispatch，`useRef` 只在官方集成 hooks 里作为实现细节存在。**

### E. 总结性边界约定（对业务侧）

- 业务组件/自定义 hooks 不再直接使用裸 `useRef` 管理业务 mutable；  
  - 业务语义状态 → Module State / SubscriptionRef；  
  - Flow 资源 → Effect.Ref / Service；  
  - 视图/实例句柄 → Platform.ViewHandles + 官方 React hooks；  
  - 稳定回调 → Logix dispatch + 官方集成 hooks。
- `useRef` 仍然可以在 `@logixjs/react` 内部、平台适配层、特定集成包（如 `@logixjs/query`、`@logixjs/form`）中作为实现细节使用，但应通过上述分类原则自检：确保最终对业务只暴露 Logix/Platform 抽象，而不是原生 React mutable。 
