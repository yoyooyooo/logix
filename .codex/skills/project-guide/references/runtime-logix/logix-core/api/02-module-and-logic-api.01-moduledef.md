# 1. `Logix.Module`：领域模块定义

在代码层，一个领域模块统一由 `Logix.Module.make` 定义并返回 `ModuleDef`：

```ts
import { Schema } from 'effect';
import * as Logix from '@logix/core';

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
});
```

语义：

- `id: string`：领域模块的全局 Id，用于 Universe/Galaxy 拓扑和平台识别；
- `state` / `actions`：Effect.Schema 形式的 State / Action 形状；
- 可选的 `reducers`：为部分 Action Tag 声明 **primary reducers**（主 reducer）：
  - 形态：`{ [tag]: (state, { _tag, payload }) => nextState }`；
  - 语义：**Action → State 的权威路径**（主状态变更），在 `dispatch` 时由 Runtime 同步调用；
  - 实现：直接落到 `ModuleRuntime` 内部的 `_tag -> (state, action) => state` 跳表，不经过 watcher / Stream / Fiber。

示例（包含 primary reducer）：

```ts
export const CounterDef = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
  reducers: {
    inc: (state, _action) => ({ ...state, count: state.count + 1 }),
    set: (state, action) => ({ ...state, count: action.payload }),
  },
});
```

对于需要 mutative 写法的主 reducer，可以使用运行时提供的 helper：

```ts
export const CounterDef = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft, _action) => {
      draft.count += 1;
    }),
    set: Logix.Module.Reducer.mutate((draft, action) => {
      draft.count = action.payload;
    }),
  },
});
```

- `Logix.Module.Reducer.mutate`：接受 `(draft, action) => void` 形式的 mutative 函数，内部基于 `mutative` 映射为不可变 `(state, action) => state`；
- 语义与 `$.state.mutate` 一致，只是多了 `action` 入参，适合在 primary reducer 中使用。

- `CounterDef`（ModuleDef）本身同时是：
  - Module 定义（Intent 视角：领域资产）；
  - Logic 入口（`CounterDef.logic` 的宿主）；
  - Live 工厂（`CounterDef.live` 的宿主）。

并且带 `CounterDef.tag` 作为 Runtime Tag（Tag 本身可被 `yield*` 消费；而 `$.use(CounterDef)` 等价于 `$.use(CounterDef.tag)`）。

对应类型以 `@logix/core` 为准（公共出口：`packages/logix-core/src/index.ts`；Module 相关实现与类型在 `packages/logix-core/src/Module.ts` 与 `packages/logix-core/src/internal/module.ts`）。

---
