---
title: Companion
description: Derive synchronous local support facts for a field.
---

`field(path).companion(...)` derives local soft facts such as availability and candidates.

```ts
const warehouse = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: ctx.deps.countryId ? "interactive" : "hidden" },
      candidates: {
        items: computeWarehouseCandidates(ctx.deps, ctx.value),
        keepCurrent: true,
      },
    }
  },
})
```

## Rules

- `lower` must be synchronous and local.
- It must not return an Effect, Promise, or perform IO.
- It may return support facts such as `availability` and `candidates`.
- It must not write final truth keys such as `errors`, `$form`, `verdict`, `submitAttempt`, or `reasonSlotId`.

## Reading companion facts

```tsx
const support = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

## Boundary

Use source for remote facts. Use rules/root/list/submit for final validation truth. Companion is for local UX support facts only.
