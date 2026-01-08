---
title: useModule
description: API Reference for useModule hook
---

# useModule

`useModule` 是 React 中消费 Logix Module 的主要 Hook。  
它既可以**创建/管理局部 ModuleRuntime**（传入带 `.impl` 的模块对象或 `ModuleImpl`），也可以**接入已经存在的全局 ModuleRuntime**（传入模块定义对象、`ModuleTag` 或 `ModuleRuntime` 本身）。无论哪种形态，最终返回的都是一个 `ModuleRef`（包含 `runtime` / `dispatch` / `dispatchers` / `imports` 等能力）。

## 能力拆分（心智模型）

- `useModule`：负责解析“模块句柄”（`ModuleRef`），本身**不会订阅**状态变化。
- `useSelector`：负责订阅状态并驱动组件重渲染（推荐把渲染依赖都收敛到 selector）。
- `useDispatch`：负责派发 action（并提供 `batch` / `lowPriority` 两个常用旋钮）。

> 注意：`useModule` / `useSelector` / `useDispatch` 等都必须在 `RuntimeProvider` 子树内调用。

## 基本用法

```tsx
import { useDispatch, useModule, useSelector } from '@logix/react'
import { CounterDef } from './modules/counter'

export function Counter() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch(CounterDef.actions.increment())}>{count}</button>
}
```

## 一个组件内多个 selector（性能写法）

推荐让 `useModule` 只负责“拿到模块句柄”，把渲染依赖都收敛到 `useSelector`：

- 多个字段：用多个 `useSelector(ref, ...)`，或把多个字段打包成对象并传 `shallow`
- 避免同一组件里对同一个模块重复调用多次 `useModule(handle)`（通常没有收益）

```tsx
import { shallow, useModule, useSelector } from '@logix/react'

const user = useModule(UserModule)
const { name, age } = useSelector(user, (s) => ({ name: s.name, age: s.age }), shallow)
```

## 与 actions/dispatchers 的衔接（推荐写法）

在组件里建议按“定义锚点 vs 执行入口”分离：

- **定义锚点**：让代码里显式出现 `ModuleDef.actions.<K>`（ActionToken）。这是稳定符号，便于 IDE 跳转/找引用/重命名。
- **执行入口**：用 `useDispatch(handle)` 或 `ref.dispatch(action)` 执行派发（组件侧无需 `yield*`）。

在此之上，`ref.dispatchers.<K>(payload)` 只是便捷语法糖（内部等价于 `dispatch(ModuleDef.actions.<K>(payload))`）。

```tsx
const counter = useModule(CounterDef)
const dispatch = useDispatch(counter)

const onInc = () => dispatch(CounterDef.actions.increment())
const onIncSugar = () => counter.dispatchers.increment()
```

> 提示：
>
> - `counter.actions.*` 是运行时通过 Proxy 生成的“兼容糖”，IDE 不保证可跳转；需要“跳转/找引用/重命名”时，让代码里出现 `CounterDef.actions.*`（或 `counter.def?.actions.*`）作为锚点。
> - `counter.dispatchers.*` 是运行时生成的语法糖（少写 `dispatch(CounterDef.actions.<K>(...))`）；它本身不是源码里的“定义符号”，因此 IDE **不保证**能跳到 `actions.<K>` 的定义。若需要稳定的“跳转/找引用/重命名”，请让代码里显式出现 `CounterDef.actions.*`（或 `counter.def?.actions.*`）作为锚点。

## API

### 1. `useModule(handle, options?)`（局部 / 会话级 Module）

