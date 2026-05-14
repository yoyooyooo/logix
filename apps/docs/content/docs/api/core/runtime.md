---
title: Runtime
description: Execution container, one-shot runner, batch helper, and verification control plane.
---

`Runtime` owns execution. It creates runtime containers, runs programs, batches host work, and produces control-plane reports.

## `Runtime.make`

```ts
const runtime = Logix.Runtime.make(Program, {
  label: "AppRuntime",
  layer: AppLayer,
  devtools: true,
})
```

Use this for React applications and long-lived runtimes.

## `Runtime.run`

```ts
await Logix.Runtime.run(Program, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    return yield* module.getState
  }),
)
```

Use this for tests, CLI tasks, and one-shot execution. It boots the program, runs `main`, then disposes the runtime.

## Control plane

```ts
const check = yield* Logix.Runtime.check(Program)
const trial = yield* Logix.Runtime.trial(Program, trialOptions)
```

`check` is static. `trial` runs a diagnostic scenario. Both return `VerificationControlPlaneReport`.

## Batch

`Runtime.batch(fn)` groups synchronous host work in the current host tick. It is an advanced helper, not a replacement for actions.
