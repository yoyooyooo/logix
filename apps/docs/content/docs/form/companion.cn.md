---
title: Companion
description: availability 与 candidate lists 这类同步 local soft facts。
---

Companion facts 是 local、synchronous，并由 form state/source receipts 派生。它不是 validator，也不是 remote loader。

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

返回 carrier 可以保留精确 selector typing。

## Read

```tsx
const companion = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

## 边界

`lower` 必须同步。它不能返回 errors、verdicts、submit attempts、blocking reasons 等 final truth keys。
