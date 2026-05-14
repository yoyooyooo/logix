---
title: Selectors 与 support facts
description: 用同一条 React host read route 读取 values、metadata、errors 与 companion facts。
---

Form 读取使用 `useSelector(handle, selector)`。

```tsx
const form = useModule(InventoryForm)

const warehouseId = useSelector(form, fieldValue("items.0.warehouseId"))
const values = useSelector(form, fieldValues(["countryId", "items"]))
const meta = useSelector(form, rawFormMeta())
const error = useSelector(form, Form.Error.field("items.0.warehouseId"))
const companion = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowCompanion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

## Selector table

| 读取目标 | Selector |
| --- | --- |
| 单个 value | `fieldValue(path)` |
| 多个 values | `fieldValues(paths)` |
| form meta | `rawFormMeta()` |
| field explanation | `Form.Error.field(path)` |
| field companion | `Form.Companion.field(path)` |
| row companion | `Form.Companion.byRowId(listPath, rowId, fieldPath)` |

`Form.Error.field(path)` 是 explanation selector。它可以表示 error、pending、stale、cleanup 或当前没有 explanation。它不是第二套 validation truth。

## Exact typing

Companion declaration 可以从 `define(...)` 返回 carrier，让 companion selector result 保持精确类型：

```ts
export const InventoryForm = Form.make("InventoryForm", config, ($) => {
  const warehouse = $.field("items.warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower: (ctx) => ({
      availability: { kind: "interactive" as const },
      candidates: { items: [{ id: "w1", label: "Warehouse A" }] },
    }),
  })

  return [warehouse] as const
})
```

## 非公开路线

当前公开面不包含 public `Form.Path`、schema path mapping API、`useCompanion`、`useFieldValue`、returned-carrier selector route 或 row owner token。
