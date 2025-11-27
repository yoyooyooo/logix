# React 集成指南 (React Integration Guide)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Adapter Layer

本文档描述了如何将 Logix 引擎与 React UI 框架无缝集成。核心目标是实现 **UI is Dumb** 的设计理念，让 React 专注于渲染，而将所有状态管理和业务逻辑委托给 Logix。

## 1. 核心 API: `useStore`

`useStore` 是连接 React 组件与 Logix Store 的唯一桥梁。它提供了状态订阅、Action 派发和 Scope 管理能力。

```typescript
import { useStore } from '@logix/react';
import { myStore } from './store'; // 可以是 Store.Tag（全局）或 Store.Runtime（局部）

function MyComponent() {
  // 1. 订阅状态 (Selector Pattern)
  const count = useStore(myStore, s => s.count);
  
  // 2. 获取 Dispatcher
  const { dispatch } = useStore(myStore);

  return (
    <button onClick={() => dispatch({ _tag: 'increment' })}>
      Count: {count}
    </button>
  );
}
```

## 2. 状态订阅 (State Subscription)

### 2.1 细粒度订阅 (Fine-Grained Subscription)

为了优化性能，`useStore` 强制要求使用 Selector。Logix 内部利用 `state$` 流的 `distinctUntilChanged` 特性，确保只有当 Selector 返回值发生**值相等性 (Value Equality)** 变化时，才触发 React 更新。

```typescript
// ✅ Good: 只订阅需要的字段
const name = useStore(store, s => s.user.name);
```

## 3. 意图派发 (Intent Dispatch)

### 3.1 `dispatch` 函数

`useStore` 返回的 `dispatch` 函数用于向 Store 发送 Action。它是类型安全的，会自动推导 `ActionSchema` 中定义的 Action 类型。

```typescript
const { dispatch } = useStore(myStore);
dispatch({ _tag: 'updateUser', payload: { name: 'Alice' } });
```

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

- `CRMApp` 内部会通过 `Logix.app` 聚合 `infra`（Http / Router / Config 等）与 `modules`（全局 Store），并在根 Scope 上启动 `processes` 中定义的长生命周期进程（例如 Coordinator）；  
- `RuntimeProvider` 负责在 React 应用生命周期内持有该 Runtime 的 Scope，当应用卸载时自动触发资源释放。

### 4.2 兼容模式：Layer 注入 (Layer Injection)

对于局部环境增强（如 Page 层注入局部 Store），或者简单的测试场景，可以使用 `layer` 属性：

```tsx
// src/pages/OrderPage.tsx
import { RuntimeProvider } from '@logix/react';
import { Layer } from 'effect';

function OrderPage() {
  const pageStore = useLocalStore(makeOrderPageStore);
  const PageLayer = Layer.succeed(OrderPageStoreTag, pageStore);
  
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
> - `RuntimeProvider layer={...}` 用于在某个子树下增强环境（例如注入页面级 Store 或局部服务），内部会在已有 Runtime 环境之上合并传入的 Layer。

## 5. 生命周期绑定 (Lifecycle Binding)

在 React 适配层，`useStore` 与 `useLocalStore` 体现了两种不同的“归属关系”：

### 5.1 全局 Store (Global Store)

在 `Logix.app` 的 `modules` 中注册的 Store 是全局的：

```ts
// app.ts
export const CRMApp = Logix.app({
  infra: AppInfraLayer,
  modules: [
    Logix.provide(GlobalStoreTag, GlobalStore),
    // ...
  ],
  processes: [/* Coordinators / 长生命周期进程 */],
});
```

子组件通过 `useStore(GlobalStoreTag, selector)` 消费，不需要管理其生命周期；Store 的 Scope 绑定到 AppRuntime，由最外层的 `RuntimeProvider app={CRMApp}` 管理。

### 5.2 局部 Store (Local Store)

对于页面级或组件级状态，使用 `useLocalStore` 在当前组件下创建并持有 Store：

```ts
import { useLocalStore } from '@logix/react';

function UserForm({ userId }: { userId: string }) {
  // 每次 userId 变化时，都会重新创建一个新的 Store 实例
  const store = useLocalStore(() => makeUserFormStore(userId), [userId]);
  const values = useStore(store, s => s.values);
  const { dispatch } = useStore(store);

  // ...
}
```

这里 `UserForm` 组件是这棵 Store 的“宿主”，Store 的 Scope 与组件生命周期绑定：  
组件卸载时，对应 Store Scope 会被关闭，所有挂在其上的 `forkScoped` 长逻辑会被安全中断。

> 约定：  
> - 组件内读取 State 与派发 Action 推荐统一通过 `useStore(store)`；  
> - 组件外的业务逻辑 / Pattern 可以直接使用 `store.dispatch` / `store.getState`。
