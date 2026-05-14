---
title: Validation
description: on submit、on change、on blur 与 manual validation。
---

validation policy 在 `Form.make` config 和 rule declarations 中声明。

## Config

```ts
Form.make("Contact", {
  values,
  initialValues,
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange", "onBlur"],
}, define)
```

`validateOn` 控制第一次校验。`reValidateOn` 控制字段已经产生反馈后的后续校验。

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

errors 属于领域 owner。不要镜像进 React local state。
