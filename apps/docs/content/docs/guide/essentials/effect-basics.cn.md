---
title: Effect basics
description: 读写 Logix logic 所需的最小 Effect 心智模型。
---

大多数 Logix 业务逻辑都写在 `Effect.gen(...)` 里。

日常使用时，先记住 3 件事：

- `Effect` 描述的是“尚未执行的工作”
- `yield*` 表示流程里的下一步
- 程序何时执行，由 runtime 或 `$` 决定

## 基本形状

```ts
Effect.Effect<A, E, R>
```

- `A`：成功值
- `E`：类型化错误
- `R`：依赖环境

## 常见写法

```ts
const fx = Effect.gen(function* () {
  const user = yield* UserApi.getUser("id-123")
  yield* Effect.log(`Loaded user ${user.name}`)
  return user
})
```

## 在 Logix logic 中

```ts
yield* $.onAction("submit").run(() =>
  Effect.gen(function* () {
    const api = yield* $.use(UserApi)
    const result = yield* api.submit()

    yield* $.state.mutate((draft) => {
      draft.lastResult = result
    })
  }),
)
```

## 最小使用建议

- 把 `yield*` 理解成程序里的下一步
- 编排继续留在 `$`
- 只有在并发、重试、超时或自定义抽象真的重要时，再下钻到更底层的 Effect 细节

## 相关页面

- [Flows & Effects](./flows-and-effects)
- [Bound API ($)](../../api/core/bound-api)
