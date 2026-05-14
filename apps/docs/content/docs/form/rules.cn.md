---
title: Rules
description: Field、root、list 与 submit validation rules。
---

Rules 拥有 final form truth。Companion 和 source declaration 可以影响交互，但不写 canonical errors。

## Field rule

```ts
$.field("email").rule(Form.Rule.make({
  required: "Email required",
  email: "Invalid email",
}))
```

## Root rule

```ts
$.root((values) => values.password === values.confirm ? undefined : { confirm: "Passwords differ" })
```

## List rule

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  list: (rows) => (rows.length > 0 ? undefined : { $list: "Add at least one item" }),
})
```

## Builtins

`Form.Rule.make` 支持 `required`、`email`、`minLength`、`maxLength`、`min`、`max`、`pattern` 等 builtin，也支持自定义 `validate` 函数。
