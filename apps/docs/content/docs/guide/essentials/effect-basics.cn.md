---
title: Effect basics
description: Logix 示例中会用到的 Effect 概念。
---

Logix 不把 Effect 包装成另一套心智。Logic 函数返回 `Effect`，service 通过 `Layer` 提供，失败在 runtime 边界处理前保持类型化。

## Effect value

```ts
const program = Effect.gen(function* () {
  const user = yield* UserService.get("u1")
  return user.name
})
```

`Effect<A, E, R>` 描述一段工作：返回 `A`，可能以 `E` 失败，需要环境 `R`。

## Service 和 layer

```ts
class Api extends Effect.Service<Api>()("Api", {
  effect: Effect.succeed({ save: (value: string) => Effect.succeed(value) }),
}) {}

const layer = Api.Default
```

在装配或 runtime 边界提供 layer。logic 通过 `$.use(Api)` 读取服务。

## 在 Logix logic 中

```ts
const logic = Module.logic("save", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("save").runLatest((action) =>
      Effect.gen(function* () {
        const api = yield* $.use(Api)
        yield* api.save(action.payload)
      }),
    )
  }),
)
```

Effect 组合留在 logic。组件只处理输入与渲染。
