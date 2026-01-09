# 1. `Logix.Module`：领域模块定义

在代码层，一个领域模块统一由 `Logix.Module.make` 定义并返回 `ModuleDef`：

```ts
import { Schema } from 'effect';
import * as Logix from '@logixjs/core';

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
- 可选的 `immerReducers` / `reducers`：为部分 Action Tag 声明 **primary reducers**（主 reducer）：
  - 形态：`immerReducers: { [tag]: (draft, payload) => void }` 或 `reducers: { [tag]: (state, { _tag, payload }, sink?) => nextState }`；
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

对于需要 draft 风格写法的主 reducer，推荐直接在定义处使用 `immerReducers`：

```ts
export const CounterDef = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
  immerReducers: {
    inc: (draft) => {
      draft.count += 1;
    },
    set: (draft, payload) => {
      draft.count = payload;
    },
  },
});
```

- `immerReducers`：接受 `(draft, payload) => void` 形式的 mutator，运行时会自动包装为不可变 reducer，并采集更精确的 patchPaths。
- 如果你想保持 `reducers` 字段（或在 Logic 中通过 `$.reducer` 注册），可以用 `Logix.Module.Reducer.mutate` / `mutateMap` 把 `(draft, payload)` 包装为 `(state, action) => nextState`。

- `CounterDef`（ModuleDef）本身同时是：
  - Module 定义（Intent 视角：领域资产）；
  - Logic 入口（`CounterDef.logic` 的宿主）；
  - Live 工厂（`CounterDef.live` 的宿主）。

并且带 `CounterDef.tag` 作为 Runtime Tag（Tag 本身可被 `yield*` 消费；而 `$.use(CounterDef)` 等价于 `$.use(CounterDef.tag)`）。

对应类型以 `@logixjs/core` 为准（公共出口：`packages/logix-core/src/index.ts`；Module 相关实现与类型在 `packages/logix-core/src/Module.ts` 与 `packages/logix-core/src/internal/module.ts`）。

---
