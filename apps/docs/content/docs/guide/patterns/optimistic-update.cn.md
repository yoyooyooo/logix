---
title: 乐观更新
description: 把 optimistic state 和 rollback authority 放在 runtime logic 中。
---

乐观更新需要 rollback 路径。runtime 应拥有旧值、pending request 和 settlement 规则。

## State

```ts
state: Schema.Struct({
  items: Schema.Array(Item),
  pendingIds: Schema.Array(Schema.String),
  lastError: Schema.NullOr(Schema.String),
})
```

只存 logic 需要的 rollback 数据。能用小 patch 表达时，不要复制大型对象图。

## Flow

```ts
yield* $.onAction("toggle").runLatest((action) =>
  Effect.gen(function* () {
    const before = yield* $.state.read
    yield* $.state.mutate(applyOptimistic(action.payload))

    const api = yield* $.use(Api)
    yield* api.toggle(action.payload).pipe(
      Effect.catchAll((error) =>
        $.state.update(() => ({ ...before, lastError: String(error) })),
      ),
    )
  }),
)
```

每条 optimistic lane 只保留一条 settlement 规则。不要让组件判断更新是否成功。
