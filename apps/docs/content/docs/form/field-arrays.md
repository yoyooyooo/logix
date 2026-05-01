---
title: Field arrays
description: Structural edits, row identity, and array validation on the Form handle.
---

## Runtime API

Array editing stays on the form handle:

```ts
const items = form.fieldArray("items")

yield* items.append({ sku: "", qty: 1 })
yield* items.prepend({ sku: "", qty: 1 })
yield* items.insert(2, { sku: "", qty: 1 })
yield* items.update(2, { sku: "A-01", qty: 3 })
yield* items.replace(nextItems)
yield* items.remove(1)
yield* items.swap(0, 1)
yield* items.move(4, 0)
yield* items.byRowId("row-17").remove()
```

## Read rows in React

```tsx
const rows = useSelector(form, (s) => s.items)

return rows.map((row, index) => (
  <input
    key={String(row.id)}
    value={String(row.name ?? "")}
    onChange={(e) =>
      void Effect.runPromise(form.field(`items.${index}.name`).set(e.target.value))
    }
  />
))
```

This example assumes the list uses a business-key identity such as `trackBy: "id"`.

Read values through `useSelector(...)`.
Write through `form.field(...)` and `form.fieldArray(...)`.

## Identity Model

Form keeps two edit axes:

- positional edits for immediate list operations
- identity edits through `byRowId(...)` when row ownership must survive reordering

`replace(nextItems)` is roster replacement.
It is the explicit signal that the current row roster has been rewritten.

## Choosing `identity.mode`

List identity answers one question:

- where does row continuity come from when the roster is edited or reordered?

Current source supports three modes:

| mode | identity source | when to use it | reorder continuity | guidance |
| --- | --- | --- | --- | --- |
| `trackBy` | a business field on each row, such as `id` | rows already have a stable domain id | strongest | default recommendation |
| `store` | a runtime-managed row id store | rows do not have a stable business id yet, but still need stable structural editing | stable within the current runtime instance | recommended fallback |
| `index` | the current row position | only for narrowly positional arrays where row continuity does not matter | weakest | avoid for reorder-heavy flows |

### `trackBy`

Use `trackBy` when the row already has a stable business key:

```ts
form.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
})
```

This keeps:

- render keys aligned with the same business identity
- `byRowId(...)` aligned with the same row identity
- reorder semantics easier to reason about

### `store`

Use `store` when rows are client-created and do not yet have a stable business key:

```ts
form.list("draftRows", {
  identity: { mode: "store" },
})
```

This keeps row ownership stable inside the current runtime instance without requiring a business id on the row itself.

### `index`

`index` is accepted by the source surface, but it is the weakest mode.
Use it only when the list is truly positional and you do not depend on stable row identity across reorder.

If you care about:

- `byRowId(...)`
- reorder-safe ownership
- stable render keys

prefer `trackBy` or `store`.

## Validation Model

Use field rules for row-local checks.
Use list-level rules when the verdict depends on the whole array, such as:

- duplicate SKU detection
- cross-row exclusivity
- minimum row count

All resulting failures still land in the same canonical error carrier.

## Route restore and performance

For larger lists, prefer keyed instances and stable identity:

```tsx
const form = useModule(InventoryForm, {
  key: `inventory:${warehouseId}`,
  gcTime: 60_000,
})
```

When the instance is restored within the `gcTime` window after a route change, row ownership, errors, cleanup receipts, and current values remain attached to the same runtime instance.

Keep performance predictable:

- subscribe only to the list slice you actually render
- keep using `byRowId(...)` after reorder or removal for identity-sensitive operations
- avoid `index` identity for large reorder-heavy lists

## See also

- [Instances](/docs/form/instances)
- [Performance](/docs/form/performance)
- [Selectors and support facts](/docs/form/selectors)
