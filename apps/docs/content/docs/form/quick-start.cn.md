---
title: Form 快速开始
description: 声明 form program，挂载 runtime，用 selector 读取，通过 form handle 写入。
---

## 1. 声明 values 与 rules

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

`Form.make(...)` 返回 Program-compatible 的 `FormProgram`。

## 2. 挂载 runtime

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

## 3. 在 React 中读取和写入

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

- 读取使用 `useSelector(...)`。
- 写入使用 form handle：`field`、`fieldArray`、`validate`、`submit`、`reset`、`setError`、`clearErrors`。
- Form 不公开 `useForm`、`useField` 或 `useFieldArray` 作为 canonical API。
