---
title: RuntimeProvider
description: Project a Logix runtime into a React subtree.
---

`RuntimeProvider` makes an existing Logix runtime visible to React hooks.

```tsx
import { RuntimeProvider } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { RootProgram } from "./root-program"

const runtime = Logix.Runtime.make(RootProgram)

export function Root() {
  return (
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  )
}
```

## Props

| Prop | Role |
| --- | --- |
| `runtime` | Required. The runtime created by `Runtime.make(...)` or another owner boundary. |
| `layer` | Optional subtree-local Effect Layer. |
| `fallback` | Optional React fallback for gated startup paths. |
| `policy` | Optional provider startup/read policy, such as sync/suspend/defer behavior. |

## What it owns

`RuntimeProvider` owns React visibility for a runtime scope. It does not choose the Program, create a second runtime, or define a second verification control plane.

All public hooks from `@logixjs/react` must run under a provider:

- `useModule(...)`
- `useSelector(...)`
- `useDispatch(...)`
- `useImportedModule(...)`

## See also

- [Runtime](/docs/api/core/runtime)
- [useModule](./use-module)
- [useSelector](./use-selector)
