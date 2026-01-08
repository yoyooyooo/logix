---
title: Suspense & Async
description: Handling asynchronous data with React Suspense.
---

# Suspense & Async

Logix supports using React Suspense **optionally** to “wait for module initialization before rendering”.

The default behavior is **non-suspending**: `useModule(Impl)` returns the module handle synchronously, and you render loading/error from state. Only when you explicitly enable `suspend: true` will `useModule` suspend the component via Suspense.

### Who is this for?

- You use React 18+ and want to handle “module init loading/failure” via Suspense.
- You plan to load data in a module’s `onInit` or via async Layer building and want to understand how it interacts with Suspense / ErrorBoundary.

### Prerequisites

- Familiar with basic React Suspense / ErrorBoundary usage.
- You’ve read [Lifecycle](../essentials/lifecycle) and understand what `onInit` means for a Module instance lifecycle.

### What you’ll get

- A safe way to add async initialization to a Module and use it with Suspense.
- A clear mental model of `useModule` behavior in sync mode vs Suspense mode.
- Clear ownership of “where errors go on init failure” and “who should render fallback”.

## 1. Async initialization

If your Module needs to load data at initialization, put it in required initialization (`onInitRequired/onInit`).

In React, distinguish two strategies:

### 1.1 Default sync mode (no suspend)

By default, `useModule(Impl)` returns the handle synchronously without waiting for initialization; therefore the init phase should not include real async waiting (e.g. `Effect.sleep` / async Layer building).

The recommended style is: render an initial state first; start async loading via `onStart` or a watcher; drive UI via state (e.g. `isLoading/error`).

```ts
const UserLogic = UserModule.logic(($) => {
  // onStart: watchers are mounted; kick off one load
  $.lifecycle.onStart($.actions.refresh())

  return Effect.gen(function* () {
    yield* $.onAction('refresh').runLatest(() =>
      Effect.gen(function* () {
        yield* $.state.update((s) => ({ ...s, isLoading: true, error: undefined }))
        const user = yield* fetchUser()
        yield* $.state.update((s) => ({ ...s, isLoading: false, user }))
      }),
    )
  })
})
```

> If callers try to “wait for completion” via `dispatch + sleep`, it usually means you need a use-case Action or an explicit completion signal. See [Managing state](../learn/managing-state).

### 1.2 Suspense mode (suspend and wait)

When you want “do not render UI before initialization completes”, use `suspend: true` from the next section. In this mode, `onInitRequired/onInit` can safely include async waiting.

```ts
const UserLogic = UserModule.logic(($) => {
  // setup-only: register init logic (scheduled by the Runtime; works with Suspense/ErrorBoundary)
  $.lifecycle.onInitRequired(
    Effect.gen(function* () {
      // Simulate async loading
      yield* Effect.sleep('1 seconds')
      const user = yield* fetchUser()
      yield* $.state.update((s) => ({ ...s, user }))
    }),
  )

  return Effect.void
})
```

## 2. Using Suspense in components

To “avoid rendering UI before initialization completes”, explicitly enable Suspense mode:

- `suspend: true`: enable Suspense.
- `key`: provide a stable key (to reuse/cache the instance and avoid suspend jitter).

```tsx
function UserProfile() {
  // suspend: true: suspends here until init completes (requires a Suspense boundary)
  const userModule = useModule(UserImpl, { suspend: true, key: 'user:current' })
  const user = useSelector(userModule, (s) => s.user)

  return <div>Hello, {user.name}</div>
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile />
    </Suspense>
  )
}
```

## 3. Loading / transitions during interactions

Often you don’t want to suspend the whole tree. Instead, you want to show loading during an Action and fold errors into state. The recommended approach: maintain `isLoading`/`error` in Logic and render them in UI.

```ts
// In Logic (inside the run section of UserLogic)
yield* $.onAction('refresh').runExhaust(() =>
  Effect.gen(function* () {
    // Mark loading start
    yield* $.state.update((s) => ({ ...s, isLoading: true }))

    // ... load data ...

    // Mark loading end
    yield* $.state.update((s) => ({ ...s, isLoading: false }))
  }),
)
```

If you want smoother UI updates, you can optionally combine with `useTransition`:

```tsx
const [isPending, startTransition] = useTransition()

const handleRefresh = () => {
  startTransition(() => {
    module.dispatch({ _tag: 'refresh' })
  })
}
```

## 4. Error boundaries (Error Boundaries)

In `suspend: true` mode, if initialization fails (e.g. async Layer build failure, required init failure, or init timeout), `useModule` throws the error to the nearest Error Boundary.

```tsx
<ErrorBoundary fallback={<div>Failed to load</div>}>
  <Suspense fallback={<div>Loading...</div>}>
    <UserProfile />
  </Suspense>
</ErrorBoundary>
```

## Next

- Learn how to handle errors: [Error handling](./error-handling)
- Debug module behavior: [Debugging and Devtools](./debugging-and-devtools)
- Test your modules: [Testing](./testing)
