# React 集成指南 (React Integration Guide)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Adapter Layer
> **Audience**: React 应用开发者与 Adapter 作者；不涉及引擎内部实现细节。

本文档描述了如何将 Logix 引擎与 React UI 框架无缝集成。核心目标是实现 **UI is Dumb** 的设计理念，让 React 专注于渲染，而将所有状态管理和业务逻辑委托给 Logix。

> **规范分级提示**
> - 本文中的要求可以分为三层：
>   - **Level 1（行为约束）**：必须满足的运行时语义，例如“避免状态撕裂 (tearing)”“Runtime 引用稳定”等；
>   - **Level 2（推荐 API 形状）**：例如 `useModule(handle, selector, equalityFn?)` 的具体签名，允许在不破坏 Level 1 的前提下做小幅调整；
>   - **Level 3（长期能力）**：如更丰富的调试/性能特性，可作为 v3.x 演进目标，而非当前必须一次性实现的部分。
> - 实现 `@logix/react` 时，应优先保证 Level 1，再在迭代中逐步对齐 Level 2 / Level 3。

## 1. 核心 API: Store Hooks

React 适配层围绕三类 Hooks 暴露能力：

- `useModule(handle)`：获取对应 Module 的 `ModuleRuntime`（**Stable, 不订阅状态更新**）；
  - 支持 `ModuleInstance`（全局共享）、`ModuleImpl`（局部实现）或 `ModuleRuntime`（直接复用）。
- `useModule(handle, selector, equalityFn?)`：**[推荐]** 直接订阅状态，内部基于 `useSyncExternalStore`，可传入自定义 `equalityFn`；
- `useSelector(handle | runtime, selector, equalityFn?)`：在已有 Runtime 或 Module Tag 上做细粒度订阅；
- `useDispatch(handle | runtime)`：获取稳定的 `dispatch` 函数，自动复用当前 React Runtime。
- `useImportedModule(parent, childModule)`：**[分形模块]** 从“父模块实例的 imports scope”解析子模块实例（避免多实例场景串用全局 registry）。

这三者构成连接 React 与 Logix 领域模块的基础桥梁。

### 1.1 ModuleImpl: 推荐的模块实现单元

为了简化 React 侧的模块消费，Logix v3 引入了 `ModuleImpl` 概念：将 Module 蓝图、初始状态、Logic 列表和依赖环境打包为一个“实现单元”。

**定义 ModuleImpl**:

```typescript
// 1. 定义 Module (Shape + Logic Factory)
export const RegionModule = Logix.Module.make("RegionModule", { state, actions })
export const RegionLogic = RegionModule.logic<RegionService>(/* ... */)

// 2. 构造 Impl (绑定 Initial + Logic)
export const RegionImpl = RegionModule.implement({
  initial: { province: null, city: null, isLoading: false },
  logics: [RegionLogic]
})
```

**在 React 中消费**:

```tsx
function RegionPage() {
  // 自动处理 Scope、Layer 构建和依赖注入
  const region = useModule(RegionImpl)

  const province = useSelector(region, s => s.province)
  // ...
}
```

相比旧的 `useLocalModule(factory)`，`ModuleImpl` 模式让 UI 代码更干净，且类型推导更完整。

```typescript
import { useModule, useDispatch } from '@logix/react';
import { shallow } from '@logix/react'; // 或 import { shallow } from 'zustand/shallow'
import { MyModuleLive } from './module'; // Module.live 导出的 Live Layer 句柄

function MyComponent() {
  // 1. [推荐] 直接订阅状态 (Unified API)
  const count = useModule(MyModuleLive, s => s.count);

  // 2. 使用 shallow 比较 (支持返回对象)
  const { name, age } = useModule(MyModuleLive, s => ({
    name: s.user.name,
    age: s.user.age
  }), shallow);

  // 2. 获取 Runtime (用于 dispatch 或传递给子组件)
  const runtime = useModule(MyModuleLive);
  const dispatch = useDispatch(runtime);

  return (
    <button onClick={() => dispatch({ _tag: 'increment' })}>
      Count: {count}
    </button>
  );
}

> 关于在 Logic 内部挂 watcher（`Effect.all + run` / `Effect.forkScoped` / `runFork`）以及它们与 Scope / 生命周期的关系，可以在产品文档中参阅《Watcher 模式与生命周期》一节；React 场景下的行为与核心引擎保持一致。
```

### 1.2 分形模块（imports）：在父实例 scope 下读取/派发子模块

当一个子模块（例如 `Query`）通过 `imports: [Child.impl]` 被挂载到多个不同的父模块实例上时：

