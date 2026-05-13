---
title: Validation
description: 校验、decode、manual error 和 submit 最终汇到同一个 carrier。
---

校验最终汇到同一套模型里：

1. rule failure
2. submit decode failure
3. manual error
4. submit 侧映射错误

它们都落到同一份 leaf 形状：

```ts
type FormErrorLeaf = {
  origin: "rule" | "decode" | "manual" | "submit"
  severity: "error" | "warning"
  code?: string
  message: I18nMessageToken
}
```

## Runtime 入口

form handle 暴露 3 条校验入口：

```ts
form.validate()
form.validatePaths(["shipping.address"])
form.submit({
  onValid: (payload, ctx) => Effect.void,
  onInvalid: (errors) => Effect.void,
})
```

它们的职责分别是：

- `validate()` 运行当前校验漏斗，不提交
- `validatePaths(...)` 只命中一个 path 或一个 subtree
- `submit(...)` 是最终阻塞门

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

`values` 定义可编辑状态形状。
`decode` 定义可以越过表单边界的 payload。

当 decode issue 需要稳定落点时，继续在仓内 glue 层使用更低层的 schema bridge helper，不再通过 Form root public surface 暴露。

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

manual error 不会创建第二套模型。
它与 rule 和 decode failure 进入同一个 carrier。

## 渲染

UI 渲染应消费：

- form state 中的 `errors`
- render 时刻的 i18n snapshot

这样已经显示出来的错误会随着语言切换一起更新，而不要求 rule declaration 直接产出 render-ready string。

## 延伸阅读

- [Rules](/cn/docs/form/rules)
- [Schema](/cn/docs/form/schema)
- [Selectors and support facts](/cn/docs/form/selectors)
