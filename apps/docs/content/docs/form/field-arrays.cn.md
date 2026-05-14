---
title: Field arrays
description: list identity、row-scoped rules、row handles 与 row companion reads。
---

列表需要稳定 identity policy。当 row 有 durable id 时，生产默认路线是 `trackBy`。

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

row-scoped companion/error reads 使用 row ids。array index 是渲染位置，不是 durable identity。
