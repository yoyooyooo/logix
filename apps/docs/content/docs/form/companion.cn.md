---
title: Companion
description: 用 `field(path).companion(...)` 为字段派生本地辅助事实。
---

`field(path).companion(...)` 为字段同步派生本地辅助事实。
它适合表达 availability、候选项、禁用原因和本地显示支持。

Companion 是 soft fact。
它不拥有最终有效性、submit blocking、远端请求、row identity 或 report truth。

## 默认路线

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

`lower(ctx)` 必须同步、纯计算、轻量。
它可以读取当前字段值、声明的 deps 和已有 source snapshot。

## 读 companion bundle

```tsx
const support = useSelector(
  form,
  Form.Companion.field("items.warehouseId"),
)
```

列表行场景用 row-owned 读取：

```tsx
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

读取仍然走 `useSelector(...)`。
Form 不新增 `useCompanion(...)` hook，也不暴露 internal landing path。

## Returned carrier 与类型

如果希望 companion selector 能推导出精确返回类型，把 companion declaration 的返回 carrier 从 `Form.make(...)` callback 返回。

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

imperative `void` callback 写法仍然合法，但它不能保证 companion selector result 的精确类型。
在这条路线下，selector 结果会诚实降级为 `unknown`。

## 与 rule 的分工

Companion 用来辅助交互。
最终判断继续留给 rule 和 submit。

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

候选项可以排除已经被其他行使用的仓库。
真正的“不能重复”仍应由 list rule 判定。

## 与 source 的分工

source 负责远端事实。
companion 负责本地整形。

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

不要在 `lower(ctx)` 里做远端 IO。
需要异步搜索、远端过滤或大候选集时，把它建模为 Query resource 或应用逻辑。

## 边界

Companion 不负责：

- 发起远端请求
- 决定 submit 是否通过
- 写入 validation error
- 创建第二条读取路线
- 替代 row identity

## 延伸阅读

- [Sources](/cn/docs/form/sources)
- [Selectors and support facts](/cn/docs/form/selectors)
- [Rules](/cn/docs/form/rules)
- [Field arrays](/cn/docs/form/field-arrays)
