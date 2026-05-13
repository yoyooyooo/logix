---
title: React integration recipe
description: Mount a runtime, resolve module instances, and keep reads and writes on the canonical host route.
---

The canonical React recipe is:

1. build a runtime
2. mount it with `RuntimeProvider`
3. resolve instances with `useModule(...)`
4. read with `useSelector(...)`
5. write with `useDispatch(...)` or the handle

## Runtime

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

const runtime = Logix.Runtime.make(CounterProgram)
```

In development HMR, create this runtime through the application boundary that can own lifecycle replacement. That boundary should use the same first-wave decisions everywhere: `reset` when a successor runtime exists, `dispose` when it does not.

Enable the host carrier once in development tooling:

```ts
// vite.config.ts
import { logixReactDevLifecycle } from "@logixjs/react/dev/vite"

export default defineConfig({
  plugins: [logixReactDevLifecycle(), react()],
})
```

## Provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` projects the runtime. It does not choose the program and does not own hot lifecycle truth.

## Shared instance

```tsx
const counter = useModule(Counter.tag)
```

## Keyed instance

```tsx
const form = useModule(FormProgram, { key: "form:checkout" })
```

## Reads

```tsx
const count = useSelector(counter, (s) => s.count)
```

## Writes

```tsx
const dispatch = useDispatch(counter)
dispatch({ _tag: "increment", payload: undefined })
```

## Imported children

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = host.imports.get(ChildModule.tag)
```

## Advanced routes

Advanced routes remain available:

- `useLocalModule(...)`
- `useImportedModule(...)`
- `ModuleScope`

They do not replace the canonical host route.

## Development HMR

- Keep one owner at the runtime creation boundary.
- Enable the host dev lifecycle carrier once; ordinary modules and components should not import it.
- Do not scatter per-component or per-demo HMR cleanup.
- Keep state survival out of this wave; the recoverable path is reset-first.
- Hot lifecycle diagnostics use the existing evidence event `runtime.hot-lifecycle`.

## See also

- [RuntimeProvider](../../api/react/provider)
- [useModule](../../api/react/use-module)
- [useSelector](../../api/react/use-selector)
