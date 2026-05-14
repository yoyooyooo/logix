---
title: Validation
description: Validate on submit, on change, on blur, and manual validation.
---

Validation policy is declared in `Form.make` config and rule declarations.

## Config

```ts
Form.make("Contact", {
  values,
  initialValues,
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange", "onBlur"],
}, define)
```

`validateOn` controls the first validation pass. `reValidateOn` controls follow-up validation after a field has already produced feedback.

## Manual validation

```ts
await Effect.runPromise(form.validate())
await Effect.runPromise(form.validate(["email"]))
```

## Error reads

```tsx
const emailError = useSelector(form, Form.Error.field("email"))
const meta = useSelector(form, rawFormMeta())
```

Errors are domain-owned. Do not mirror them into React local state.
