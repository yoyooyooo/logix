---
title: Quick start
description: Build a form program, mount it through the core React host, and submit it through the form handle.
---

## 1) Define values and submit payload

```ts
import { Schema } from "effect"

export const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

export const SubmitPayload = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})
```

`values` describes the state shape edited by the UI.
`submit.decode` describes the payload shape that may leave the form boundary.

## 2) Create a Form program

```ts
import * as Form from "@logixjs/form"

export const UserForm = Form.make(
  "UserForm",
  {
    values: Values,
    initialValues: {
      name: "",
      email: "",
    },
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange"],
  },
  (form) => {
    form.field("name").rule(
      Form.Rule.make({
        required: "user.name.required",
      }),
    )

    form.field("email").rule(
      Form.Rule.make({
        required: "user.email.required",
      }),
    )

    form.submit({
      decode: SubmitPayload,
    })
  },
)
```

## 3) Build a Runtime

```ts
import * as Logix from "@logixjs/core"

export const runtime = Logix.Runtime.make(UserForm)
```

This is the shortest route when one shared form instance is enough.

## 4) Mount it through the core React host

```tsx
import React from "react"
import { RuntimeProvider, useModule, useSelector } from "@logixjs/react"
import { Effect } from "effect"
import { runtime, UserForm } from "./UserForm"

function Page() {
  const form = useModule(UserForm.tag)
  const name = useSelector(form, (s) => s.name)
  const email = useSelector(form, (s) => s.email)
  const nameError = useSelector(form, (s) => s.errors?.name)
  const canSubmit = useSelector(
    form,
    (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
  )

  return (
    <div>
      <input
        value={String(name ?? "")}
        onChange={(e) => void Effect.runPromise(form.field("name").set(e.target.value))}
        onBlur={() => void Effect.runPromise(form.field("name").blur())}
      />

      <input
        value={String(email ?? "")}
        onChange={(e) => void Effect.runPromise(form.field("email").set(e.target.value))}
        onBlur={() => void Effect.runPromise(form.field("email").blur())}
      />

      {nameError ? <div>{String(nameError)}</div> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.submit({
              onValid: (payload) => Effect.log(payload),
              onInvalid: (currentErrors) => Effect.log(currentErrors),
            }),
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

## 5) Read and write boundaries

Reads stay on:

- `useSelector(form, selector)`

Writes stay on:

- `form.field(path).set(...)`
- `form.field(path).blur()`
- `form.fieldArray(path).append(...)`
- `form.submit(...)`

Form-specific support reads also go through `useSelector(...)`:

- `fieldValue(path)` for typed value reads
- `Form.Error.field(path)` for field explanations
- `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` for companion bundles

See [Selectors and support facts](/docs/form/selectors) for the selector table, returned-carrier typing route, and the boundary between companion soft facts and final rule / submit truth.

## 6) Multiple instances

When one page needs multiple independent copies of the same form, switch to the program route:

```tsx
const form = useModule(UserForm, { key: "user-form:42" })
```

Use `useModule(UserForm.tag)` for a shared instance already hosted by the Runtime.
Use `useModule(UserForm, { key })` for an independent instance.
Use `useModule(UserForm)` for a component-private instance.
Use `useModule(UserForm, { key, gcTime })` to restore shortly after route changes.

See [Instances](/docs/form/instances) for the full lifetime model.

## Canonical route

The current canonical route is:

- `Form.make(...)`
- `form.field(path).rule(...)`
- `form.submit({ decode })`
- `RuntimeProvider`
- `useModule(...)`
- `useSelector(...)`

Wrapper families that recreate `useForm / useField / useFieldArray / useFormState` are outside the current canonical surface.

## See also

- [Instances](/docs/form/instances)
- [Sources](/docs/form/sources)
- [Companion](/docs/form/companion)
- [Selectors and support facts](/docs/form/selectors)
