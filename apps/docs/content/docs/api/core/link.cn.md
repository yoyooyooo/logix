---
title: Link
description: 将跨模块协作封装为 Process（blackbox 或 declarative），作为“模块外胶水逻辑”的统一形态。
---

**Link** 用于表达“写在模块外部”的长期跨模块协作逻辑。

从心智上看，Link 是一种 Process，它会：

- 从一个或多个模块读取信号/状态，
- 向其它模块派发 action（或执行编排 Effect）。

## 两种形态

### 1) `Link.make(...)`（blackbox，灵活）

当你的协作逻辑需要任意 Stream/Effect 编排时，用这个形态最直接：

```ts
const SyncUserFromAuth = Logix.Link.make({ modules: [AuthDef, UserDef] as const }, ($) =>
  Effect.gen(function* () {
    const auth = $[AuthDef.id]
    const user = $[UserDef.id]
    // ... 监听 auth，再驱动 user ...
    return yield* Effect.void
  }),
)
```

该形态足够灵活，但对“任意 Effect 的跨模块同 tick 强一致收敛”不做保证。

### 2) `Link.makeDeclarative(...)`（受控 IR，强一致）

如果你的协作可以被描述为 **ReadQuery → dispatch** 的边列表，推荐用 declarative builder。它能让 Runtime 在同一个 tick 内收敛跨模块更新，并提供更好的诊断能力。

你通常会先定义稳定的 ReadQuery，再返回边列表：

```ts
const ValueRead = Logix.ReadQuery.make({
  selectorId: 'rq_example_value',
  reads: ['value'],
  select: (s: { readonly value: number }) => s.value,
  equalsKind: 'objectIs',
})

const DeclarativeLink = Logix.Link.makeDeclarative({ id: 'example', modules: [Source, Target] as const }, ($) => [
  { from: $[Source.id].read(ValueRead), to: $[Target.id].dispatch('setMirror') },
])
```

## 延伸阅读

- [Guide: 跨模块协作](../../guide/learn/cross-module-communication)
- [API: ReadQuery](./read-query)
- [/api-reference](/api-reference)
