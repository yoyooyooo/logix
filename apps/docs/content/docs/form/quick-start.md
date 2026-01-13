---
title: Quick start
description: Go from 0 to 1 - a form that validates, submits, and is subscribable.
---

## 1) Define the values Schema and initial values

```ts
import { Schema } from "effect"

export const Values = Schema.Struct({
  name: Schema.String,
})

export type ValuesT = Schema.Schema.Type<typeof Values>
```

## 2) Create a Form Module

```ts
import * as Form from "@logixjs/form"

const $ = Form.from(Values)
const z = $.rules

export const UserForm = Form.make("UserForm", {
  values: Values,
  initialValues: { name: "" } satisfies ValuesT,

  // Two-phase triggers (before submit / after first submit)
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange"],

  // Recommended entry: rules (field/list/root rules)
  rules: z(
    z.field("name", {
      required: "Name is required",
      minLength: { min: 2, message: "At least 2 characters" },
    }),
  ),
})
```

See [Rules DSL (z)](./rules) for the two styles (Decl DSL vs Node DSL) and how to use `z.schema(...)`.

## 3) Use in React (RuntimeProvider + hooks)

```tsx
import React from "react"
import { Effect } from "effect"
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"
import { useForm, useField, useFormState } from "@logixjs/form/react"
import { UserForm } from "./UserForm"

const runtime = Logix.Runtime.make(UserForm, { devtools: true })

const Page = () => {
  const form = useForm(UserForm)
  const view = useFormState(form, (v) => v)
  const name = useField(form, "name")

  return (
    <div>
      <input value={String(name.value ?? "")} onChange={(e) => name.onChange(e.target.value)} onBlur={name.onBlur} />
      {name.error ? <div>{String(name.error)}</div> : null}

      <button
        disabled={!view.canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.controller.handleSubmit({
              onValid: (values) => Effect.log(values),
              onInvalid: (errors) => Effect.log(errors),
            }) as any,
          )
        }
      >
        Submit
      </button>
    </div>
  )
}

export const App = () => (
  <RuntimeProvider runtime={runtime}>
    <Page />
  </RuntimeProvider>
)
```

`useFormState(form, selector)` subscribes to the “aggregated form view state” (e.g. `canSubmit/isValid/isDirty`) to avoid subscribing to the whole values/errors tree in UI and causing unnecessary re-renders.

> Tip: `traits` still exists, but it’s an advanced entry (better for computed/source/link or low-level comparisons). For everyday form validation, prefer `rules`.
