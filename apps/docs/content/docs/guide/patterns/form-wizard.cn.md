---
title: 表单向导
description: 组合 step state 与 Form program，不把 steps 变成第二套 form runtime。
---

向导是包在 form 外侧的 route-level state machine。Form 拥有 values、validation、sources、companion facts 和 submit。Wizard 拥有 step navigation。

## Host state

```ts
const Wizard = Logix.Module.make("Wizard", {
  state: Schema.Struct({ step: Schema.Number }),
  actions: { next: Schema.Void, back: Schema.Void },
})
```

## Form program

```ts
const CheckoutForm = Form.make("CheckoutForm", config, ($) => {
  $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
  $.submit({ decode: SubmitSchema })
})
```

## Assembly

```ts
const WizardProgram = Logix.Program.make(Wizard, {
  initial: { step: 0 },
  capabilities: { imports: [CheckoutForm] },
})
```

host program 引入 form program。React 可以在同一个 provider 下读取二者。

## 边界

step state 不是 validation truth。校验和 submit settlement 留在 Form。
