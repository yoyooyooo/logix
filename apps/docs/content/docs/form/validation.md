---
title: Validation
description: How validateOn, reValidateOn, manual validation, and submit decode work.
---

Form validation is configured at authoring time and executed by the Form runtime.

```ts
Form.make("ContactForm", {
  values: ContactValues,
  initialValues,
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange", "onBlur"],
}, ($) => {
  $.field("email").rule(Form.Rule.make({ required: true, email: true }))
  $.submit({ decode: SubmitSchema })
})
```

## Runtime methods

```ts
yield* form.validate()
yield* form.validatePaths(["email", "name"])
const verdict = yield* form.submit({
  onValid: (decoded) => save(decoded),
  onInvalid: (errors) => log(errors),
})
```

`submit(...)` validates, flushes blocking submit sources, decodes the payload, and returns a verdict.

## Error reads

```tsx
const emailError = useSelector(form, Form.Error.field("email"))
```

The field explanation may represent error, pending, stale, cleanup, or no current explanation.
