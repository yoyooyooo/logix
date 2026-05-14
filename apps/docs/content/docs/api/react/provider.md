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

## Boundary

State transaction policy is configured at program/runtime boundaries. The provider projects a runtime; it does not create another transaction mode.
