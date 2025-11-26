# React 集成指南 (React Integration Guide)

> **Status**: Draft (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Adapter Layer

本文档描述了如何将 Logix 引擎与 React UI 框架无缝集成。核心目标是实现 **UI is Dumb** 的设计理念，让 React 专注于渲染，而将所有状态管理和业务逻辑委托给 Logix。

## 1. 核心 API: `useStore`

`useStore` 是连接 React 组件与 Logix Store 的唯一桥梁。它提供了状态订阅、Action 派发和 Scope 管理能力。

```typescript
import { useStore } from '@logix/react';
import { myStore } from './store';

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

## 4. 生命周期绑定 (Lifecycle Binding)

在 React 适配层，`useStore` 与 `useLocalStore` 体现了两种不同的“归属关系”：

### 4.1 全局 Store (Global Store) + `useStore`

对于应用级状态，通常在模块顶层创建 Store 并在整个应用生命周期内复用：

```ts
// store.ts
export const globalStore = Store.make(...);

// component.tsx
function Toolbar() {
  const count = useStore(globalStore, s => s.count);
  const { dispatch } = useStore(globalStore);

  return <button onClick={() => dispatch({ _tag: "increment" })}>{count}</button>;
}
```

此时组件只是“消费”这棵 Store，**不负责创建或销毁**，Store 的生命周期由上层 Runtime 决定。

### 4.2 局部 Store (Local Store) + `useLocalStore`

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

## 5. 依赖注入 (Dependency Injection)

Logix 提供了 `RuntimeProvider` 来注入 Effect Runtime 和 Services。

```tsx
// App.tsx
import { RuntimeProvider } from '@logix/react';
import { runtimeLayer } from './runtime';

function App() {
  return (
    <RuntimeProvider layer={runtimeLayer}>
      <UserPage />
    </RuntimeProvider>
  );
}
```
