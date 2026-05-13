---
title: Describing modules
description: 通过一条 canonical route 定义模块、附加 logic，并装配 programs。
---

Logix 通过 3 个对象描述业务单元：

- `Module`
- `Logic`
- `Program`

## Module

`Module` 负责定义：

- state schema
- action schema
- logic 的挂载点

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})
```

## Logic

`Logic` 负责定义反应、watcher 和 declaration-time assets。

```ts
const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("increment", (state) => ({ ...state, count: state.count + 1 }))
  return Effect.void
})
```

## Program

`Program` 负责装配一个可执行的业务单元：

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## 角色

- `Module` 负责定义
- `Logic` 负责声明与反应
- `Program` 负责装配
- `Runtime` 负责执行

## 说明

- `Program.make(...)` 是 canonical 装配路线
- 低层实现对象不属于 canonical authoring path
- React host 消费继续留在 `useModule(...)` 与 `useSelector(...)`

## 相关页面

- [Modules & State](../essentials/modules-and-state)
- [Runtime](../../api/core/runtime)
