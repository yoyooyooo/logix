---
title: Match builder
description: 在 logic 中通过 fluent match DSL 处理值匹配和 tagged union 匹配。
---

match builder 提供一套轻量的 fluent DSL，用于结构化匹配。

常见入口有两条：

- `$.match(value)`
- `$.matchTag(value)`

## 用法

```ts
yield* $.matchTag(action)
  .with("increment", () => Effect.void)
  .with("decrement", () => Effect.void)
  .exhaustive()
```

## 说明

- 对带 `_tag` 的联合类型，使用 `matchTag`
- 对一般值匹配，使用 `match`

## 相关页面

- [Bound API ($)](./bound-api)
