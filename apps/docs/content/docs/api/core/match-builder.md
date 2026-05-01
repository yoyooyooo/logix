---
title: Match builder
description: Use a fluent match DSL for values and tagged unions inside logic.
---

The match builder provides a small fluent DSL for structured matching.

Two common routes are:

- `$.match(value)`
- `$.matchTag(value)`

## Usage

```ts
yield* $.matchTag(action)
  .with("increment", () => Effect.void)
  .with("decrement", () => Effect.void)
  .exhaustive()
```

## Notes

- use `matchTag` for tagged unions with `_tag`
- use `match` for generic value matching

## See also

- [Bound API ($)](./bound-api)
