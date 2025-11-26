# 集成指南 (Integration Guide)

> **Status**: Draft (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Integration Layer

本文档提供了将 Logix 集成到现有项目中的详细步骤和策略。

## 1. 安装 (Installation)

```bash
npm install @logix/core @logix/react effect
```

## 2. 基础设置 (Basic Setup)

### 2.1 配置 Runtime Provider

在应用的根组件中包裹 `RuntimeProvider`。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logix/react';
import { Layer } from 'effect';

// 定义全局 Runtime Layer (可选，用于注入全局服务)
const AppRuntime = Layer.empty;

export function App() {
  return (
    <RuntimeProvider layer={AppRuntime}>
      <Router />
    </RuntimeProvider>
  );
}
```

### 2.2 创建第一个 Store

```typescript
// src/features/counter/store.ts
import { Store, Flow, Logic } from '@logix/core';
import { Schema, Effect } from 'effect';

const StateLive = Store.State.make(Schema.Struct({ count: Schema.Number }), { count: 0 });
const ActionLive = Store.Actions.make(Schema.Union(Schema.Struct({ _tag: 'inc' })));

const LogicLive = Logic.make<CounterShape>(({ flow, state }) => 
  Effect.gen(function*(_) {
    const inc$ = flow.fromAction(a => a._tag === 'inc');
    yield* inc$.pipe(
      flow.run(state.mutate(draft => { draft.count += 1; }))
    );
  })
);

export const counterStore = Store.make(StateLive, ActionLive, LogicLive);
```

### 2.3 在组件中使用

```tsx
// src/features/counter/Counter.tsx
import { useStore } from '@logix/react';
import { counterStore } from './store';

export function Counter() {
  const count = useStore(counterStore, s => s.count);
  const { dispatch } = useStore(counterStore);
  
  return <button onClick={() => dispatch({ _tag: 'inc' })}>{count}</button>;
}
```

## 3. 迁移策略 (Migration Strategy)

### 3.1 从 Redux 迁移

Logix 的设计深受 Redux 启发，迁移路径相对平滑。

1.  **State**: 将 Redux State 转换为 `Store.State.make`。
2.  **Actions**: 将 Action Types 转换为 `Store.Actions.make`。
3.  **Reducers**: 将 Reducer 逻辑拆分为独立的 Flow。
4.  **Thunks/Sagas**: 使用 `Effect` 重写异步逻辑，放入 `Flow.run` 中。

### 3.2 从 Zustand 迁移

1.  **State**: 显式定义 Schema。
2.  **Actions**: 将 `set` 函数调用转换为 Action Dispatch。
3.  **Logic**: 将 Store 中的方法提取为 Flow。

## 4. 与现有库集成

### 4.1 React Query

Logix 可以与 React Query 共存。建议将 React Query 作为 Server State 管理器，而 Logix 负责 Client State 和复杂交互逻辑。

*   **模式**: 在组件中使用 `useQuery` 获取数据，通过 `useEffect` 将数据同步到 Logix Store (如果需要 Logix 处理联动)。
*   **未来**: Logix 计划推出 `@logix/query` 插件，直接在 Logic 层集成数据获取能力。

### 4.2 React Hook Form

对于简单表单，React Hook Form 足够好用。对于复杂联动表单，建议使用 `@logix/form`。

*   **集成**: 可以通过 `useEffect` 监听 React Hook Form 的 `watch`，将变更同步到 Logix Store。

## 5. 常见陷阱 (Pitfalls)

1.  **过度设计**: 不要为每一个简单的 `useState` 都创建一个 Logix Store。Logix 适用于有复杂交互逻辑或跨组件状态共享的场景。
2.  **Schema 滥用**: 尽量保持 Schema 扁平。深层嵌套的 Schema 会导致 Selector 编写困难且性能下降。
3.  **忽视 Effect**: 不要试图绕过 Effect 直接操作 DOM 或调用 API。这会破坏 Logix 的可测试性和可观测性。
