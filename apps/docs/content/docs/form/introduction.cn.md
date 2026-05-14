---
title: Introduction
description: Logix Form 的 owner map 与公开路线。
---

Form 是 program-first 的领域包。`Form.make` 产出 program，可以被 `Runtime.make` 挂载，可以被另一个 program import，也可以在 React 中局部获取。

## Owner map

| 关注点 | Owner |
| --- | --- |
| editable values | Form state |
| final validation truth | field/root/list/submit rules |
| remote facts | `field(path).source(...)` |
| local soft facts | `field(path).companion(...)` |
| list identity | Form list policy 与 row-id handle routes |
| React reads | `useSelector` 加 core/Form selector descriptors |
| runtime execution | Program/Runtime |

## Public route

```ts
const ContactForm = Form.make("ContactForm", config, ($) => {
  $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
  $.submit({ decode: SubmitSchema })
})
```

## 边界

form 不是 React controller object。handle 是同一 module handle 路线上的领域扩展。UI 组件通过 selectors 读取，并调用 handle commands。
