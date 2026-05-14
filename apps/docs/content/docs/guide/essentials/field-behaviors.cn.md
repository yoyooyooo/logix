---
title: Field declarations
description: 字段级行为是 logic builder 的局部声明，不是独立公开 namespace。
---

字段声明描述派生字段、external store 和 resource-backed source field。它们通过 logic builder 局部编写，并在 `Program.make` 阶段编译。

## Core 路线

```ts
const logic = Module.logic("fields", ($) => {
  $.fields({
    fullName: $.fields.computed({
      deps: ["firstName", "lastName"],
      get: (first, last) => `${first} ${last}`,
    }),
  })

  return Effect.void
})
```

`$.fields` 是声明收集器。独立编译器机制属于内部实现。用户代码不要 import 或依赖一套独立字段系统。

## 领域路线

Form、Query 和未来领域包使用同一编译底座，但对外暴露自己的领域语言。

```ts
Form.make("Contact", config, ($) => {
  $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
  $.field("countryId").source({ resource, deps: ["regionId"], key: (regionId) => ({ regionId }) })
})
```

领域包拥有自己的公开拼写。编译后的 asset 仍属于 program 装配路径。

## 边界

确定性派生或 source wiring 用字段声明。workflow 用普通 logic。最终表单真相和校验用 Form rules。
