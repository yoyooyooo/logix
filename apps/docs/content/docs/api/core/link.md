---
title: Link
description: Cross-module collaboration packaged as a Process (blackbox or declarative).
---

**Link** is Logix’s way to express long-running cross-module collaboration “outside modules”.

Conceptually, a Link is a Process that:

- reads signals/state from one or more modules, and
- dispatches actions into other modules (or runs orchestration effects).

## Two flavors

### 1) `Link.make(...)` (blackbox, flexible)

Use it when your collaboration logic needs arbitrary streams / effects.

```ts
const SyncUserFromAuth = Logix.Link.make({ modules: [AuthDef, UserDef] as const }, ($) =>
  Effect.gen(function* () {
    const auth = $[AuthDef.id]
    const user = $[UserDef.id]
    // ... watch auth, dispatch into user ...
    return yield* Effect.void
  }),
)
```

This flavor is flexible, but “same-tick strong consistency” is not guaranteed for arbitrary effects.

### 2) `Link.makeDeclarative(...)` (controlled IR, strong consistency)

If your collaboration can be described as **ReadQuery → dispatch** edges, prefer the declarative builder. It allows the Runtime to converge cross-module updates within the same tick and emit better diagnostics.

In practice, you define stable ReadQueries and return an edge list:

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

## See also

- [Guide: Cross-module communication](../../guide/learn/cross-module-communication)
- [API: ReadQuery](./read-query)
- [/api-reference](/api-reference)
