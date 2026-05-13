---
title: Runtime
description: Construct a Logix runtime, mount it in React, and execute programs in host environments.
---

`Runtime` is the execution container of Logix.

It hosts:

- module state
- logic execution
- process and link installation
- runtime-scoped services

## Construction

The canonical construction route is:

```ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

const RootProgram = Logix.Program.make(RootModule, {
  initial: { /* ... */ },
  capabilities: {
    services: [/* ... */],
    imports: [/* ... */],
  },
  logics: [/* ... */],
})

const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.empty,
})
```

## React mounting

```tsx
import { RuntimeProvider } from "@logixjs/react"

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <Router />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` makes the runtime visible to the React subtree.

## Node and tests

A runtime can also execute effects directly:

```ts
void runtime.runPromise(program)
```

## One-shot program run

`Runtime.run(Program, main, options)` is the result face. It boots the Program, passes a program run context into `main`, disposes the runtime scope, and returns the value produced by `main`.

```ts
import { Effect, Layer } from "effect"
import * as Logix from "@logixjs/core"

const result = await Logix.Runtime.run(
  RootProgram,
  ({ module }) =>
    Effect.gen(function* () {
      const state = yield* module.getState
      return { count: state.count }
    }),
  {
    layer: Layer.empty,
    handleSignals: false,
  },
)
```

`Runtime.run` returns the application result. It does not return a `VerificationControlPlaneReport`.

## Local overrides

`RuntimeProvider` may stack an additional `layer` for a subtree:

```tsx
<RuntimeProvider runtime={runtime} layer={FeatureLayer}>
  <Feature />
</RuntimeProvider>
```

## Notes

- `Runtime.make(Program)` is the canonical runtime entry
- `Runtime.run(Program, main, options)` is the one-shot result entry
- `RuntimeProvider` mounts a runtime into React; it does not define a second control plane
- runtime disposal belongs to the host that created the runtime

## Verification control plane

The runtime control plane is separate from authoring.

```ts
Logix.Runtime.run(program, main, options)
Logix.Runtime.check(program)
Logix.Runtime.trial(program, options)
```

`Runtime.run` is the result face. `Runtime.trial` is the diagnostic run face. `Runtime.check` is the static diagnostic face.

`Runtime.check(Program, options?)` is the cheap static verification gate. It returns a `VerificationControlPlaneReport` with `stage="check"` and `mode="static"`. It does not boot the program or execute behavior.

`Runtime.trial(Program, options)` executes a verification run, including scenario runs based on `fixtures / env / steps / expect`.

These routes do not enter the Form authoring surface.

`runtime.compare` is frozen only as a control-plane stage. Root `Runtime.compare` productization remains deferred until explicit runtime authority intake, and it does not own a second correctness truth or benchmark truth.

## See also

- [Module](./module)
- [RuntimeProvider](../react/provider)
