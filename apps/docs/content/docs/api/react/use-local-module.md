---
title: useLocalModule
description: Create a component-local module instance in React.
---

`useLocalModule` creates a component-local module instance.

This is an advanced route.
Use it when one component instance should own one local runtime instance and no cross-component sharing is required.

## Usage

```tsx
import * as Logix from "@logixjs/core"
import { useDispatch, useLocalModule, useSelector } from "@logixjs/react"
import { Schema } from "effect"

const LocalForm = Logix.Module.make("LocalForm", {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
  reducers: {
    change: (state, action) => ({ ...state, text: action.payload }),
  },
})

export function LocalFormComponent() {
  const form = useLocalModule(LocalForm, { initial: { text: "" } })
  const text = useSelector(form, (s) => s.text)
  const dispatch = useDispatch(form)

  return <input value={text} onChange={(e) => dispatch({ _tag: "change", payload: e.target.value })} />
}
```

## Properties

- synchronous construction
- lifecycle bound to the component
- no cross-component sharing

## Options

`useLocalModule(module, options)` accepts:

- `initial`
- `logics`
- `deps`
- `key`

`useLocalModule(factory, deps?)` accepts a synchronous factory route.

## When not to use it

Prefer `useModule(Program, options?)` when:

- async initialization is needed
- keyed reuse is needed
- one instance should be shared across components

## See also

- [useModule](./use-module)
- [useSelector](./use-selector)
