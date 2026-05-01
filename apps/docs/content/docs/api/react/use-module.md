---
title: useModule
description: Resolve shared or local module instances in React.
---

`useModule` resolves a module handle inside React.

The canonical routes are:

- `useModule(ModuleTag)` for a shared instance already hosted by the current runtime scope
- `useModule(Program, options?)` for a local or keyed instance

## Shared instance

```tsx
const counter = useModule(Counter.tag)
```

This resolves an already hosted shared instance from the current runtime scope.

## Local or keyed instance

```tsx
const editor = useModule(EditorProgram, { key: "editor:42" })
```

This creates or reuses a local instance for the current runtime scope.

Without a `key`, instance identity is bound to the current component call:

```tsx
const editor = useModule(EditorProgram)
```

Use this for multiple independent copies on the same screen.

With the same `key`, reuse only happens under the same provider runtime scope and the same `Program`:

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

Different provider runtime scopes, subtree layer scopes, or `Program` values produce different instances even if the key string matches.

Set `gcTime` when the instance should stay alive briefly after the last holder unmounts:

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

Remounting within the window reuses the existing instance; remounting after the window creates a new one.

## State reads

State reads stay on `useSelector(...)`:

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)
```

`useModule` does not subscribe by itself.

## Options

When the first argument is a `Program`, `useModule` accepts:

- `key`
- `gcTime`
- `deps`
- `suspend`
- `initTimeoutMs`

These options belong to local-instance construction and reuse.
`key` determines explicit reuse identity, and `gcTime` controls the keep-alive window after the last holder unmounts.

## Existing handles

`useModule(ref)` and `useModule(runtime)` connect to an existing instance.
They do not create a new `ModuleRuntime`.

## Notes

- `useLocalModule(...)`, `useLayerModule(...)`, and `ModuleScope.make(...)` are advanced routes.
- `useModule(Module)` is no longer part of the canonical public route.

## See also

- [RuntimeProvider](./provider)
- [useSelector](./use-selector)
- [useImportedModule](./use-imported-module)
- [ModuleScope](./module-scope)
