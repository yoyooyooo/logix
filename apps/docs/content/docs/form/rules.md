---
title: Rules
description: Field, root, list, and submit validation rules.
---

Rules own final form truth. Companion and source declarations may influence interaction, but they do not write canonical errors.

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

`Form.Rule.make` supports builtins such as `required`, `email`, `minLength`, `maxLength`, `min`, `max`, and `pattern`, plus custom `validate` functions.
