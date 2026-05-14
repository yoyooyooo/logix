---
title: Rules
description: Define field, root, and list validation truth.
---

Rules are the canonical validation truth for Form.

## Field rules

```ts
$.field("email").rule(
  Form.Rule.make({
    required: true,
    email: true,
  }),
)
```

`Form.Rule.make(...)` also accepts a function or named validation entries.

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

Rules own final validation truth. Companion must not emit `errors` or submit verdicts. Source can influence submit gating through `submitImpact`, but it does not replace final rules.
