---
title: Match builder
description: Bound API 中可用的 fluent matching helper。
---

`$.match(value)` 与 `$.matchTag(value)` 在 logic 内提供局部分支 helper。它们只是便利工具，不新增 runtime lane。

## Value matching

```ts
const result = $.match(input)
  .when((value) => value === "ready", () => "ok")
  .otherwise(() => "fallback")
```

## Tagged matching

```ts
const result = $.matchTag(action)
  .case("created", handleCreated)
  .case("deleted", handleDeleted)
  .otherwise(() => Effect.void)
```

## 边界

match builder 用于局部分支。持久 workflow routing 仍放在 actions、reducers 和 logic watchers。