- **父模块实例 ≈ 子模块实例的作用域锚点**；
- 组件侧如果直接 `useModule(Child.module)`，拿到的是“当前运行环境（RuntimeProvider 链）”下的 ModuleTag 单例语义，无法表达“属于哪个父实例”的绑定；
- 推荐使用 `useImportedModule(parent, Child.module)` 以显式绑定到父实例 scope。

```ts
import { useModule, useImportedModule, useSelector } from "@logix/react"

const host = useModule(HostImpl, { key: "SessionA" })
const child = useImportedModule(host, Child.module)

const status = useSelector(child, (s) => s.status)
```

也可以使用链式语法糖（推荐）：

```ts
import { useModule, useSelector } from "@logix/react"

const host = useModule(HostImpl, { key: "SessionA" })
const child = host.imports.get(Child.module)

const status = useSelector(child, (s) => s.status)
```

注意：

- “父实例 scope” 通常来自 `useModule(HostImpl, { key })` / `useModule(HostImpl)` / `useLocalModule(HostModule, ...)`；避免用 `useModule(HostModule)`（Tag 语义）作为 parent 再去解析 imports；
- `useImportedModule` / `host.imports.get(...)` 是 strict-only：只能从 `parent` 的 imports scope 解析；缺失即抛错（dev/test 下给出可读提示），避免“悄悄读到另一个实例”；
- `host.imports.get(Child.module)` 返回稳定的 `ModuleRef`，可直接写在组件 render 内（无需 `useMemo`）；如偏好显式 memo，可使用 `useImportedModule(host, Child.module)`；
- 编排/转发建议：父模块 Logic 内优先使用 `$.use(Child.module)`（同一实例 scope 的 DI 语义）进行编排，UI 仍只依赖父模块；仅当 UI 需要直连子模块 state/dispatch 时使用 `host.imports.get(...)`；
- 深层 imports（3 层+）避免在组件里到处“爬树”：优先在边界 resolve 一次把 `ModuleRef` 往下传，或把常用模块提升为 Host 的直接 imports；必要时将子模块的最小 view 投影到父模块 state 再由 UI 消费。
- 若你刻意使用 root/global 单例语义：使用 `useModule(Child.module)`（受 RuntimeProvider.layer 影响，最近 wins）；或在 Effect 边界使用 `Logix.Root.resolve(Child.module)`（固定 root provider，忽略局部 override）。

## 2. 状态订阅 (State Subscription)

### 2.1 细粒度订阅与 Memoization

为了优化性能，Logix 提供了两种处理 Computed State 的方式：

#### 方式 A：使用 `equalityFn` (Shallow Compare)

类似 Zustand，你可以传入一个比较函数（如 `shallow`）来允许 Selector 返回新对象，只要内容没变就不重渲染。

```typescript
import { shallow } from '@logix/react';

// ✅ Safe: 虽然每次返回新对象，但 shallow 比较会发现内容没变，不会重渲染
const userView = useSelector(runtime, s => ({
  name: s.name,
  role: s.role
}), shallow);
```

#### 方式 B：使用 Memoized Selector (Reselect / Proxy-Memoize)

对于复杂的派生计算（如过滤列表），建议使用 `reselect` 或 `proxy-memoize` 创建一个稳定的 Selector。

```typescript
import { createSelector } from 'reselect';

// 定义 memoized selector (在组件外)
const selectActiveUsers = createSelector(
  [(s: State) => s.users, (s: State) => s.filter],
  (users, filter) => users.filter(u => u.name.includes(filter))
);

function UserList() {
  const runtime = useModule(UserModule);
  // ✅ Safe: 只有当 users 或 filter 变化时，selectActiveUsers 才会重新计算并返回新引用
  const activeUsers = useSelector(runtime, selectActiveUsers);
  return ...
}
```

> **性能最佳实践**：
> 1. **Selector 返回原子值**：尽量让 Selector 返回 string/number/boolean 等基本类型。
> 2. **Stable Runtime**：`useModule(handle)` 获取的 runtime 引用永远不变，可放心作为 Props 传递给子组件，不会触发 `React.memo` 失效。
> 3. **Logic 独立线程**：Logix 的业务逻辑在 Effect Runtime 中运行，不会阻塞 React 渲染线程（Main Thread），只有最终状态变更才会通知 UI。

