---
title: MatchBuilder
description: 一个轻量的 fluent match DSL，用于值匹配与 `_tag` 联合类型匹配。
---

MatchBuilder 提供一个小巧的 fluent API，用于做值匹配（或基于 `_tag` 的联合类型匹配），避免深层的 `if/else` 链。

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

`exhaustive()` 会返回一个 Effect：如果没有任何分支匹配，会直接 die（便于尽早暴露“漏处理分支”）。

## 延伸阅读

- [/api-reference](/api-reference)
