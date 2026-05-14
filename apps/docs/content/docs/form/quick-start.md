---
title: Form quick start
description: Declare a form program, mount it, read with selectors, and write through the form handle.
---

## 1. Declare values and rules

```ts
import { Effect, Schema } from "effect"
import * as Form from "@logixjs/form"

const ContactValues = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

type ContactValues = Schema.Schema.Type<typeof ContactValues>

export const ContactForm = Form.make(
  "ContactForm",
  {
    values: ContactValues,
    initialValues: { name: "", email: "" } satisfies ContactValues,
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange", "onBlur"],
  },
  ($) => {
    $.field("name").rule(Form.Rule.make({ required: true }))
    $.field("email").rule(Form.Rule.make({ required: true, email: true }))
    $.submit({ decode: ContactValues })
  },
)
```

`Form.make(...)` returns a Program-compatible `FormProgram`.

## 2. Mount the runtime

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"
import { ContactForm } from "./ContactForm"

const runtime = Logix.Runtime.make(ContactForm)

export function Root() {
  return (
    <RuntimeProvider runtime={runtime}>
      <ContactFormView />
    </RuntimeProvider>
  )
}
```

## 3. Read and write in React

```tsx
import { Effect } from "effect"
import * as Form from "@logixjs/form"
import { fieldValue, rawFormMeta, useModule, useSelector } from "@logixjs/react"

function ContactFormView() {
  const form = useModule(ContactForm.tag)
  const name = useSelector(form, fieldValue("name"))
  const email = useSelector(form, fieldValue("email"))
  const meta = useSelector(form, rawFormMeta())
  const emailError = useSelector(form, Form.Error.field("email"))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void Effect.runPromise(form.submit())
      }}
    >
      <input
        value={name}
        onChange={(event) => void Effect.runPromise(form.field("name").set(event.target.value))}
        onBlur={() => void Effect.runPromise(form.field("name").blur())}
      />
      <input
        value={email}
        onChange={(event) => void Effect.runPromise(form.field("email").set(event.target.value))}
        onBlur={() => void Effect.runPromise(form.field("email").blur())}
      />
      <pre>{JSON.stringify({ meta, emailError }, null, 2)}</pre>
      <button type="submit">Submit</button>
    </form>
  )
}
```

## Rules

- Reads use `useSelector(...)`.
- Writes use the form handle: `field`, `fieldArray`, `validate`, `submit`, `reset`, `setError`, `clearErrors`.
- Form does not expose `useForm`, `useField`, or `useFieldArray` as canonical APIs.
