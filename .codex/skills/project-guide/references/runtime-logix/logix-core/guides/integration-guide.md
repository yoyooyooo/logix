# 集成指南 (Integration Guide)

> **Status**: Draft（Effect-Native）
> **Date**: 2025-11-24
> **Layer**: Integration Layer

本文档提供了将 Logix 集成到现有项目中的详细步骤和策略。

## 1. 安装 (Installation)

```bash
npm install @logixjs/core @logixjs/react effect
```

## 2. 基础设置 (Basic Setup)

### 2.1 配置 Runtime Provider

在应用的根组件中包裹 `RuntimeProvider`，并使用 Root `Module`（或显式的 `ModuleImpl`）+ `Logix.Runtime.make` 构造 Runtime。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logixjs/react';
import * as Logix from '@logixjs/core';
import { Layer } from 'effect';

const UserDef = Logix.Module.make("User", { state: UserState, actions: UserActions });
const UserModule = UserDef.implement({
  initial: { info: null },
  logics: [UserModuleLogic],
});

const appRuntime = Logix.Runtime.make(UserModule, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
});

export function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <Router />
    </RuntimeProvider>
  );
}
```

### 2.2 创建第一个 Module

```typescript
// src/features/counter/module.ts
import * as Logix from '@logixjs/core';
import { Schema, Effect } from 'effect';

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
});

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    const inc$ = $.flow.fromAction((a): a is { _tag: 'inc' } => a._tag === 'inc');
    yield* inc$.pipe(
      $.flow.run(
        $.state.mutate((draft) => {
          draft.count += 1;
        }),
      ),
    );
  }),
);

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

### 2.3 在组件中使用

```tsx
// src/features/counter/Counter.tsx
import { useModule, useSelector, useDispatch } from '@logixjs/react';
import { CounterDef } from './module';

export function Counter() {
  const runtime = useModule(CounterDef);
  const count = useSelector(runtime, (s) => s.count);
  const dispatch = useDispatch(runtime);

  return <button onClick={() => dispatch({ _tag: 'inc' })}>{count}</button>;
}
```

## 3. 迁移策略 (Migration Strategy)

### 3.1 从 Redux 迁移

Logix 的设计深受 Redux 启发，迁移路径相对平滑。

1.  **Schema**: 将 Redux State / Action 类型整理为显式的 `effect/Schema`；
2.  **Module**: 使用 `Logix.Module.make` 定义领域模块，将 Schema 挂到 `state / actions` 上；
3.  **Reducers & Thunks/Sagas**: 将 Reducer / 异步逻辑拆分为 `ModuleDef.logic(($)=>Effect.gen(...))` 中的 Fluent 链（`$.onState / $.onAction / $.on + .update/.mutate/.run*`），配合 `Effect`/`Flow` 表达并发语义。

### 3.2 从 Zustand 迁移

1.  **State**: 显式定义 Schema。
2.  **Actions**: 将 `set` 函数调用转换为 Action Dispatch。
3.  **Logic**: 将 Store 中的方法提取为 Flow。

## 4. 与现有库集成

### 4.1 React Query

Logix 可以与 React Query 共存。建议将 React Query 作为 Server State 管理器，而 Logix 负责 Client State 和复杂交互逻辑。

- **模式**: 在组件中使用 `useQuery` 获取数据，通过 `useEffect` 将数据同步到某个 Logix Module 状态 (如果需要 Logix 处理联动)。
- **未来**: Logix 计划推出 `@logixjs/query` 插件，直接在 Logic 层集成数据获取能力。

### 4.2 React Hook Form

对于简单表单，React Hook Form 足够好用。对于复杂联动表单，建议使用 `@logixjs/form`。

- **集成**: 可以通过 `useEffect` 监听 React Hook Form 的 `watch`，将变更同步到 Logix Module 状态。

## 5. 常见陷阱 (Pitfalls)

1.  **过度设计**: 不要为每一个简单的 `useState` 都创建一个 Logix Module。Logix 适用于有复杂交互逻辑或跨组件状态共享的场景。
2.  **Schema 滥用**: 尽量保持 Schema 扁平。深层嵌套的 Schema 会导致 Selector 编写困难且性能下降。
3.  **忽视 Effect**: 不要试图绕过 Effect 直接操作 DOM 或调用 API。这会破坏 Logix 的可测试性和可观测性。
