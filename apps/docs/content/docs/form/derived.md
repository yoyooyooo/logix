---
title: Derived
description: Form does not keep a separate public derived family.
---

Form does not define a separate public `derived` family.

Derivations stay in one of three places:

- view derivation in React through `useSelector(form, selector)`
- payload derivation in `submit.decode`
- reusable validation derivation in `Form.Rule.make(...)`

## View derivation

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)
```

## Payload derivation

```ts
form.submit({
  decode: SubmitPayload,
})
```

## Validation derivation

```ts
form.field("confirmPassword").rule(
  Form.Rule.make({
    deps: ["password"],
    validate: (confirm, ctx) =>
      confirm === ctx.values.password
        ? undefined
        : "profile.confirmPassword.mismatch",
  }),
)
```

If a helper becomes a public candidate later, it must justify why it belongs in Form instead of core selectors, schema transforms, or runtime logic.

## See also

- [Selectors and support facts](/docs/form/selectors)
- [Schema](/docs/form/schema)
- [Rules](/docs/form/rules)
