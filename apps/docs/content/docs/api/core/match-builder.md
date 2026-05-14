---
title: Match builder
description: Fluent matching helper available from the Bound API.
---

`$.match(value)` and `$.matchTag(value)` provide local fluent matching inside logic. They are convenience helpers; they do not add a new runtime lane.

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

## Boundary

Use match builders for local branching. Keep durable workflow routing in actions, reducers, and logic watchers.
