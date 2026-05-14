---
title: Suspense and async ownership
description: 异步 readiness、局部 program instance 与 React fallback 边界。
---

异步工作有两条路线：阻塞实例获取的 readiness work，以及实例 ready 后更新 state 的 running work。

## Readiness gate

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

只有实例没有该结果就不成立时，才使用 readiness gate。

## Suspense acquisition

```tsx
const module = useModule(Program, {
  key: "preview",
  suspend: true,
  initTimeoutMs: 3000,
})
```

Suspense 控制局部实例初始化期间的 React fallback。它不改变 module 语义。

## Interaction loading

搜索、提交、后台刷新这类交互 loading 应放在 module 或领域 program 中。不要每次交互都 suspend 整个 route。
