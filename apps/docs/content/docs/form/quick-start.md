---
title: Form quick start
description: Build a form program, mount it, and read/write it from React.
---

## Declare the form

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

## Mount

```ts
const runtime = Logix.Runtime.make(ContactForm)
```

`ContactForm` is a program. It can be used as the root program or imported into a host program.

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

Reads go through `useSelector`. Writes go through the form handle.
