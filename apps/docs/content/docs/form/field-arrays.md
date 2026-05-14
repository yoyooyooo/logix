---
title: Field arrays
description: Mutate list fields through the Form handle while preserving row identity.
---

Declare list identity in `define(...)`:

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  item: Form.Rule.make({ required: true }),
  list: Form.Rule.make((items) => (items.length > 0 ? undefined : "items.required")),
})
```

Write through `fieldArray(path)`:

```ts
yield* form.fieldArray("items").append({ id: "r1", warehouseId: "" })
yield* form.fieldArray("items").move(0, 2)
yield* form.fieldArray("items").byRowId("r1").update({ id: "r1", warehouseId: "WH-001" })
```

Read values and row-scoped companion facts through `useSelector(...)`:

```tsx
const items = useSelector(form, fieldValue("items"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Row identity is not a public row token family. Use `byRowId(...)` when the operation must survive reorder or removal.
