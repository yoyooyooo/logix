---
title: useModule
description: API Reference for useModule hook
---

# useModule

`useModule` 是 React 中消费 Logix Module 的主要 Hook。  
它既可以**创建/管理局部 ModuleRuntime**（传入 `ModuleImpl`），也可以**接入已经存在的全局 ModuleRuntime**（传入 `Module` Tag 或 `ModuleRuntime` 本身）。

## 基本用法

```tsx
import { useModule } from '@logix/react'
import { CounterImpl } from './modules/counter'

function Counter() {
  // 获取 Module 运行时实例
  const counter = useModule(CounterImpl)

  // 读取状态
  const count = useSelector(counter, (s) => s.count)

  // 派发 Action
  const increment = () => counter.dispatch({ _tag: 'increment' })

  return <button onClick={increment}>{count}</button>
}
```

## API

### 1. `useModule(impl, options?)`（局部 / 会话级 Module）

- **`impl`**：`ModuleImpl` —— 由 `Module.implement` 创建的模块实现。
- **`options`**：仅在第一个参数是 `ModuleImpl` 时可用：
  - `key?: string`  
    - 用于在同一 `ManagedRuntime` 内区分不同“会话实例”；  
    - 相同 `key` 的 `useModule(Impl, { key })` 会共享一份 ModuleRuntime；  
    - **无论 `suspend` 为 `true` 还是 `false`，`key` 的“会话实例”语义完全一致，仅构建路径（同步 / Suspense 异步）不同。**
  - `gcTime?: number`  
    - 会话级场景下的“保活时间”（毫秒），仅在 `useModule(Impl, { key, gcTime })` 形态下生效；  
    - 未指定时，使用 RuntimeProvider 的配置快照：调用点 > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.gc_time` > 默认约 500ms（StrictMode 抖动保护）。
  - `deps?: React.DependencyList`  
    - 依赖数组变化时，会视为“该会话的依赖变了”，触发对应 `ModuleRuntime` 重建；  
    - 内部会做稳定哈希，避免 StrictMode 下 key 抖动。
  - `suspend?: boolean` / `initTimeoutMs?: number`  
    - 当 `suspend: true` 时，`useModule` 会走异步构建路径，并通过抛出 Promise 与 React `Suspense` 集成；  
    - `initTimeoutMs` 指定“初始化最长允许时长”，超时会抛出错误（由外层 ErrorBoundary 处理）；默认来源与 `gcTime` 一致：调用点 > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.init_timeout_ms` > 默认未启用；
    - 在 `suspend: true` 场景下必须显式提供稳定的 `key`（详见 React 集成文档的 Suspense 小节）。

> 注意：`options` **只在 `useModule(Impl, options)` 形态下有效**；  
> 当第一个参数是 `Module` Tag 或 `ModuleRuntime` 时，第二个参数只能是 selector 函数，而不能是 options 对象。

### 2. `useModule(handle, selector, equalityFn?)`（内联选择器）

```ts
const count = useModule(CounterImpl, (s) => s.count)
const count2 = useModule(CounterModule, (s) => s.count)
```

- **`handle`** 可以是：
  - `ModuleImpl`（局部/会话级 Module 实现）；
  - `Module` Tag（全局 Module，通常通过 `Runtime.make` 注册）；
  - 已经拿到的 `ModuleRuntime` 实例。
- **`selector`**：`(state) => slice` —— 内联选择器，只订阅部分状态；
- **`equalityFn`**：可选，自定义比较函数，控制何时触发组件重渲染。

当传入 selector 时，`useModule` 直接返回 selector 的结果，而不是完整的 `ModuleRuntime`。  
这一形态下不再接受 options 对象。

### 3. `useModule(Module)` / `useModule(runtime)`（接入全局 Module）

这两种形态**不会创建新的 ModuleRuntime**，而是接入已经存在的全局运行时：

- `useModule(CounterModule)`  
  - 其中 `CounterModule` 是 `Module.make(...)` 返回的 Tag；  
  - 要求当前组件树外层已经有 `RuntimeProvider`，并且该 Runtime 中包含对应模块；  
  - 常用于“应用级全局 Module”（例如当前用户、全局配置）。
- `useModule(existingRuntime)`  
  - 直接接入已经拿到的 `ModuleRuntime` 对象，纯粹是个“接线”工具。

在这两种形态下：

- `useModule` 不再承担创建/销毁 Runtime 的职责，只负责从当前 React Runtime 中拿到对应实例；
- 第二个参数只能是 selector 函数，**不能**再传 `key/gcTime/suspend` 等 options。

## Behavior

### 执行时机与生命周期心智模型

可以用“**谁创建 Runtime，谁管理生命周期**”来理解不同形态：

1. **`useModule(Impl, options?)`（局部 / 会话级）**  
   - 第一次以某个 `(Impl, key, depsHash)` 组合调用时，`useModule` 会创建对应的 `ModuleRuntime`；  
   - 同一 `ManagedRuntime` 中，相同 `key` 会复用同一份 `ModuleRuntime`；  
   - 当所有使用该 `key` 的组件卸载后，会在 `gcTime` 窗口结束后自动释放（并触发 `onDestroy`）。

2. **`useModule(Module)` / `useModule(runtime)`（全局接入）**  
   - `ModuleRuntime` 的创建时机由上层 `Runtime.make` / `ManagedRuntime` 决定（通常在应用启动时）；  
   - `useModule` 只是把当前组件接入到已有 Runtime，不会新增或销毁 Runtime 实例；  
   - 适合那些“只在应用启动时初始化一次、整个 Session 内保持存在”的全局模块。

### See Also

- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Suspense & Async](../../guide/advanced/suspense-and-async)
- [Guide: React 集成与 Session Pattern](../../guide/recipes/react-integration)
