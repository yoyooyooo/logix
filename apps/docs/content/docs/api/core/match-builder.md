---
title: MatchBuilder
description: A small fluent match DSL for values and tagged unions.
---

MatchBuilder provides a small fluent API for matching values (or `_tag`-based tagged unions) without deeply nested `if/else` chains.

## `MatchBuilder.makeMatch(value)`

```ts
import * as Logix from '@logixjs/core'

const result = Logix.MatchBuilder.makeMatch(n)
  .with((x) => x < 0, () => 'negative')
  .with((x) => x === 0, () => 'zero')
  .otherwise(() => 'positive')
```

## `MatchBuilder.makeMatchTag(value)`

```ts
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

const program = Logix.MatchBuilder.makeMatchTag(action)
  .with('increment', () => Effect.void)
  .with('decrement', () => Effect.void)
  .exhaustive()
```

`exhaustive()` returns an Effect that dies if nothing matched.

## See also

- [/api-reference](/api-reference)
