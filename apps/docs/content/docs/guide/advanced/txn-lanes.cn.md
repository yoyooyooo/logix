---
title: Transaction lanes
description: 不改变公开 authoring 的 urgent / non-urgent runtime work。
---

Transaction lanes 是 state work 的 runtime scheduling 控制。它不新增第二套 state 模型。

## 默认路线

多数应用代码使用普通 dispatch 和 logic write。runtime 决定如何 batch、commit 和 notify。

## Low-priority work

当某项工作不应阻塞 urgent interaction 时，使用 low-priority dispatch 或 runtime policy。

```ts
yield* runtime.dispatchLowPriority({ _tag: "refresh", payload: undefined })
```

## Policy boundary

lane policy 属于 runtime/program 配置和 advanced dispatch paths。不要把它泄露进 reducer，变成条件调度逻辑。
