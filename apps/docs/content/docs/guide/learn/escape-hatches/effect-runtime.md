---
title: Working with Effect Flow Runtime
description: Trigger server-side Flows from frontend Logix and manage state feedback.
---

This guide explains how to trigger server-side Flows (Effect Flow Runtime) from frontend Logix, and how to manage state feedback.

## 1. Responsibilities

- **Logix Engine**: hosts local frontend state and interaction logic. It handles immediate UI feedback and effect orchestration.
- **Effect Flow Runtime**: hosts cross-system business workflows that require persistence and auditability (e.g. order creation, approval flows).

From Logix’s perspective, Effect Flow Runtime is just a remote service exposed via an `Effect.Service` that you can call.

## 2. Trigger a Flow inside Logic

Triggering a backend Flow is the same as calling any other async API: it follows the “Action → Logic → Service → State Update” pattern.

### Step 1: Define a service contract

Use `Context.Tag` to define a `FlowRunner` service that encapsulates calling the backend Flow.

```typescript
// a-flow-runner.service.ts
import { Context, Effect } from 'effect'

// Define input/output types for running a backend Flow
interface RunFlowInput {
  flowId: string
  input: any
}
interface RunFlowOutput {
  success: boolean
  data?: any
  error?: any
}

// Define the service interface
class FlowRunner extends Context.Tag('FlowRunner')<
  FlowRunner,
  {
    readonly run: (input: RunFlowInput) => Effect.Effect<RunFlowOutput, Error, any>
  }
>() {}
```

### Step 2: Call the service inside Logic

In your Logic program, use `$.flow.fromAction` to listen for the triggering action, and run an Effect that calls the service inside `$.flow.run`.

```typescript
// a-feature.logic.ts
const featureLogic = Effect.gen(function* (_) {
  const submit$ = $.flow.fromAction((a) => a._tag === 'submit')

  const submitEffect = Effect.gen(function* (_) {
    const runner = yield* $.use(FlowRunner) // get the service from the environment
    const current = yield* $.state.read

    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = true
    })

    // Call the backend Flow
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

## 3. Best practices and anti-patterns

### Recommended

- **Service encapsulation**: put all communication details in a dedicated `Effect.Service`; keep Logic focused on calling services and updating state.
- **State-driven UI**: manage `isSubmitting`, `error`, etc. in Logix `State`, not `useState` in React components.
- **Declarative concurrency**: use `Flow` APIs like `runExhaust` (no duplicates) or `runLatest` (cancel old requests).

### Avoid

- **Calling directly in React components**: this bypasses Logix’s state management and debug tracing, and fragments your logic.
- **Keeping Flow runtime state in component local state**: workflow-related state should be owned by a Logix Module to keep dataflow single and predictable.

With this approach, calling a complex long-running backend workflow and calling a simple query API are architecturally isomorphic in frontend Logix — both unify under the same `Effect` + `Flow` model.
