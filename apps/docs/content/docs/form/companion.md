---
title: Companion
description: Derive local support facts for a field with `field(path).companion(...)`.
---

`field(path).companion(...)` derives local support facts for a field.
Use it for availability, candidates, disable reasons, and local display support.

Companion is a soft fact.
It does not own final validity, submit blocking, remote requests, row identity, or report truth.

## Default route

```ts
const warehouseCarrier = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    const taken = new Set(ctx.deps["items.warehouseId"])

    return {
      availability: {
        kind: ctx.deps.countryId ? "interactive" : "hidden",
      },
      candidates: {
        items: Warehouses.filter((id) => id === ctx.value || !taken.has(id)),
        keepCurrent: true,
      },
    }
  },
})
```

`lower(ctx)` must be synchronous, pure, and lightweight.
It can read the current field value, declared deps, and an existing source snapshot.

## Read companion bundles

```tsx
const support = useSelector(
  form,
  Form.Companion.field("items.warehouseId"),
)
```

For list rows, use row-owned reads:

```tsx
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Reads still go through `useSelector(...)`.
Form does not add a `useCompanion(...)` hook and does not expose the internal landing path.

## Returned carriers and typing

When companion selectors need exact result types, return the companion declaration carrier from the `Form.make(...)` callback.

```ts
export const InventoryForm = Form.make("InventoryForm", config, ($) => {
  const warehouseCarrier = $.field("items.warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [{ id: "w1", label: "Warehouse A" }] },
      }
    },
  })

  return [warehouseCarrier] as const
})
```

Imperative `void` callback authoring remains valid, but it does not guarantee exact companion selector result typing.
In that route, selector results honestly degrade to `unknown`.

## Split from rules

Companion supports interaction.
Rules and submit own final verdicts.

```ts
$.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower: deriveWarehouseSupport,
})

$.list("items", {
  list: Form.Rule.make({
    validate: ensureWarehousesAreUnique,
  }),
})
```

Candidates may hide warehouses already used by other rows.
The actual “no duplicates” verdict should still live in a list rule.

## Split from source

Source owns remote facts.
Companion owns local shaping.

```ts
$.field("profileResource").source({
  resource: ProfileResource,
  deps: ["profileId"],
  key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
})

$.field("warehouseId").companion({
  deps: ["profileResource", "countryId"],
  lower(ctx) {
    return shapeWarehouseSupport(ctx.source, ctx.deps.countryId)
  },
})
```

Do not perform remote IO in `lower(ctx)`.
For async search, remote filtering, or large candidate sets, use a Query resource or application logic.

## Boundary

Companion does not:

- start remote requests
- decide whether submit passes
- write validation errors
- create a second read route
- replace row identity

## See also

- [Sources](/docs/form/sources)
- [Selectors and support facts](/docs/form/selectors)
- [Rules](/docs/form/rules)
- [Field arrays](/docs/form/field-arrays)
