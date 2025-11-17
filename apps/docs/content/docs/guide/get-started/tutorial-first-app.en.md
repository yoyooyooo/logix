---
title: 'Tutorial: Your First Logix Form'
description: Build a registration form with linkage, validation, and multi-field constraints.
---

This tutorial walks you through building a full-featured user registration form from scratch. We’ll cover:

1.  **Field linkage**: when a country changes, reset the province.
2.  **Async validation**: after entering a username, check whether it’s already taken.
3.  **Multi-field constraint**: validate that password and confirm password match.

### Who is this for?

- You’ve finished the counter example in “Quick Start” and want a more real-world form scenario.
- You want a complete Logix implementation for “linkage + async validation + multi-field constraints”.

### Prerequisites

- Basic TypeScript and React knowledge
- A rough understanding of Module / Logic / Bound API (`$`)

### What you’ll get

- A complete “registration form” example you can adapt as a project template
- Hands-on experience combining `$.onState` + `$.flow.debounce` + `$.state.mutate`
- An intuitive understanding of “hosting form state in a Module and keeping the UI thin”

## 1. Define data structures (Schema)

First, define the form “shape”. In Logix, we use `effect/Schema` to define State and Actions.

Create `src/features/register/schema.ts`:

```typescript
import { Schema } from 'effect'
import * as Logix from '@logix/core'

// 1) Define State
export const RegisterState = Schema.Struct({
  username: Schema.String,
  password: Schema.String,
  confirmPassword: Schema.String,
  country: Schema.String,
  province: Schema.String,
  // error messages
  errors: Schema.Struct({
    username: Schema.optional(Schema.String),
    password: Schema.optional(Schema.String),
  }),
  // metadata
  meta: Schema.Struct({
    isSubmitting: Schema.Boolean,
    isValidating: Schema.Boolean,
  }),
})

// 2) Define Actions
export const RegisterActions = {
  updateField: Schema.Struct({ field: Schema.String, value: Schema.String }),
  submit: Schema.Void,
  reset: Schema.Void,
}

// 3) Define Module (ModuleDef)
// Logix.Module.make returns a ModuleDef: it contains type info and a `.tag` (ModuleTag) used for DI / instance resolution.
export const RegisterDef = Logix.Module.make('Register', {
  state: RegisterState,
  actions: RegisterActions,
})

// Export Shape type (optional, for type inference)
export type RegisterShape = typeof RegisterDef.shape
```

## 2. Write business logic (Logic)

Next, use the Fluent API to express business logic.

Create `src/features/register/logic.ts`:

```typescript
import { Effect } from 'effect'
import { RegisterDef } from './schema' // assuming ModuleDef is in schema.ts or module.ts
import { UserApi } from '../../services/UserApi'

export const RegisterLogic = RegisterDef.logic(($) =>
  Effect.gen(function* () {
    // --- Scenario 1: field linkage ---
    // When country changes, reset province.
    yield* $.onState((s) => s.country).run(() =>
      $.state.mutate((draft) => {
        draft.province = ''
      }),
    )

    // --- Scenario 2: async validation ---
    // Watch username -> debounce -> validate -> update errors
    yield* $.onState((s) => s.username).pipe(
      $.flow.debounce(500),
      $.flow.filter((name) => name.length >= 3),
      $.flow.runLatest((name) =>
        Effect.gen(function* () {
          yield* $.state.mutate((d) => {
            d.meta.isValidating = true
          })

          const api = yield* $.use(UserApi)
          const isTaken = yield* api.checkUsername(name)

          yield* $.state.mutate((d) => {
            d.meta.isValidating = false
            d.errors.username = isTaken ? 'Username is already taken' : undefined
          })
        }),
      ),
    )

    // --- Scenario 3: multi-field constraint ---
    // Watch (password, confirmPassword) -> validate consistency
    yield* $.onState((s) => [s.password, s.confirmPassword] as const).run(([pwd, confirm]) =>
      $.state.mutate((draft) => {
        if (confirm && pwd !== confirm) {
          draft.errors.password = 'Passwords do not match'
        } else {
          delete draft.errors.password
        }
      }),
    )

    // --- Submit handling ---
    yield* $.onAction('submit').runExhaust(() =>
      Effect.gen(function* () {
        const state = yield* $.state.read
        // simple validation gate
        if (state.errors.username || state.errors.password) return

        yield* $.state.mutate((d) => {
          d.meta.isSubmitting = true
        })
        // ... submit logic ...
        yield* Effect.sleep('1 seconds') // simulate request
        yield* $.state.mutate((d) => {
          d.meta.isSubmitting = false
        })
      }),
    )
  }),
)
```

## 3. Assemble the module (Module)

Assemble Schema and Logic into a runnable Module.

Create `src/features/register/module.ts`:

```typescript
import { RegisterDef } from './schema'
import { RegisterLogic } from './logic'

// Create a runnable Module (a wrap module, includes `.impl`; you can inject Env via withLayer/withLayers)
export const RegisterModule = RegisterDef.implement({
  initial: {
    username: '',
    password: '',
    confirmPassword: '',
    country: 'CN',
    province: '',
    errors: {},
    meta: { isSubmitting: false, isValidating: false },
  },
  logics: [RegisterLogic],
})
```

## 4. Connect the UI (React)

Finally, use it in a React component.

```tsx
import { useModule, useSelector } from '@logix/react'
import { RegisterModule } from './module'

export function RegisterForm() {
  const register = useModule(RegisterModule)
  const state = useSelector(register, (s) => s)
  const actions = register.actions

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        actions.submit()
      }}
    >
      <div>
        <label>Username</label>
        <input
          value={state.username}
          onChange={(e) => actions.updateField({ field: 'username', value: e.target.value })}
        />
        {state.meta.isValidating && <span>Checking...</span>}
        {state.errors.username && <span style={{ color: 'red' }}>{state.errors.username}</span>}
      </div>

      {/* ... other fields ... */}

      <button type="submit" disabled={state.meta.isSubmitting}>
        {state.meta.isSubmitting ? 'Submitting...' : 'Register'}
      </button>
    </form>
  )
}
```

## Summary

In this example, we followed the four standard steps of Logix development:

1.  **Schema**: define data and Actions.
2.  **Logic**: declare business rules with the Fluent API.
3.  **Module**: assemble the module and provide initial state.
4.  **UI**: render the view only.

This separation keeps business logic testable and reusable, while keeping UI components simple.
