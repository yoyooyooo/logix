---
title: Error handling
description: Error-handling strategy in Logix.
---

In Logix, a good default is to handle failures in layers:

- **Local**: expected, recoverable errors stay in Effect’s error channel `E`; catch them close to where they happen and convert them into state/return values.
- **Module**: unhandled defects go through `$.lifecycle.onError` as a “last report” (logging/monitoring/fallback cleanup).
- **Global (App/React)**: in React integration, use `RuntimeProvider.onError` as the single entry into your reporting system, instead of implementing one per module.

Two other points are critical:

- **Wiring failures** (missing provider/imports) are configuration errors; fix the wiring per the error message instead of swallowing them in business logic.
- **Cancellation/interrupt** is not an error; it should not enter error fallback chains or alerting systems.

### Who is this for?

- You already use Logix in a project and want a systematic “expected business errors vs system defects” strategy.
- You have basic understanding of Effect’s error channel (`E`) and React Error Boundaries, and want a unified approach.

### Prerequisites

- You’ve read [Effect basics](../essentials/effect-basics) or have a basic intuition for `Effect.gen`.
- You know `$.lifecycle.onError` is used to report “unhandled failures” as a fallback.

### What you’ll get

- A practical layered scheme for “expected errors” vs “defects”.
- Examples of coordinating error handling across Module, Runtime, and UI layers in Logix+React.

## 1. Expected errors

Expected errors are part of business logic, such as “user not found” or “network timeout”. Handle them via Effect’s error channel (`E`).

```ts
const LoginLogic = LoginModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('login').run(({ payload: credentials }) =>
      Effect.gen(function* () {
        // Attempt login
        yield* loginApi(credentials).pipe(
          // Catch a specific error
          Effect.catchTag('InvalidPassword', () => $.state.update((s) => ({ ...s, error: 'Invalid password' }))),
          // Catch other errors
          Effect.catchAll(() => $.state.update((s) => ({ ...s, error: 'Login failed' }))),
        )
      }),
    )
  }),
)
```

## 2. Defects

Defects are code bugs or unrecoverable system failures. Logix catches defects inside Logic automatically to prevent the whole app from crashing.

### The `onError` hook

You can handle unhandled errors uniformly via `$.lifecycle.onError` (**setup-only registration**):

```ts
const AppLogic = AppModule.logic(($) => ({
  setup: Effect.sync(() => {
    $.lifecycle.onError((cause, context) =>
      Effect.logError({
        message: "Unhandled module error",
        cause,
        context, // includes moduleId/instanceId/phase/hook, etc.
      }),
    )
  }),
  run: Effect.void,
}))
```

## 3. Global reporting in React (`RuntimeProvider.onError`)

In React apps, use `RuntimeProvider.onError` as the single entry for “Layer build failures / unhandled module failures / error-level diagnostics” into your reporting system:

```tsx
<RuntimeProvider
  runtime={runtime}
  onError={(cause, context) =>
    Effect.logError({
      message: "Runtime error",
      cause,
      context,
    })
  }
>
  {children}
</RuntimeProvider>
```

## 4. Error Boundary integration

In Suspense mode (`useModule(..., { suspend: true, key })`), if initialization fails, the error is thrown into the React tree and can be caught by an Error Boundary.

```tsx
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <MainContent />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## 5. Recovery strategy (retry)

Effect provides powerful retry mechanisms:

```ts
// Retry up to 3 times
yield* fetchApi().pipe(Effect.retry({ times: 3 }))

// Exponential-backoff retry
yield*
  fetchApi().pipe(
    Effect.retry({
      schedule: Schedule.exponential('100 millis'),
    }),
  )
```

## Next

- Debugging module behavior: [Debugging and Devtools](./debugging-and-devtools)
- Testing your modules: [Testing](./testing)
- Common patterns and best practices: [Common patterns](../recipes/common-patterns)
