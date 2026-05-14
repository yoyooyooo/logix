---
title: Companion
description: Synchronous local soft facts such as availability and candidate lists.
---

Companion facts are local, synchronous, and derived from form state/source receipts. They are not validators and not remote loaders.

## Declaration

```ts
const warehouse = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower: (ctx) => ({
    availability: { kind: ctx.deps.countryId ? "interactive" : "hidden" },
    candidates: { items: computeCandidates(ctx.deps, ctx.value), keepCurrent: true },
  }),
})

return [warehouse] as const
```

Returning the carrier preserves exact selector typing.

## Read

```tsx
const companion = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

## Boundary

`lower` must be synchronous. It must not return final truth keys such as errors, verdicts, submit attempts, or blocking reasons.
