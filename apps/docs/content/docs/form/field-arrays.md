---
title: Field arrays
description: List identity, row-scoped rules, row handles, and row companion reads.
---

Lists need a stable identity policy. The default production route is `trackBy` when rows have durable ids.

## Declaration

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  item: Form.Rule.make({ required: "Item required" }),
  list: (rows) => (rows.length > 0 ? undefined : { $list: "Add an item" }),
})
```

## Mutations

```ts
await Effect.runPromise(form.fieldArray("items").append({ id: "r1", name: "" }))
await Effect.runPromise(form.fieldArray("items").byRowId("r1").update({ id: "r1", name: "Ada" }))
```

## Reads

Use row ids for row-scoped companion/error reads. Array index is a rendering position, not durable identity.
