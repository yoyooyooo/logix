---
title: React integration recipe
description: Build a runtime, mount it, acquire instances, read precisely, and write safely.
---

## Runtime

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})

const runtime = Logix.Runtime.make(CounterProgram)
```

## Provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Shared instance

```tsx
const counter = useModule(Counter.tag)
```

## Keyed local instance

```tsx
const form = useModule(ContactForm, { key: `contact:${id}` })
```

## Read and write

```tsx
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
dispatch({ _tag: "inc", payload: undefined })
```

## Imported child

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = useImportedModule(host, Child.tag)
```

The child must be supplied through `Program.make(..., { capabilities: { imports: [ChildProgram] } })`.

## Do not use

- raw module objects in `useModule(...)`;
- no-argument `useSelector(handle)`;
- removed APIs such as `useLocalModule`, `useModuleList`, or `ModuleScope`.
