---
title: RuntimeProvider
description: React provider for a Logix runtime and optional subtree layer.
---

`RuntimeProvider` projects a Logix runtime into React.

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Props

| Prop | Meaning |
| --- | --- |
| `runtime` | Managed runtime created by `Runtime.make`. |
| `layer` | optional subtree layer merged into the current runtime context. |
| `fallback` | provider fallback while async provider setup completes. |
| `policy` | provider policy for preload, sync budget, and local cache behavior. |
| `onError` | host error sink for provider and diagnostic failures. |

## Development lifecycle boundary

`RuntimeProvider` is projection only. Development HMR belongs to one host dev lifecycle carrier enabled with `logixReactDevLifecycle()` or `installLogixDevLifecycleForVitest()` at the host boundary.

```ts
import { logixReactDevLifecycle } from "@logixjs/react/dev/vite"

export default defineConfig({
  plugins: [logixReactDevLifecycle()],
})
```

```ts
import { installLogixDevLifecycleForVitest } from "@logixjs/react/dev/vitest"

installLogixDevLifecycleForVitest()
```

The carrier delivers hot boundaries to the runtime owner. The owner chooses `reset` or `dispose`. A runtime passed into `RuntimeProvider` is borrowed unless an internal carrier binding explicitly owns it, so the provider does not call `runtime.dispose()`. Evidence is exported as `runtime.hot-lifecycle`.

## Boundary

State transaction policy is configured at program/runtime boundaries. The provider projects a runtime; it does not create another transaction mode.
