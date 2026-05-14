---
title: Selectors and support facts
description: Read values, metadata, errors, and companion facts through the same React host read route.
---

Form reads use `useSelector(handle, selector)`.

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

| Read target | Selector |
| --- | --- |
| single value | `fieldValue(path)` |
| multiple values | `fieldValues(paths)` |
| form meta | `rawFormMeta()` |
| field explanation | `Form.Error.field(path)` |
| field companion | `Form.Companion.field(path)` |
| row companion | `Form.Companion.byRowId(listPath, rowId, fieldPath)` |

`Form.Error.field(path)` is an explanation selector. It may describe error, pending, stale, cleanup, or no current explanation. It is not a second validation truth.

## Exact typing

Companion declarations can return a carrier from `define(...)` so companion selector results remain precisely typed:

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

## Not public routes

No public `Form.Path`, schema path mapping API, `useCompanion`, `useFieldValue`, returned-carrier selector route, or row owner token is part of the current surface.
