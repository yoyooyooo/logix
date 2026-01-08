---
title: 可中断 IO（取消与超时）
description: 让 switch 并发不仅“丢弃旧结果”，还能真正取消网络请求。
---

# 可中断 IO（取消与超时）

在 Logix 里，查询/资源加载最终都会走到 `ResourceSpec.load`（Effect）。当你使用 `StateTrait.source`（以及基于它的 `@logixjs/query`）时，默认并发是 `switch`：新的 key 会让旧的 in-flight fiber 被中断。

但“中断 fiber”并不等于“网络层真正取消”。想做到真正取消（例如 axios 请求被 abort），需要 `load` 主动使用 Effect 提供的 `AbortSignal`。

## 1) 你会遇到的两个问题

1. **竞态正确性**：用户快速输入时，旧请求完成得更晚，不能覆盖新请求的结果。
2. **资源浪费**：旧请求即使不会写回 UI，也不希望它继续占用网络与后端容量。

Logix 默认保证第 1 点（通过 `keyHash` gate）；第 2 点需要你把 `AbortSignal` 传给网络客户端。

## 2) 推荐写法：在 `ResourceSpec.load` 使用 `AbortSignal`

### 2.1 `fetch`（浏览器 / Node 18+）

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

export const UserSpec = Logix.Resource.make({
  id: "demo/user/get",
  keySchema: Schema.Struct({ id: Schema.String }),
  load: ({ id }) =>
    Effect.tryPromise({
      try: (signal) =>
        fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
      catch: (e) => e,
    }),
})
```

### 2.2 axios（v1+ 支持 `signal`）

```ts
import axios from "axios"
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

export const SearchSpec = Logix.Resource.make({
  id: "demo/user/search",
  keySchema: Schema.Struct({ q: Schema.String }),
  load: ({ q }) =>
    Effect.tryPromise({
      try: (signal) =>
        axios.get("/api/users", { params: { q }, signal }).then((r) => r.data),
      catch: (e) => e,
    }),
})
```

> 反例：`Effect.tryPromise(() => axios.get(...))` 不接收 `signal`，所以 fiber 中断时无法真正取消网络请求，只能做到“旧结果不写回”。

## 3) 和 `switch` 的关系（你能得到什么）

- **默认就正确**：`switch` + `keyHash` gate 保证旧结果不会覆盖新 key（即使请求没取消成功）。
- **可进一步省资源**：`load` 使用 `AbortSignal` 后，`switch` 中断旧 fiber 会触发 signal abort，从而真正取消网络请求（客户端/服务端都更省）。

## 4) 常用补充（可选）

- **超时**：对可能卡住的请求，建议在 `load` 的 Effect 上加超时（例如 `Effect.timeoutFail({ duration, onTimeout })`）。
- **重试**：对偶发失败请求，建议用 `Effect.retry({ times })` 在 `load` 外侧统一包一层（不要散落在每个调用点）。

## 下一步

- Query 入口与引擎注入：见 [查询（Query）](../learn/query)。
