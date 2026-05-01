---
title: Introduction
description: Form defines input-state semantics. React acquisition and projection remain on the core host route.
---

`@logixjs/form` defines input-state semantics on top of the Logix runtime.

Its user surface is organized around three layers:

1. `Form.make(...)` defines form semantics
2. the returned `FormProgram` enters Runtime like any other program
3. the form handle performs validation, submit, field edits, and list edits

## Public surface

Root exports are:

- `Form.make`
- `Form.Rule`
- `Form.Error`
- `Form.Companion`

Optional public subpath:

- `@logixjs/form/locales`

React consumption remains on the core host route:

- mount through `RuntimeProvider`
- acquire through `useModule(...)`
- read through `useSelector(...)`
- write through the form handle

## Default reading order

- start with the default authoring path plus submit/validation
- then inspect shared, local, and keyed instance lifetimes
- then inspect source scheduling and remote fact flow
- then inspect companion local support facts
- then inspect row identity, cleanup receipts, and row-heavy edits

## Authoring

```ts
import * as Form from "@logixjs/form"
import { Schema } from "effect"

const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

const SubmitPayload = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

export const ProfileForm = Form.make(
  "ProfileForm",
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
        required: "profile.name.required",
        minLength: {
          min: 2,
          message: "profile.name.minLength",
        },
      }),
    )

    form.field("email").rule(
      Form.Rule.make({
        required: "profile.email.required",
      }),
    )

    form.submit({
      decode: SubmitPayload,
    })
  },
)
```

## Runtime consumption

```tsx
import React from "react"
import * as Logix from "@logixjs/core"
import { Effect } from "effect"
import { RuntimeProvider, useModule, useSelector } from "@logixjs/react"
import { ProfileForm } from "./ProfileForm"

const runtime = Logix.Runtime.make(ProfileForm)

function ProfilePage() {
  const form = useModule(ProfileForm.tag)
  const name = useSelector(form, (s) => s.name)
  const email = useSelector(form, (s) => s.email)
  const nameError = useSelector(form, (s) => s.errors?.name)
  const canSubmit = useSelector(
    form,
    (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
  )

  return (
    <form>
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

      {nameError ? <p>{String(nameError)}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.submit({
              onValid: (payload) => Effect.log(payload),
            }),
          )
        }
      >
        Submit
      </button>
    </form>
  )
}

export const App = () => (
  <RuntimeProvider runtime={runtime}>
    <ProfilePage />
  </RuntimeProvider>
)
```

## Instance selection

Use `useModule(ProfileForm.tag)` when the Runtime already hosts one shared form instance.

Use `useModule(ProfileForm, { key })` when a page needs an independent instance:

```tsx
const form = useModule(ProfileForm, { key: "profile:42" })
```

If each component needs its own copy, omit the key:

```tsx
const form = useModule(ProfileForm)
```

If route changes should restore the form shortly after unmount, add `gcTime` to a keyed instance:

```tsx
const form = useModule(ProfileForm, {
  key: "profile:42",
  gcTime: 60_000,
})
```

## Exclusions

The current surface does not include:

- a second form-owned React hook family
- package-local React wrappers as public truth
- render-ready strings emitted directly from rule declarations
- helper families that replace the core host route

## See also

- [Instances](/docs/form/instances)
- [Sources](/docs/form/sources)
- [Companion](/docs/form/companion)
- [Field arrays](/docs/form/field-arrays)
