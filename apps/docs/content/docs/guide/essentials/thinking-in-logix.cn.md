---
title: Thinking in Logix
description: 通过 intent、logic、program 和 runtime 理解 Logix。
---

Logix 可以先按 4 层来理解：

1. intent
2. logic
3. program
4. runtime

## Intent

Intent 描述允许发生什么。

它通常体现为：

- state schema
- action schema

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
})
```

## Logic

Logic 描述模块如何响应。

纯同步状态变换适合 reducers。
副作用与状态驱动反应适合 logic 和 effects。

## Program

Program 描述业务单元如何被装配。

## Runtime

Runtime 负责在宿主环境中执行装配好的 programs。

它提供：

- 生命周期 owner
- 执行环境
- runtime 作用域内服务

## 总结

Thinking in Logix 的核心可以压成：

- 用 schema 定义 intent
- 把反应留在 logic
- 把业务单元收进 program
- 让 Runtime 持有执行
