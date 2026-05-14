---
title: Field arrays
description: 通过 Form handle 修改列表字段，同时保持 row identity。
---

在 `define(...)` 中声明 list identity：

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  item: Form.Rule.make({ required: true }),
  list: Form.Rule.make((items) => (items.length > 0 ? undefined : "items.required")),
})
```

通过 `fieldArray(path)` 写入：

```ts
yield* form.fieldArray("items").append({ id: "r1", warehouseId: "" })
yield* form.fieldArray("items").move(0, 2)
yield* form.fieldArray("items").byRowId("r1").update({ id: "r1", warehouseId: "WH-001" })
```

通过 `useSelector(...)` 读取 values 与 row-scoped companion facts：

```tsx
const items = useSelector(form, fieldValue("items"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Row identity 不是公开 row token family。当操作必须跨 reorder/remove 保持稳定时使用 `byRowId(...)`。
