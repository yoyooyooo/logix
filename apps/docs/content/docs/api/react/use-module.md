---
title: useModule
description: Resolve a hosted module instance or create a local/keyed Program instance in React.
---

`useModule(...)` is the React instance-acquisition hook.

## Shared hosted instance

Use a Module tag when the current runtime already hosts that instance:

```tsx
const counter = useModule(Counter.tag)
```

This reads the instance from the current `RuntimeProvider` scope.

## Local or keyed Program instance

Use a Program when a component or route needs its own instance:

```tsx
const editor = useModule(EditorProgram)
```

Add a key when multiple components should share the same local instance inside the same runtime scope:

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

`gcTime` keeps the instance alive after the last holder unmounts. Remounting inside the window reuses it.

## Suspense mode

When using explicit suspense, provide a stable key:

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  suspend: true,
  initTimeoutMs: 5_000,
})
```

## Reads and writes

`useModule(...)` does not read state by itself.

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
```

## Removed routes

Do not use `useModule(Module)` for raw module objects. Do not use the removed `useLocalModule`, `useModuleList`, or `ModuleScope` routes. Use `useModule(Program, options)` and ordinary component composition instead.

## See also

- [RuntimeProvider](./provider)
- [useSelector](./use-selector)
- [useDispatch](./use-dispatch)
- [useImportedModule](./use-imported-module)