> 实现约束（Adapter 层）：
> - **Level 2（推荐 API 形状）**：`useSelector` / `useModule(handle, selector)` 签名建议为 `(handle | runtime, selector, equalityFn?)`，默认 `equalityFn` 为 `Object.is`；
> - **Level 1（行为约束）**：订阅必须通过 `useSyncExternalStore` 或等价机制实现，React Adapter 负责封装 selector / equality 行为，业务侧无需接触底层订阅实现；
> - React Runtime Adapter 在运行 Effect 前需自动补齐所有 Layer/Context，保证 selector/dispatch 与 App Runtime 相同的依赖视图。

## 3. 意图派发 (Intent Dispatch)

### 3.1 `dispatch` 函数

`useDispatch` 返回的 `dispatch` 函数用于向 Module 发送 Action。它是类型安全的，会自动推导 `ActionSchema` 中定义的 Action 类型。

```typescript
const moduleRuntime = useModule(myModule);
const dispatch = useDispatch(moduleRuntime);
dispatch({ _tag: 'updateUser', payload: { name: 'Alice' } });
```

> UI Intent 绑定约定：
> - UI 层所有业务事件最终应映射到已有的 Action 或 IntentRule/Flow Anchor；
> - React Adapter 层只提供 `dispatch` 这个稳定锚点，不感知 UI Schema 或组件树结构。

## 3.2 派生状态与瞬态 UI 状态

在设计 React 层的状态使用方式时，需要区分三类数据：

- **Persistent Derived（持久派生状态）**：
  - 业务上有语义、需要参与回放/审计的派生数据（如 `orderTotal`、`hasOverdue`）；
  - 应通过 Logic 规则（Bound API `$` + Fluent DSL / Flow）落在 Module State 中，由 Logix 管理。
- **Transient Derived（视图派生状态）**：
  - 仅用于视图呈现，不需要持久化或跨逻辑复用（如格式化文案、局部显隐）；
  - 推荐在 React 渲染时通过 `useSelector` 计算，保持 Module State 精简。
- **Ephemeral UI State（瞬态 UI 状态）**：
  - 完全属于 UI 表现层，如 hover 状态、某个折叠项是否展开、临时输入框内容等；
  - 推荐保留在 React 本地 state 或 UI Intent 中以 `$local` 源表达，不应长期写入 Module State。

90: 实践上：

- “需要回放和审计”的状态一律进入 Logix；
- “只是为了这一屏好看/好用”的状态尽量通过 `useSelector` 或本地 state 解决；
- React Adapter 不新增状态概念，只提供访问领域模块运行时的 Hook 与订阅桥接。

## 4. 依赖注入与运行时入口 (Dependency Injection & Entry)

Logix 通过 `RuntimeProvider` 组件在 React 树中注入 Effect 运行时环境。核心能力：

- `runtime={ManagedRuntime}`：复用外部构造的 Runtime（推荐形态，通常来自 `Logix.Runtime.make(rootImpl, { layer, onError })`）；
- `layer={Layer}`：在父 Runtime 基础上追加局部 Layer，所有 `useModule`/`useSelector` 将自动 `provide` 该 Layer 输出；

v3 分形 Runtime 模型下，推荐以某个 Root ModuleImpl + `Logix.Runtime.make` 定义应用/页面/Feature 级 Runtime，再通过 `RuntimeProvider runtime={...}` 作为组合根，局部增强则通过 `layer` 叠加。

### 4.1 推荐模式：Root ModuleImpl + Runtime (Fractal Runtime)

最佳实践是使用 Root ModuleImpl + `Logix.Runtime.make` 定义应用/页面级 Runtime，并通过 `runtime` 属性传入。这是全应用或某个 Feature 的 **Composition Root**。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logix/react';
import * as Logix from '@logix/core';
import { Layer } from 'effect';

const RootModule = Logix.Module.make("Root", { state: RootState, actions: RootActions });
const RootImpl = RootModule.implement({
  initial: { /* ... */ },
  imports: [/* ModuleImpls / Service Layers */],
  processes: [/* Coordinators / Links */]
});

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
});

