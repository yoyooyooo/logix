---
title: Runtime
description: Create runtime containers and run verification control-plane commands.
---

`Runtime` is the execution-time surface. It consumes a `Program`, owns module runtimes and services, and exposes distinct result and verification faces.

## Create a runtime

```ts
const runtime = Logix.Runtime.make(RootProgram, {
  layer: AppLayer,
  devtools: { diagnosticsLevel: "light" },
})
```

Pass that runtime to React:

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` projects the runtime into React. It does not create a second control plane.

## One-shot run

`Runtime.run(Program, main, options?)` is the result face. It starts the Program, runs `main` with a program run context, closes the scope, and returns the application result.

```ts
const result = await Logix.Runtime.run(RootProgram, (ctx) =>
  ctx.runtime.runPromise(/* Effect work */),
)
```

It does not return a verification report.

## Verification faces

```ts
const checkReport = Logix.Runtime.check(RootProgram)
const trialReport = await Logix.Runtime.trial(RootProgram, options)
```

- `Runtime.check(...)` is the static diagnostic face.
- `Runtime.trial(...)` is the startup/scenario diagnostic face.
- `Runtime.compare(...)` belongs to the verification control plane and is used for report comparison/admissibility.

## Local instance route in React

A Program can also be used directly by React for a local or keyed module instance:

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

That route still uses the current runtime scope and does not replace `Runtime.make(...)` for application roots.

## See also

- [Program](./program)
- [RuntimeProvider](/docs/api/react/provider)
- [useModule](/docs/api/react/use-module)
