# React 集成指南 (React Integration Guide)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Adapter Layer
> **Audience**: React 应用开发者与 Adapter 作者；不涉及引擎内部实现细节。

本文档描述了如何将 Logix 引擎与 React UI 框架无缝集成。核心目标是实现 **UI is Dumb** 的设计理念，让 React 专注于渲染，而将所有状态管理和业务逻辑委托给 Logix。

## 1. 核心 API: Store Hooks

React 适配层围绕三类 Hooks 暴露能力：

- `useModule(handle)`：获取对应的运行时实例（**Stable, 不订阅状态更新**）；
- `useModule(handle, selector, equalityFn?)`：**[推荐]** 快捷方式，直接订阅状态，支持自定义比较函数；
- `useSelector(runtime, selector, equalityFn?)`：基于运行时实例做细粒度订阅；
- `useDispatch(runtime)`：获取稳定的 `dispatch` 函数。

这三者构成连接 React 与 Logix 领域模块的基础桥梁。

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
> - `useSelector` 签名：`(runtime, selector, equalityFn?)`；
> - 默认 `equalityFn` 为 `Object.is` (Strict Equality)。
> - 必须通过 `useSyncExternalStore` 实现订阅（以避免并发渲染下的 tearing）；
> - 推荐提供 `useSelector` 形式的封装，而不是让业务代码直接使用 `useSyncExternalStore`。

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

Logix 通过 `RuntimeProvider` 组件在 React 树中注入 Effect 运行时环境。v3 推荐以 `Logix.app` 定义的应用蓝图作为全应用的组合根。

### 4.1 推荐模式：App 蓝图注入 (App Blueprint)

最佳实践是使用 `Logix.app` 定义的应用蓝图，并通过 `app` 属性传入。这是全应用的 **Composition Root**。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logix/react';
import { CRMApp } from './app'; // 由 Logix.app 定义

function App() {
  return (
    // 自动构建 AppRuntime，启动全局服务和 Coordinators
    <RuntimeProvider app={CRMApp}>
      <Router />
    </RuntimeProvider>
  );
}
```

在这一模式下：

- `CRMApp` 内部会通过 `Logix.app` 聚合 `infra`（Http / Router / Config 等）与 `modules`（全局 Module），并在根 Scope 上启动 `processes` 中定义的长生命周期进程（例如 Coordinator）；
- `RuntimeProvider` 负责在 React 应用生命周期内持有该 Runtime 的 Scope，当应用卸载时自动触发资源释放。

### 4.2 兼容模式：Layer 注入 (Layer Injection)

对于局部环境增强（如 Page 层注入局部 Module），或者简单的测试场景，可以使用 `layer` 属性：

```tsx
// src/pages/OrderPage.tsx
import { RuntimeProvider } from '@logix/react';
import { Layer } from 'effect';

function OrderPage() {
  const pageModule = useLocalModule(makeOrderPageModule);
  const PageLayer = Layer.succeed(OrderPageModuleTag, pageModule);

  return (
    // 将 PageLayer 合并到当前环境中
    <RuntimeProvider layer={PageLayer}>
      <SubComponent />
    </RuntimeProvider>
  );
}
```

> 说明
> - `RuntimeProvider app={...}` 用于提供全局 AppRuntime，是应用的单一组合根；
> - `RuntimeProvider layer={...}` 用于在某个子树下增强环境（例如注入页面级 Module 或局部服务），内部会在已有 Runtime 环境之上合并传入的 Layer。

## 5. 生命周期绑定 (Lifecycle Binding)

在 React 适配层，`useModule` 与 `useLocalModule` 体现了两种不同的“归属关系”：

### 5.1 全局 Module (Global Module)

在 `Logix.app` 的 `modules` 中注册的 Module 是全局的：

```ts
// app.ts
export const CRMApp = Logix.app({
  // 注入 React 平台能力 (onSuspend/onResume 等)
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
  modules: [
    Logix.provide(GlobalModuleTag, GlobalModuleRuntime),
    // ...
  ],
  processes: [/* Coordinators / 长生命周期进程 */],
});
```

子组件通过 `useModule(GlobalModuleTag)` 消费，不需要管理其生命周期；Module 的 Scope 绑定到 AppRuntime，由最外层的 `RuntimeProvider app={CRMApp}` 管理。

### 5.2 局部 Module (Local Module)

对于页面级或组件级状态，使用 `useLocalModule` 在当前组件下创建并持有 Module：

```ts
import { useLocalModule } from '@logix/react';

function UserForm({ userId }: { userId: string }) {
  // 每次 userId 变化时，都会重新创建一个新的 Module 实例
  const moduleRuntime = useLocalModule(() => makeUserFormModule(userId), [userId]);
  const values = useSelector(moduleRuntime, s => s.values);
  const dispatch = useDispatch(moduleRuntime);

  // ...
}
```

这里 `UserForm` 组件是这棵 Module 的“宿主”，Module 的 Scope 与组件生命周期绑定：
组件卸载时，对应 Module Scope 会被关闭，所有挂在其上的 `forkScoped` 长逻辑会被安全中断。

> 约定：
> - 组件内读取 State 与派发 Action 推荐统一通过 `useModule` / `useLocalModule` 获取 Runtime 后再操作；
> - 组件外的业务逻辑 / Pattern 可以直接使用 `module.dispatch` / `module.getState`。
