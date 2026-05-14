---
title: Companion
description: 为字段派生同步 local support facts。
---

`field(path).companion(...)` 派生 availability、candidates 等 local soft facts。

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

- `lower` 必须同步且本地。
- 它不能返回 Effect、Promise，也不能做 IO。
- 它可以返回 `availability`、`candidates` 等 support facts。
- 它不能写 `errors`、`$form`、`verdict`、`submitAttempt`、`reasonSlotId` 等 final truth keys。

## 读取 companion facts

```tsx
const support = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

## Boundary

remote facts 用 source。final validation truth 用 rules/root/list/submit。Companion 只用于 local UX support facts。