function App() {
  return (
    // 复用预构建的 Runtime，启动全局服务和 Root 进程
    <RuntimeProvider runtime={appRuntime}>
      <Router />
    </RuntimeProvider>
  );
}
```

在这一模式下：

- Root ModuleImpl 通过 `imports` 引入子模块实现，通过 `processes` 声明长生命周期进程（例如 Coordinator / Link）；
- `Logix.Runtime.make` 会在内部使用 AppRuntime 机制合并 Layer、构建根 Scope 并统一 fork 这些进程；
- `RuntimeProvider` 负责在 React 应用生命周期内持有该 Runtime 的 Scope，当应用卸载时自动触发资源释放。
> 推荐在应用级 Runtime 的 `layer` 中合并 `ReactPlatformLayer`，为 Logic Runtime 提供平台生命周期能力（`Logic.Platform`）。  
> `ReactPlatformLayer` 本身只负责在 Env 中提供 `Logic.Platform` 服务，并将 `$.lifecycle.onSuspend/onResume/onReset` 注册的 Effect 收集起来；  
> 具体使用哪些事件源（如 Page Visibility、路由切换、App 前后台）来触发这些生命周期回调，由宿主应用或上层框架自行接线，并通过自定义 Platform 实现或封装在 `ReactPlatformLayer` 之外的桥接代码完成。

### 4.2 兼容模式：Layer 注入 (Layer Injection)

对于局部环境增强（如 Page 层注入局部 Module），或者简单的测试场景，可以使用 `layer` 属性：

```tsx
// src/pages/OrderPage.tsx
import { RuntimeProvider, useLocalModule } from '@logix/react';
import { Layer } from 'effect';

function OrderPage({ userId }: { userId: string }) {
  const pageRuntime = useLocalModule(() => makeOrderPageModule(userId), [userId]);
  const PageLayer = Layer.succeed(OrderPageModuleTag, pageRuntime);

  return (
    <RuntimeProvider layer={PageLayer}>
      <SubComponent />
    </RuntimeProvider>
  );
}
```

> 说明
> - `RuntimeProvider runtime={...}` 用于提供全局应用级 Runtime，是应用或某个 Feature 的组合根；若内层 Provider 也显式传入 `runtime`，则会**完全切换到新的 Runtime**，不再继承外层；
> - `RuntimeProvider layer={...}` 用于在某个子树下增强环境（例如注入页面级 Module 或局部服务），内部会在已有 Runtime 环境之上合并传入的 Layer；当内外层共享同一 Runtime 时，内层 Provider 的 `layer` 会在同名 Tag 上覆盖外层 Env，实现局部差异化配置。

## 5. 生命周期绑定 (Lifecycle Binding)

在 React 适配层，`useModule` 与 `useLocalModule` 体现了两种不同的“归属关系”：

### 5.1 全局 Module (Global Module)

在应用级 Runtime 中注册的 Module（例如通过 Root ModuleImpl.imports 或 AppRuntime 提供的 Layer 挂载）是全局的：

```ts
// app-runtime.ts
const GlobalModule = Logix.Module.make("Global", { state: GlobalState, actions: GlobalActions });
const GlobalImpl = GlobalModule.implement({ initial: { /* ... */ }, logics: [GlobalLogic] });

const RootImpl = RootModule.implement({
  initial: { /* ... */ },
  imports: [GlobalImpl],
  processes: [/* Coordinators / 长生命周期进程 */],
});

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
});
```

子组件通过 `useModule(GlobalModule)` 消费，不需要管理其生命周期；Global Module 的 Scope 绑定到应用级 Runtime，由最外层的 `RuntimeProvider runtime={appRuntime}` 管理。

### 5.2 局部 Module (Local Module)

对于页面级或组件级状态，使用 `useLocalModule` 在当前组件下创建并持有 Module：

```ts
import { useLocalModule } from '@logix/react';

