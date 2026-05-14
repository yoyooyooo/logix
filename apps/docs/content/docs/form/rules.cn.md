---
title: Rules
description: 定义 field、root 与 list validation truth。
---

Rules 是 Form 的 canonical validation truth。

## Field rules

```ts
$.field("email").rule(
  Form.Rule.make({
    required: true,
    email: true,
  }),
)
```

`Form.Rule.make(...)` 也接受函数或命名 validation entries。

```ts
$.field("confirmPassword").rule(
  Form.Rule.make({
    deps: ["password"],
    validate: (confirm, ctx) =>
      confirm === ctx.deps.password ? undefined : "password.mismatch",
  }),
)
```

## Root and list rules

```ts
$.root(Form.Rule.make((values) => values.enabled ? undefined : "disabled"))

$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  list: Form.Rule.make((items) => (items.length ? undefined : "items.required")),
})
```

## Boundary

Rules 持有 final validation truth。Companion 不得产出 `errors` 或 submit verdicts。Source 可以通过 `submitImpact` 影响 submit gating，但不能替代 final rules。