- **`handle`**：`ModuleImpl` 或“带 `.impl` 的模块对象” —— 用于创建/管理局部实例。
- **`options`**：仅在第一个参数是 `ModuleImpl` 或“带 `.impl` 的模块对象”时可用：
  - `key?: string`
    - 用于在同一 `ManagedRuntime` 内区分不同“会话实例”；
    - 相同 `key` 的 `useModule(Impl, { key })` 会共享一份 ModuleRuntime；
    - 未传 `key` 时也仍然会创建一个“组件级”的局部实例（不会回退到全局单例）。
    - **无论 `suspend` 为 `true` 还是 `false`，`key` 的“会话实例”语义完全一致，仅构建路径（同步 / Suspense 异步）不同。**
  - `gcTime?: number`
    - 会话级场景下的“保活时间”（毫秒），仅在 `useModule(Impl, { key, gcTime })` 形态下生效；
    - 未指定时，使用 RuntimeProvider 的配置快照：调用点 > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.gc_time` > 默认约 500ms（StrictMode 抖动保护）。
    - 全局注入示例见：[React 集成（启动策略与冷启动优化）](../../guide/essentials/react-integration) 的“全局默认配置”小节。
  - `deps?: React.DependencyList`
    - 依赖数组变化时，会视为“该会话的依赖变了”，触发对应 `ModuleRuntime` 重建；
    - 内部会做稳定哈希，避免 StrictMode 下 key 抖动。
  - `suspend?: boolean` / `initTimeoutMs?: number`
    - 当 `suspend: true` 时，`useModule` 会走异步构建路径，并通过抛出 Promise 与 React `Suspense` 集成；
    - `initTimeoutMs` 指定“初始化最长允许时长”，超时会抛出错误（由外层 ErrorBoundary 处理）；默认来源与 `gcTime` 一致：调用点 > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.init_timeout_ms` > 默认未启用；
    - 在 `suspend: true` 场景下必须显式提供稳定的 `key`（详见 React 集成文档的 Suspense 小节）。

> 注意：`options` **只在 `useModule(Impl, options)` 形态下有效**；  
> 当第一个参数是模块定义对象 / `ModuleTag` / `ModuleRuntime` 时，第二个参数只能是 selector 函数，而不能是 options 对象。

### 2. `useModule(handle, selector, equalityFn?)`（内联选择器）

这是 `useSelector` 的语法糖：`useModule(handle, selector[, equalityFn])` 等价于 `useSelector(useModule(handle), selector[, equalityFn])`。

```ts
const count = useModule(CounterImpl, (s) => s.count)
const count2 = useModule(CounterDef, (s) => s.count)
```

- **`handle`** 可以是：
  - 带 `.impl` 的模块对象或 `ModuleImpl`（局部/会话级 Module 实现）；
  - 模块定义对象（`Logix.Module.make(...)` 的返回值）或 `ModuleTag`（全局 Module，通常通过 `Runtime.make` 注册）；
  - 已经拿到的 `ModuleRuntime` 实例。
- **`selector`**：`(state) => slice` —— 内联选择器，只订阅部分状态；
- **`equalityFn`**：可选，自定义比较函数，控制何时触发组件重渲染。

当传入 selector 时，`useModule` 直接返回 selector 的结果，而不是完整的 `ModuleRef`。  
这一形态下不再接受 options 对象。

### 3. `useModule(模块定义对象 / ModuleTag)` / `useModule(runtime)`（接入全局 Module）

这两种形态**不会创建新的 ModuleRuntime**，而是接入已经存在的全局运行时：

- `useModule(CounterDef)` / `useModule(CounterDef.tag)`
  - 其中 `CounterDef` 是 `Logix.Module.make(...)` 返回的模块定义对象（ModuleDef，它带 `.tag` 作为身份锚点）；
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

2. **`useModule(模块定义对象 / ModuleTag)` / `useModule(runtime)`（全局接入）**
   - `ModuleRuntime` 的创建时机由上层 `Runtime.make` / `ManagedRuntime` 决定（通常在应用启动时）；
   - `useModule` 只是把当前组件接入到已有 Runtime，不会新增或销毁 Runtime 实例；
   - 适合那些“只在应用启动时初始化一次、整个 Session 内保持存在”的全局模块。

### See Also

- [API: RuntimeProvider](./provider)
- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Suspense & Async](../../guide/advanced/suspense-and-async)
- [Guide: React 集成与 Session Pattern](../../guide/recipes/react-integration)
- [API: useLocalModule](./use-local-module)
- [API: useImportedModule](./use-imported-module)
