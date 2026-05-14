---
title: Module handle extensions
description: 了解何时适合给 handle 增加自定义字段，以及何时 Action 才是更好的协议。
---

Module handle 是 React 中 `useModule(...)` 返回的值，也是 Logic import resolution 得到的值。它暴露读取、actions、dispatch 等标准能力；Form 这类领域包也可以在同一 Program/Runtime truth 上增加领域方法。

Handle extension 是高级 package authoring 主题。它不是 Actions、reducers、services 或 selectors 的替代品。

## 推荐公开路线

应用代码优先使用普通路线：

```ts
const handle = useModule(SomeProgram)
const value = useSelector(handle, someSelector)
await Effect.runPromise(handle.actions.save(payload))
```

如果某个领域包返回了更丰富的 handle，应把新增字段文档化为薄 convenience layer，并说明它仍然建立在同一 Program 和 Runtime truth 上。

## 什么时候可以扩展

只有同时满足下面条件时才适合：

- 该 module 是可复用 package 或 domain factory；
- 新增方法确实减少重复 call-site 代码；
- 方法委托到仍可观测的 actions、dispatch、services 或 selectors；
- extension 不拥有 state、cache、scheduler 或独立 lifecycle；
- extension 类型与创建 Program 的 factory 一起文档化。

## Actions vs commands

| Surface | 适用场景 |
| --- | --- |
| Action | public business intent、可回放 protocol、diagnostics、跨模块协作 |
| command/helper | 对既有 actions、reads 或 services 的小型 convenience wrapper |

如果用户需要知道“发生了什么”，把它建成 Action。如果用户只是需要更短的 call site，helper 才合适。

## 反模式

- 把业务写入藏进不 dispatch Action 的方法；
- 把可变 service instance 存进 state；
- 添加只能由 React owner 使用的方法；
- 在 handle 背后创建第二套 EventEmitter、cache 或 runtime；
- 把内部 extension hook 写成普通用户路线。

## 相关页面

- [Module](../../api/core/module)
- [Program](../../api/core/program)
- [React integration](../essentials/react-integration)
