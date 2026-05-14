---
title: React integration
description: RuntimeProvider, useModule, useSelector, dispatch, and local ownership.
---

React integration has one provider and three common hooks. The provider supplies a runtime. Components acquire a module instance, read narrow slices, and dispatch actions.

## Provider

```tsx
const runtime = Logix.Runtime.make(AppProgram)

<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` can also merge a local `layer` for a subtree. Transaction policy stays on `Program` or `Runtime`, not on React props.

Development HMR is handled by one host dev lifecycle carrier, not by component-level cleanup snippets. Enable `logixReactDevLifecycle()` in Vite or `installLogixDevLifecycleForVitest()` in test setup once at the host boundary. The carrier owns hot boundaries and asks the runtime owner to `reset` or `dispose`; `RuntimeProvider` only projects the current runtime. Hot lifecycle evidence appears as `runtime.hot-lifecycle`.

## Shared runtime instance

```tsx
const counter = useModule(Counter.tag)
```

Use a module tag when the instance is already provided by the root program or one of its imports.

## Local program instance

```tsx
const preview = useModule(PreviewProgram, { key: productId })
```

Use a program when React should own a local/keyed instance. The `key` partitions the instance. Without a key, the instance is component-scoped.

## Reads

```tsx
const count = useSelector(counter, fieldValue("count"))
const [count, label] = useSelector(counter, fieldValues(["count", "label"]))
const isEmpty = useSelector(counter, (state) => state.count === 0)
```

Prefer `fieldValue` and `fieldValues` for state fields. Use selector functions for derived UI reads. Use `equalityFn` when the selected value is an object that should not re-render on equivalent structure.

## Dispatch

```tsx
const dispatch = useDispatch(counter)
dispatch({ _tag: "increment", payload: undefined })
```

Dispatch is an input into the runtime. Effects and writebacks stay in logic.
