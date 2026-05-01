---
title: Field behaviors
description: Declare computed, source, and external field behaviors through `$.fields(...)` or domain DSLs.
---

Field behavior is declared in one of two places:

- core logic-local field declarations through `$.fields(...)`
- domain DSLs such as `Form.make(...)`

## Core field declarations

```ts
const Fields = Counter.logic("fields", ($) => {
  $.fields({
    total: $.fields.computed({
      deps: ["count"],
      get: (count) => Number(count ?? 0) + 1,
    }),
  })

  return Effect.void
})
```

The core field surface currently carries:

- `computed`
- `source`
- `external`

## Domain field behavior

Domain packages may project the same idea through their own DSLs.
For example, Form keeps validation and form-specific linkage in `Form.make(...)`.

## Historical note

Older materials may use the word `trait`.
In current public writing, read it as field behavior declaration.
