---
title: RuntimeProvider
description: Provide a Logix runtime to a React subtree.
---

`RuntimeProvider` makes a Logix runtime available to a React subtree.

It is required by the canonical React host APIs:

- `useModule(...)`
- `useImportedModule(...)`
- `useSelector(...)`
- `useDispatch(...)`

## Usage

```tsx
import { RuntimeProvider } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { Layer } from "effect"
import { RootProgram } from "./root-program"

const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.empty,
})

export function Root() {
  return (
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  )
}
```

## Props

### `runtime`

Required.

Any `ManagedRuntime` may be provided here.
In the common app or page route, it is typically the result of `Logix.Runtime.make(...)`.

### `layer`

Optional.

Adds an additional closed `Layer` to the React subtree.

### `fallback`

Optional.

Used while the provider is gating async startup paths.

### `policy`

Optional.

Controls provider startup behavior such as `sync`, `suspend`, or `defer + preload`.

## Notes

- `RuntimeProvider` defines the visible runtime scope for the subtree.
- It does not select programs.
- It does not create a second control plane.
- All React hooks from `@logixjs/react` must run inside a `RuntimeProvider` subtree.

## See also

- [useModule](./use-module)
- [useSelector](./use-selector)
- [useDispatch](./use-dispatch)
