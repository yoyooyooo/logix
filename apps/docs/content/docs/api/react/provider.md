---
title: LogixProvider
description: API Reference for LogixProvider
---

`LogixProvider` (also known as `RuntimeProvider`) is the root component for a Logix app. It provides the Runtime context to the component subtree.

## Usage

```tsx
import { RuntimeProvider } from '@logixjs/react'
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'
import { RootImpl } from './root-module'

// Recommended: build an app-level Runtime via Root ModuleImpl + Logix.Runtime.make
const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.empty, // You can also merge HttpClient/Config layers here
})

function Root() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <App />
    </RuntimeProvider>
  )
}
```

## API

### `<RuntimeProvider runtime>`

- `runtime`: any `ManagedRuntime` instance (from `effect`). In typical app/page scenarios, this is usually the return value of `Logix.Runtime.make(root, { layer })` (`root` can be a program module or its `.impl`).
  - Recommended: define an app-level runtime with Root ModuleImpl + `Logix.Runtime.make`, then pass it into `RuntimeProvider`.
  - Exception: if your project already creates a generic `ManagedRuntime` elsewhere (e.g. as a pure Effect host and you don’t care about module trees), you can pass it directly.

> For how to choose between `Logix.Runtime.make` and plain `ManagedRuntime.make`, see the “Runtime and ManagedRuntime” doc.

## Context

`RuntimeProvider` provides the following via React Context:

 - **Runtime**: the global Effect runtime.
 - **Scope**: the root Scope.
 - **Store**: the global state store.

All descendant components (via `useModule`, etc.) automatically connect to this Runtime.
