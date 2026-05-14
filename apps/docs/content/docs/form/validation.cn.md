---
title: Validation
description: validateOn、reValidateOn、manual validation 与 submit decode 的工作方式。
---

Form validation 在 authoring 阶段配置，由 Form runtime 执行。

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

`submit(...)` 会校验、flush blocking submit sources、decode payload，并返回 verdict。

## Error reads

```tsx
const emailError = useSelector(form, Form.Error.field("email"))
```

field explanation 可以表示 error、pending、stale、cleanup 或当前没有 explanation。
