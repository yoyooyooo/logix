---
title: Schema
description: Form 在两处使用 schema：可编辑 values 和 submit decode；decode issue 最终仍回到同一套错误模型。
---

Form 在两个位置使用 schema：

- `values`，定义可编辑状态形状
- `submit.decode`，定义可以越过表单边界的 payload

## Values schema

```ts
Form.make(
  "InvoiceForm",
  {
    values: InvoiceDraft,
    initialValues,
  },
  (form) => {
    // ...
  },
)
```

`values` 应与 UI 正在编辑的状态形状一致。

## Submit decode

```ts
Form.make(
  "InvoiceForm",
  {
    values: InvoiceDraft,
    initialValues,
  },
  (form) => {
    form.submit({
      decode: InvoicePayload,
    })
  },
)
```

`submit.decode` 应与表单边界之外接受的 payload 形状一致。

## decode issue 映射

当 decode issue 需要稳定落点时，继续在仓内 glue 层使用更低层的 schema bridge helper。

这些 helper 用来决定：

- 哪个 value path 接收 decode issue
- 应写入哪个 canonical error leaf

如果某个 decode issue 无法映射到字段路径，它会回落到 submit slot，而不会停留在未映射的 schema payload 中。

## 延伸阅读

- [Quick start](/cn/docs/form/quick-start)
- [Validation](/cn/docs/form/validation)
- [Rules](/cn/docs/form/rules)
