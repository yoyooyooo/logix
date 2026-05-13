---
title: Working with a Remote Orchestration Service
description: Trigger a server-side orchestration service from frontend Logix and manage state feedback.
---

Treat a server-side orchestration service as an injected remote capability. Frontend Logix owns local UI feedback, calls the remote service through a service boundary, and writes the result back into module state.

## 1. Responsibilities

- **Logix Engine**: hosts local frontend state and interaction logic. It handles immediate UI feedback and effect orchestration.
- **Remote orchestration service**: hosts cross-system business sequences that require persistence and auditability (e.g. order creation, approval chains).

From Logix’s perspective, that orchestration service is just a remote service exposed via an `Effect.Service` that you can call.

## 2. Trigger a remote service inside Logic

Triggering a backend orchestration job is the same as calling any other async API: it follows the “Action → Logic → Service → State Update” pattern.

### Service contract

Use `Context.Tag` to define a `RemoteActionRunner` service that encapsulates calling the backend service.

```typescript
// a-remote-action-runner.service.ts
import { Context, Effect } from 'effect'

// Define input/output types for running a backend orchestration job
interface RunRemoteActionInput {
  flowId: string
  input: any
}
interface RunRemoteActionOutput {
  success: boolean
  data?: any
  error?: any
}

// Define the service interface
class RemoteActionRunner extends Context.Tag('RemoteActionRunner')<
  RemoteActionRunner,
  {
    readonly run: (input: RunRemoteActionInput) => Effect.Effect<RunRemoteActionOutput, Error, any>
  }
>() {}
```

### Logic integration

In your Logic program, use `$.flow.fromAction` to listen for the triggering action, and run an Effect that calls the service inside `$.flow.run`.

```typescript
// a-feature.logic.ts
const featureLogic = Effect.gen(function* (_) {
  const submit$ = $.flow.fromAction((a) => a._tag === 'submit')

  const submitEffect = Effect.gen(function* (_) {
    const runner = yield* $.use(RemoteActionRunner) // get the service from the environment
    const current = yield* $.state.read

    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = true
    })

    // Call the backend orchestration service
    const result = yield* Effect.either(runner.run({ flowId: 'createOrder', input: current.form }))

    // Update state based on success/failure
    if (result._tag === 'Left') {
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.meta.error = result.left.message
      })
    } else {
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.data = result.right.data // write back data
      })
    }
  })

  // Use runExhaust to prevent duplicate submits
  yield* submit$.pipe($.flow.runExhaust(submitEffect))
})
```

## 3. Recommended boundary

### Recommended

- **Service encapsulation**: put all communication details in a dedicated `Effect.Service`; keep Logic focused on calling services and updating state.
- **State-driven UI**: manage `isSubmitting`, `error`, etc. in Logix `State`, not `useState` in React components.
- **Declarative concurrency**: use `runExhaust` (no duplicates) or `runLatest` (cancel old requests).

### Avoid

- **Calling directly in React components**: this bypasses Logix’s state management and debug tracing, and fragments your logic.
- **Keeping remote-operation state in component local state**: service-related state should be owned by a Logix Module to keep dataflow single and predictable.

From frontend Logix, a long-running backend orchestration job follows the same authoring pattern as any other async service call: Action drives Logic, Logic calls a service, and state records the feedback.
