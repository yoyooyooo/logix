---
title: Lifecycle
description: 区分 startup readiness、runtime ownership 与 React projection。
---

Lifecycle 有三个不同区域：

| 区域 | Owner |
| --- | --- |
| startup readiness | `Module.logic(...)` declaration phase 中的 `$.readyAfter(...)` |
| runtime ownership/disposal | 调用 `Runtime.make(...)` 或 `Runtime.run(...)` 的边界 |
| React visibility | `RuntimeProvider` 与 `useModule(...)` |

## Readiness

```ts
const Logic = Module.logic("startup", ($) => {
  $.readyAfter(loadRequiredConfig, { id: "required-config" })

  return Effect.gen(function* () {
    // long-running run phase
  })
})
```

`readyAfter` 负责 gating readiness。返回的 run effect 不是 readiness work。

## React local lifetime

组件/路由持有的实例使用 `useModule(Program, options)`：

```tsx
const session = useModule(SessionProgram, {
  key: `session:${id}`,
  gcTime: 60_000,
})
```

`RuntimeProvider` 只让 runtime 可见。它不会自动 dispose shared runtime。
