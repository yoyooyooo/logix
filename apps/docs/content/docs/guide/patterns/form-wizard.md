---
title: Form wizard
description: Compose step state with a Form program without turning steps into a second form runtime.
---

A wizard is a route-level state machine around a form. The form owns values, validation, sources, companion facts, and submit. The wizard owns step navigation.

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

The host program imports the form program. React can read both through the same provider.

## Boundary

Step state is not validation truth. Validation and submit settlement stay in Form.
