---
title: Derived
description: Form 不再保留独立的公开 derived 家族。
---

Form 不定义独立的公开 `derived` 家族。

派生逻辑继续停在这三个位置：

- 视图派生：React 中通过 `useSelector(form, selector)`
- payload 派生：`submit.decode`
- 可复用校验派生：`Form.Rule.make(...)`

## 视图派生

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)
```

## Payload 派生

```ts
form.submit({
  decode: SubmitPayload,
})
```

## 校验派生

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

如果某个 helper 将来进入公开候选，它必须先说明为什么它应属于 Form，而不是 core selector、schema transform 或 runtime logic。

## 延伸阅读

- [Selectors and support facts](/cn/docs/form/selectors)
- [Schema](/cn/docs/form/schema)
- [Rules](/cn/docs/form/rules)
