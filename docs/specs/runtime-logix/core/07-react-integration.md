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

这三者构成连接 React 与 Logix 领域模块的基础桥梁。

### 1.1 ModuleImpl: 推荐的模块实现单元

为了简化 React 侧的模块消费，Logix v3 引入了 `ModuleImpl` 概念：将 Module 蓝图、初始状态、Logic 列表和依赖环境打包为一个“实现单元”。

**定义 ModuleImpl**:

```typescript
// 1. 定义 Module (Shape + Logic Factory)
export const RegionModule = Logix.Module("RegionModule", { state, actions })
export const RegionLogic = RegionModule.logic<RegionService>(/* ... */)

// 2. 构造 Impl (绑定 Initial + Logic)
export const RegionImpl = RegionModule.make({
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

- `runtime={ManagedRuntime}`：复用外部构造的 Runtime（推荐形态，通常来自 `LogixRuntime.make(rootImpl, { layer, onError })`）；
- `layer={Layer}`：在父 Runtime 基础上追加局部 Layer，所有 `useModule`/`useSelector` 将自动 `provide` 该 Layer 输出；

v3 分形 Runtime 模型下，推荐以某个 Root ModuleImpl + `LogixRuntime.make` 定义应用/页面/Feature 级 Runtime，再通过 `RuntimeProvider runtime={...}` 作为组合根，局部增强则通过 `layer` 叠加。

### 4.1 推荐模式：Root ModuleImpl + LogixRuntime (Fractal Runtime)

最佳实践是使用 Root ModuleImpl + `LogixRuntime.make` 定义应用/页面级 Runtime，并通过 `runtime` 属性传入。这是全应用或某个 Feature 的 **Composition Root**。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logix/react';
import { Logix, LogixRuntime } from '@logix/core';
import { Layer } from 'effect';

const RootModule = Logix.Module("Root", { state: RootState, actions: RootActions });
const RootImpl = RootModule.make({
  initial: { /* ... */ },
  imports: [/* ModuleImpls / Service Layers */],
  processes: [/* Coordinators / Links */]
});

const appRuntime = LogixRuntime.make(RootImpl, {
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
- `LogixRuntime.make` 会在内部使用 AppRuntime 机制合并 Layer、构建根 Scope 并统一 fork 这些进程；
- `RuntimeProvider` 负责在 React 应用生命周期内持有该 Runtime 的 Scope，当应用卸载时自动触发资源释放。

> React 端默认会注入 `ReactPlatformLayer`，将 Page Visibility、Tab Suspend/Resume 等信号映射到 `Logic.Platform`，模块逻辑可以通过 `yield* Logic.Platform` 订阅这些事件。

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
const GlobalModule = Logix.Module("Global", { state: GlobalState, actions: GlobalActions });
const GlobalImpl = GlobalModule.make({ initial: { /* ... */ }, logics: [GlobalLogic] });

const RootImpl = RootModule.make({
  initial: { /* ... */ },
  imports: [GlobalImpl],
  processes: [/* Coordinators / 长生命周期进程 */],
});

const appRuntime = LogixRuntime.make(RootImpl, {
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
