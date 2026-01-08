---
title: useLocalModule
description: API Reference for useLocalModule hook
---

# useLocalModule

`useLocalModule` creates a “local module instance” inside a component (one instance per component instance). It’s typically used to host UI state that only belongs to the component/page (as an alternative to `useState` / `useReducer`).

Properties:

- **Synchronous creation**: does not trigger React Suspense, and is not governed by `RuntimeProvider`’s `policy.mode`.
- **Lifecycle bound to the component**: created on mount, disposed automatically on unmount (Scope/resources are closed together).
- **No cross-component sharing**: even with the same `key`, different components will not reuse the same instance.

## Usage (recommended: ModuleTag form)

```tsx
import * as Logix from '@logix/core'
import { useDispatch, useLocalModule, useSelector } from '@logix/react'
import { Schema } from 'effect'

const LocalForm = Logix.Module.make('LocalForm', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
  reducers: {
    change: (state, action) => ({ ...state, text: action.payload }),
  },
})

export function LocalFormComponent() {
  const form = useLocalModule(LocalForm, { initial: { text: '' } })
  const text = useSelector(form, (s) => s.text)
  const dispatch = useDispatch(form)

  return <input value={text} onChange={(e) => dispatch({ _tag: 'change', payload: e.target.value })} />
}
```

## API

### `useLocalModule(module, options)`

- `module`: the return value of `Logix.Module.make(...)` (or its `.tag`)
- `options.initial` (required): initial state
- `options.logics` (optional): extra `ModuleLogic` list to install
- `options.deps` (optional): dependency array used to “invalidate and rebuild the instance” (prefer primitives only)
- `options.key` (optional): distinguish multiple local instances within the same component / for diagnostics; not shared across components

### `useLocalModule(factory, deps?)`

- `factory`: `() => Effect<ModuleRuntime, ...>` (must be synchronously constructible; do not do I/O here)
- `deps`: same as `options.deps`

## When not to use useLocalModule

- **You need async initialization / want defer+preload**: use `useModule(Impl)` or `useModuleRuntime(Tag)` and let `RuntimeProvider` policy handle it (configure `logix.react.init_timeout_ms` as a safety net).
- **You need to share one instance across components**: use `useModule(Impl, { key })` (or lift instance creation to a route/root component and pass the handle down).
