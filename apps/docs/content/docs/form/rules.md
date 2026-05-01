---
title: Rules
description: Declare field, root, and list rules through the Form DSL.
---

Rules are declared inside `Form.make(...)`.

Three declaration sites are available:

- `form.field(path).rule(...)` for field-local verdicts
- `form.root(...)` for whole-form verdicts
- `form.list(path, spec)` for list-level and item-level verdicts

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

Field rules are appropriate when the verdict belongs to one value path.

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

Root rules are appropriate when the verdict depends on the whole form and does not belong to one field or one list.

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

List rules are appropriate when the verdict depends on the roster as a whole, such as:

- duplicates across rows
- row exclusivity
- list cardinality

## `Form.Rule.make(...)`

`Form.Rule.make(...)` is the standard validator declaration surface.

It accepts:

- built-ins such as `required`, `email`, `minLength`, `maxLength`, `min`, `max`, `pattern`
- a single `validate(value, ctx)` function
- a named validation map
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

## Declaration properties

- rule declarations remain locale-neutral
- output remains data, not render-ready strings
- rule failures converge on the same canonical error carrier
- array-wide verdicts belong in list-scoped rules, not in UI helpers

## See also

- [Validation](/docs/form/validation)
- [Companion](/docs/form/companion)
- [Field arrays](/docs/form/field-arrays)