function UserForm({ userId }: { userId: string }) {
  // factory 需返回 Effect<ModuleRuntime>；deps 控制复用/重建
  const moduleRuntime = useLocalModule(() => makeUserFormModule(userId), [userId]);
  const values = useSelector(moduleRuntime, s => s.values);
  const dispatch = useDispatch(moduleRuntime);

  // ...
}
```

`useLocalModule` 也支持直接传入 `ModuleInstance` + 配置：

```ts
const editor = useLocalModule(EditorModule, {
  initial: { content: "" },
  logics: [EditorLogic],
  deps: [docId]
});
```

> `deps` 决定何时重新创建局部 Module（类似 React `useMemo` 语义）；默认不会因为 `initial` 或 `logics` 引用变化自动重建，需要调用方显式传入。

这里 `UserForm` 组件是这棵 Module 的“宿主”，Module 的 Scope 与组件生命周期绑定：
组件卸载时，对应 Module Scope 会被关闭，所有挂在其上的 `forkScoped` 长逻辑会被安全中断。

> 约定：
> - 组件内读取 State 与派发 Action 推荐统一通过 `useModule(Impl)` 获取 Runtime 后再操作；
> - `useLocalModule` 作为底层 API 仍被保留，用于需要自定义 factory 的高级场景。
> - 组件外的业务逻辑 / Pattern 可以直接使用 `module.dispatch` / `module.getState`。

### 5.3 ModuleImpl 的双模式：同步 vs Suspense

在 React 集成层中，`ModuleImpl` 的消费主要通过 `useModule(Impl)` 完成。考虑到真实业务中既存在**纯同步模块**（只依赖内存状态）也存在**异步模块**（依赖 IndexedDB / 远程配置等），React 适配层对 ModuleImpl 提供了两种模式：

1. **默认：同步构建（基线模式）**

- 调用形态：
  - `const runtime = useModule(MyImpl)`
  - `const runtime = useModule(MyImpl, { deps })`
- 特性：
  - 使用 `Resource Cache` + `readSync` 在渲染阶段同步构建 `ModuleRuntime`；
  - 每个组件实例默认持有一份私有的 `ModuleRuntime`，通过内部的 `instanceKey` 保证在 StrictMode 下 key 不抖动；
  - 生命周期通过 `retain/release + 延迟 GC` 与组件绑定，卸载后相关 Scope 和 watcher 会被安全关闭；
  - 仅适用于“构建过程本身是同步的” ModuleImpl（即 `.layer` 不依赖异步初始化）。

2. **可选：Suspense 异步构建（高级模式）**

- 调用形态：

  ```ts
  const id = useId()

  const runtime = useModule(MyImpl, {
    suspend: true,
    key: `Local:${id}`,  // 显式提供稳定 Key
    deps: [userId],
  })
  ```

- 特性：
  - 使用 `Resource Cache` + `read` 在渲染阶段启动异步构建，并通过抛出 Promise 驱动 React Suspense；
  - 允许 ModuleImpl 的 `layer` 内部包含真正的异步初始化逻辑（如 IndexedDB、远程配置加载等）；  
  - 构建完成后仍然通过 `retain/release + 延迟 GC` 管理 Scope 生命周期；
  - **必须显式提供稳定的 `key`**，用于标识该 ModuleImpl 实例的资源——这是运行时契约的一部分，而不是可选优化。

> 为什么异步模式必须显式 `key`？
>
> - React 的 `useId` 只承诺“最终提交到 DOM / Hydration 的 ID 在拓扑意义上稳定”，**不承诺在 Suspense 重试 / 并发中断 / 未提交分支中的中间值稳定**；
> - `ModuleCache` 需要一个“外部可控、跨渲染尝试稳定”的 Key，来判断“当前这次渲染是否在使用同一份局部 ModuleRuntime”，否则会出现“每次重试都创建新资源、永远命中不到已完成构建”的情况（表现为 Suspense fallback 一直 pending）；
> - 因此，在 `suspend: true` 模式下，Logix 规范要求调用方显式传入 `key`，通常建议：
>   - 在 **Suspense 边界外层** 调用 `useId()`，并通过 props 传给内部组件，作为组件级前缀；
>   - 再结合业务 ID（如 `userId` / `formId` / layout slot id）和 `deps`，构造出能在重渲染与重试之间保持稳定的 Key。
>
> 实现说明（当前 @logix/react 状态）：
>
> - 自 L9 重构后，`useModule(Impl, { suspend: true })` 在 **开发/测试环境中若省略 `key` 会立即抛出运行时错误**，提示调用方必须显式提供 `options.key`；  
> - 这一行为旨在防止异步局部 Module 在 StrictMode + Suspense 下因为资源 key 抖动而出现“无限重建资源、永远 pending”的隐蔽问题；  
> - 生产环境建议同样遵循该约束：所有使用 `suspend: true` 的调用都应按上文模式显式构造稳定 Key，使“资源身份”成为公共 API 的一部分，而不是依赖内部实现细节。

推荐最佳实践（局部异步 ModuleImpl）：

```ts
function AsyncLocalWidget({ userId }: { userId: string }) {
  const id = useId()

  const runtime = useModule(AsyncImpl, {
    suspend: true,
    key: `AsyncLocalWidget:${id}`,  // 组件级稳定 Key
    deps: [userId],                 // 业务依赖参与重建
  })

  const state = useSelector(runtime, s => s.state)
  const dispatch = useDispatch(runtime)

  // ...
}
```

> 约定：
> - **默认优先使用同步模式**：只要 ModuleImpl 构建不依赖异步步骤，优先保持 `useModule(Impl)` 的同步语义，获得更简单的调试体验；
> - **明确异步意图**：当确实需要异步 Layer 时，通过 `suspend: true + key` 明确声明，调用方需要负责组织好稳定 Key；
> - `useLocalModule` 仍然保留为底层 API，针对“模块级 Resource Cache”场景使用，`useModule(Impl)` 则是推荐的 UI 层入口。
