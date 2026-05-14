---
title: Form quick start
description: 构建 form program，挂载，并在 React 中读写。
---

## 声明 form

```ts
import { Schema } from "effect"
import * as Form from "@logixjs/form"

const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

const Submit = Values

export const ContactForm = Form.make(
  "ContactForm",
  {
    values: Values,
    initialValues: { name: "", email: "" },
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange", "onBlur"],
  },
  ($) => {
    $.field("name").rule(Form.Rule.make({ required: "Name required" }))
    $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
    $.submit({ decode: Submit })
  },
)
```

## 挂载

```ts
const runtime = Logix.Runtime.make(ContactForm)
```

`ContactForm` 是 program。它可以作为 root program，也可以被 host program import。

## React

```tsx
function ContactView() {
  const form = useModule(ContactForm)
  const name = useSelector(form, fieldValue("name"))
  const nameError = useSelector(form, Form.Error.field("name"))

  return (
    <input
      value={name}
      onChange={(event) => void Effect.runPromise(form.field("name").set(event.target.value))}
      onBlur={() => void Effect.runPromise(form.field("name").blur())}
    />
  )
}
```

读取走 `useSelector`。写入走 form handle。
