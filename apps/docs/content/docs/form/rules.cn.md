---
title: Rules
description: 通过 Form DSL 声明 field、root 和 list 规则。
---

规则统一在 `Form.make(...)` 内声明。

当前有 3 个声明位置：

- `form.field(path).rule(...)` 用于字段局部判定
- `form.root(...)` 用于整表单判定
- `form.list(path, spec)` 用于 list-level 和 item-level 判定

## Field rules

```ts
form.field("name").rule(
  Form.Rule.make({
    required: "profile.name.required",
    minLength: {
      min: 2,
      message: "profile.name.minLength",
    },
  }),
)
```

当判定只属于一个 value path 时，使用 field rule。

## Root rules

```ts
form.root(
  Form.Rule.make({
    validate: (values) =>
      values.startDate <= values.endDate
        ? undefined
        : { dateRange: "profile.dateRange.invalid" },
  }),
)
```

当判定依赖整张表单，且不属于单个字段或单个列表时，使用 root rule。

## List rules

```ts
form.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  list: Form.Rule.make({
    validate: (rows) => {
      const seen = new Set<string>()
      const rowErrors = rows.map((row) => {
        const sku = String(row?.sku ?? "").trim()
        if (!sku) return undefined
        if (seen.has(sku)) {
          return { sku: "items.sku.duplicate" }
        }
        seen.add(sku)
        return undefined
      })

      return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
    },
  }),
})
```

当判定依赖整组 roster 时，使用 list rule，例如：

- 跨行重复
- 跨行互斥
- 列表基数约束

## `Form.Rule.make(...)`

`Form.Rule.make(...)` 是标准的校验声明入口。

它支持：

- `required`、`email`、`minLength`、`maxLength`、`min`、`max`、`pattern` 等 built-ins
- 单个 `validate(value, ctx)` 函数
- 命名的 validation map
- `deps`
- `validateOn`

```ts
Form.Rule.make({
  deps: ["password"],
  validateOn: ["onChange"],
  validate: {
    sameAsPassword: (confirm, ctx) =>
      confirm === ctx.values.password
        ? undefined
        : "profile.confirmPassword.mismatch",
  },
})
```

## 声明约束

- rule declaration 保持 locale-neutral
- 输出保持为数据，不是 render-ready string
- rule failure 继续汇入同一份 canonical error carrier
- 依赖整组数组的判定，应留在 list-scoped rules，而不是藏进 UI helper

## 延伸阅读

- [Validation](/cn/docs/form/validation)
- [Companion](/cn/docs/form/companion)
- [Field arrays](/cn/docs/form/field-arrays)
