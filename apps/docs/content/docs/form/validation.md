---
title: Validation
description: Validation, decode, manual errors, and submit all converge on the same carrier.
---

Validation converges into one model:

1. rule failures
2. submit decode failures
3. manual errors
4. submit-side mapped errors

All of them land on the same leaf shape:

```ts
type FormErrorLeaf = {
  origin: "rule" | "decode" | "manual" | "submit"
  severity: "error" | "warning"
  code?: string
  message: I18nMessageToken
}
```

## Runtime entry points

The form handle exposes three validation entry points:

```ts
form.validate()
form.validatePaths(["shipping.address"])
form.submit({
  onValid: (payload, ctx) => Effect.void,
  onInvalid: (errors) => Effect.void,
})
```

Their roles are:

- `validate()` runs the current validation funnel without submitting
- `validatePaths(...)` targets one path or one subtree
- `submit(...)` is the blocking gate

## Submit decode

```ts
Form.make(
  "CheckoutForm",
  {
    values: Values,
    initialValues,
  },
  (form) => {
    form.submit({
      decode: SubmitPayload,
    })
  },
)
```

`values` defines the editable state shape.
`decode` defines the payload that may leave the form boundary.

When decode issues need stable error placement, continue using lower-level schema bridge helpers in repo-local glue instead of the form root public surface.

## Manual errors

```ts
yield* form.setError(
  "email",
  Form.Error.leaf({
    origin: "manual",
    severity: "error",
    message: I18n.token("user.email.taken"),
  }),
)
```

Manual errors do not create a second model.
They enter the same carrier as rule and decode failures.

## Rendering

UI rendering should consume:

- `errors` from form state
- the current i18n snapshot at render time

This keeps already-visible errors reactive to locale changes without forcing rule declarations to emit render-ready strings.

## See also

- [Rules](/docs/form/rules)
- [Schema](/docs/form/schema)
- [Selectors and support facts](/docs/form/selectors)
