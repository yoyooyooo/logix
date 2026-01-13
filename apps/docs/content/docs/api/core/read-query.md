---
title: ReadQuery
description: Stable, diagnosable selectors used for fine-grained reads, subscriptions, and declarative Links.
---

ReadQuery is a **stable selector contract**:

- you give it a stable `selectorId`,
- declare what fields it reads (`reads`),
- and provide a `select` function.

With this structure, Logix can:

- build fine-grained subscriptions,
- avoid unnecessary re-renders,
- use selectors as a building block for declarative cross-module Links.

## `ReadQuery.make(...)`

```ts
import * as Logix from '@logixjs/core'

const CountRead = Logix.ReadQuery.make({
  selectorId: 'rq_counter_count',
  reads: ['count'],
  select: (s: { readonly count: number }) => s.count,
  equalsKind: 'objectIs',
})
```

## Where it’s used

- `useSelector(handle, selector)` can compile selectors into ReadQuery to enable more optimized subscription paths when eligible.
- `Link.makeDeclarative` requires static ReadQueries (so the Runtime can build a controlled IR).

## See also

- [API: Link](./link)
- [API: useSelector](../react/use-selector)
- [/api-reference](/api-reference)
