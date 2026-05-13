---
title: Selectors and support facts
description: 在不新增第二条读取路线的前提下，读取 Form state、companion bundle 和 field explanation。
---

Form 读取继续走 core React host route。

用 `useSelector(handle, selector)` 读取 values、helper descriptor、field explanation 和 companion bundle。Form 不把 `useForm*`、`useFieldValue` 或 `useCompanion` 加成 canonical route。

## 默认路线

```tsx
const form = useModule(InventoryForm)

const warehouseId = useSelector(form, fieldValue("items.0.warehouseId"))
const warehouseSupport = useSelector(
  form,
  Form.Companion.field("items.warehouseId"),
)
const rowWarehouseSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
const warehouseExplain = useSelector(
  form,
  Form.Error.field("items.0.warehouseId"),
)
```

这保留一条读取规则：

| 读取目标 | selector |
| --- | --- |
| field value | `fieldValue(path)` |
| raw form metadata | `rawFormMeta()` |
| field explanation | `Form.Error.field(path)` |
| field companion bundle | `Form.Companion.field(path)` |
| row companion bundle | `Form.Companion.byRowId(listPath, rowId, fieldPath)` |

## Companion 是 soft fact

`field(path).companion({ deps, lower })` 为同一个 field lane 派生本地 support facts。

```ts
const warehouseCarrier = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: "interactive" as const },
      candidates: { items: [{ id: "w1", label: "Warehouse A" }] },
    }
  },
})
```

Companion 可以整形 availability 和 candidates。
它不拥有最终有效性、submit blocking、remote IO、row identity 或 report truth。
完整 companion authoring 见 [Companion](/cn/docs/form/companion)。

最终 truth 继续写在 field、list、root 或 submit rule 里：

```ts
$.field("items.warehouseId").rule(/* final field truth */)
$.list("items", /* final cross-row truth */)
$.submit()
```

## Returned carrier 与精确类型

Returned carrier 是 type-only metadata route。
它让 `Form.Companion.field(...)` 与 `Form.Companion.byRowId(...)` 在不新增 runtime public metadata object 的前提下，推导出精确的 `lower` 返回结果。

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

imperative `void` callback 写法仍然是合法的 runtime authoring：

```ts
Form.make("InventoryForm", config, ($) => {
  $.field("items.warehouseId").companion({
    deps: ["countryId"],
    lower(ctx) {
      return { availability: { kind: "interactive" as const } }
    },
  })
})
```

这条路线当前不承诺 companion selector result 的精确类型。
当 metadata chain 不可用时，selector 应诚实降级为 `unknown`。

## Row 读写

通过 form handle 写 row-owned values：

```ts
yield* form.fieldArray("items").byRowId(rowId).update(nextRow)
```

通过同一个 host selector gate 读取 row-owned companion bundle：

```tsx
const rowWarehouseSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

这两条路线使用同一条 row owner law。
写侧留在 form handle，读侧留在 `useSelector`。
Form 不暴露 public row owner token。

如果 nested owner match 存在歧义，selector 应返回未命中，禁止任意选择一个 parent row。

## Field explanation

`Form.Error.field(path)` 是 field explanation selector。
它解释的内容不止 canonical `FormErrorLeaf`。

结果可能表示：

- 当前 error
- pending work
- stale work
- cleanup / active-exit state
- 当前没有 explanation

不要把这个 selector 当成第二套 validation truth。
最终有效性继续属于 rule / submit lane。

## Verification boundary

`runtime.trial(...)` 和 `runtime.compare` 是 runtime control-plane route。
它们可以读取同一条 evidence boundary，但不会进入 Form authoring，也不会新增第二个 report object 或 scenario authoring surface。

它们用于在 Form program 声明完成之后验证和比较行为。
性能比较属于 runtime control-plane，不是 Form 用户 authoring surface。

## 不属于 canonical route 的形态

这些形态不属于当前 Form surface：

- public `Form.Path`
- schema path builders
- Form-owned React hook families
- `useCompanion` / `useFieldValue` wrappers
- public row owner tokens
- `Fact` / `SoftFact` namespaces
- public `FormProgram.metadata`
- 直接把 returned carrier 当 selector 使用

## 延伸阅读

- [Quick start](/cn/docs/form/quick-start)
- [Sources](/cn/docs/form/sources)
- [Companion](/cn/docs/form/companion)
- [Derived](/cn/docs/form/derived)
- [Field arrays](/cn/docs/form/field-arrays)
- [Validation](/cn/docs/form/validation)
