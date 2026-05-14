---
title: React integration
description: Mount a runtime, acquire instances, read exactly, and write through dispatch or domain handles.
---

React integration uses one host route:

- `RuntimeProvider` projects a runtime scope.
- `useModule(...)` acquires an instance.
- `useSelector(...)` reads with an explicit selector or descriptor.
- `useDispatch(...)` dispatches actions.
- Domain handles, such as Form handles, expose domain-specific writes.

## Runtime provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Shared hosted instance

```tsx
const counter = useModule(Counter.tag)
```

## Local/keyed Program instance

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

This replaces removed local-module hook routes.

## Reads and writes

```tsx
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
```

Do not use no-argument `useSelector(handle)`. Pass an exact selector.

## See also

- [RuntimeProvider](/docs/api/react/provider)
- [useModule](/docs/api/react/use-module)
- [useSelector](/docs/api/react/use-selector)
