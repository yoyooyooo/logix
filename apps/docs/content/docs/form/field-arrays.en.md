---
title: Field arrays
description: useFieldArray, row identity, rows error tree, and cross-row validation.
---

## 1) Declare an array field (list rule)

In `rules`, explicitly declare an array field as a list, and provide a stable identity via `trackBy` (recommended):

```ts
const Values = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
})

const $ = Form.from(Values)
const z = $.rules

const ItemsForm = Form.make("ItemsForm", {
  values: Values,
  initialValues: { items: [] },
  rules: z(
    z.list("items", {
      identity: { mode: "trackBy", trackBy: "id" },
      item: {
        deps: ["name"],
        validateOn: ["onBlur"],
        validate: (row: any) => (String(row?.name ?? "").trim() ? undefined : { name: "Required" }),
      },
      list: {
        // Cross-row validation: scan rows once and write back { rows: [...] }
        deps: ["name"],
        validateOn: ["onChange"],
        validate: (rows: ReadonlyArray<any>) => {
          const by = new Map<string, Array<number>>()
          for (let i = 0; i < rows.length; i++) {
            const v = String(rows[i]?.name ?? "").trim()
            if (!v) continue
            const bucket = by.get(v) ?? []
            bucket.push(i)
            by.set(v, bucket)
          }
          const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
          for (const indices of by.values()) {
            if (indices.length <= 1) continue
            for (const i of indices) rowErrors[i] = { name: "Duplicate" }
          }
          return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
        },
      },
    }),
  ),
})
```

## 1.1) Relationship between `useFieldArray` and list rules

- `useFieldArray(form, listPath)` handles **insert/remove/reorder values** (`append/remove/swap/move`). It does not require you to declare a list rule.
- The list declaration (`z.list(listPath, ...)` in `rules`) expresses the **domain semantics** of “this is a dynamic list”:
  - Form will not “guess” dynamic-list semantics automatically; only list rules enable `trackBy` / `item.check` / `list.check`.
  - `identity.trackBy`: generate stable row ids from a business field (recommended). If missing, it degrades to runtime rowId, then to index.
  - `item`: item-level validation (only the current row)
  - `list`: list-level / cross-row validation (one scan, multi-row write-back to `$list/rows[]`)

## 2) Operate arrays in React: `useFieldArray`

```tsx
import { useFieldArray } from "@logix/form/react"

const { fields, append, remove, swap, move } = useFieldArray(form, "items")
```

- `fields[index].id` is used as React `key` (prefer `trackBy`; otherwise runtime rowId; then index).
- `append/remove/swap/move` keeps values/errors/ui arrays aligned, avoiding drift.

## 3) Error tree locations

- Field error inside a row: `errors.items.rows.0.name`
- Row-level error: `errors.items.rows.0.$item`
- List-level error: `errors.items.$list`

You usually don’t need to hand-build paths: `useField(form, "items.0.name")` reads the correct error location automatically.
