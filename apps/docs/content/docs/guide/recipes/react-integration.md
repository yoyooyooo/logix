---
title: Using Logix in React
description: How to integrate Logix Runtime into a React app and use module state and actions via hooks.
---

This guide demonstrates how to integrate Logix into a typical React application from an “app developer” perspective, and how to read/update state with the components and hooks from `@logixjs/react`.

> If you only want the quick conclusion, remember two things:
>
> 1. Wrap routes/pages with `RuntimeProvider` at the app root.
> 2. In components, only use `useModule` / `useSelector` / `useDispatch`—don’t go back to `useEffect + useState` glue.

### Who is this for

- Frontend engineers integrating Logix into an existing React project, or setting up the baseline skeleton for a new project.
- People who want to understand the responsibilities along the “RuntimeProvider + useModule/useSelector/useDispatch” chain.

### Prerequisites

- Familiar with React Context and Hooks.
- Understand the basics of ModuleDef / program module / ModuleImpl / Runtime (see Quick Start and Essentials).

### What you’ll get

- A reusable integration procedure: create a Runtime, mount a Provider at the root, consume Modules in components.
- A practical understanding of when to use global Modules vs local Modules (`useLocalModule`).

## 1. Prepare a Logix Module

First define a minimal counter Module in any directory:

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

export const CounterLogic = CounterDef.logic(($) =>
  $.onAction((a): a is { _tag: 'inc' } => a._tag === 'inc').update((state) => ({ ...state, count: state.count + 1 })),
)
```

In your app entry, build a Root program module (or its `ModuleImpl`) and assemble the Runtime via `Logix.Runtime.make`:

```ts
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'
import { CounterDef, CounterLogic } from './CounterModule'

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl

export const AppRuntime = Logix.Runtime.make(CounterModule, {
  layer: Layer.empty, // you can merge service Layers here as well
})
```

## 2. Mount RuntimeProvider at the React root

In your React app root component, wrap routes/pages with `RuntimeProvider`:

```tsx
// App.tsx
import { RuntimeProvider } from '@logixjs/react'
import { AppRuntime } from './runtime'
import { Router } from './Router'

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` is responsible for:

- creating and hosting a Logix `ManagedRuntime`;
- injecting the required Context (services provided by Layers) into the Runtime;
- making the same Runtime accessible to all hooks in the subtree.

If your project already creates a Runtime elsewhere, you can pass it via the `runtime` prop directly.

## 3. Read state in components: useModule / useSelector

In any component, read module state via hooks:

```tsx
import { useModule, useSelector } from '@logixjs/react'
import { CounterDef } from '../runtime/CounterModule'

export function CounterValue() {
  // Get a module handle (with runtime / dispatch / actions, etc.)
  const counter = useModule(CounterDef)

  // Or subscribe to a single field; the component only re-renders when it changes
  const count = useSelector(counter, (s) => s.count)

  return <span>{count}</span>
}
```

In most scenarios, prefer `useSelector` over passing the full `state` to a component. It avoids unnecessary re-renders.

> `useSelector(handle, selector, equalityFn)` uses `Object.is` by default. When your selector returns arrays/objects, pass `shallow` (built into `@logixjs/react`) to avoid useless re-renders caused by “same content, different reference”.

> Note: `useModule(Module)` itself does **not** subscribe to state, so state updates will not automatically re-render the component.
>
> - For reactive rendering: use `useSelector(handle, selector)`, or use `useModule(Module, selector)` (syntactic sugar).
> - For dispatch-only usage: use `useDispatch(Module)`, or call `handle.dispatch` directly.

## 4. Dispatch actions in components: useDispatch

To change state, dispatch an object that conforms to the Action schema:

```tsx
import { useDispatch, useModule } from '@logixjs/react'
import { CounterDef } from '../runtime/CounterModule'

export function CounterButton() {
  const counter = useModule(CounterDef)
  const dispatch = useDispatch(CounterDef)

  return <button onClick={() => dispatch({ _tag: 'inc' })}>+1</button>
}
```

`useDispatch` automatically uses the current Runtime and the corresponding ModuleRuntime, and internally calls `runtime.runFork(moduleRuntime.dispatch(action))`. You don’t need to manage async or error channels manually.

### 4.1 (Optional) performance usage: batch and low-priority dispatch

In extreme high-frequency scenarios, you may run into:

- One “business intent” dispatches multiple Actions (multiple commits/notifications).
- Some updates don’t affect the immediate input feel, but trigger many component renders (e.g. live stats, summaries, non-critical hints).

You can explicitly use two “fallback knobs”:

- `dispatchBatch(actions)`: merge multiple synchronous dispatches into one observable commit.
- `dispatchLowPriority(action)`: mark the commit’s **notification** as low priority (does not change correctness). React will merge notifications more gently (still guaranteed and bounded).

> Tip: Batch is best for “multiple dispatches within one intent” when you don’t depend on intermediate derived results. For boundaries and pitfalls, see “Performance and optimization”.

In React event handlers, you can use `dispatch.batch / dispatch.lowPriority` (sugar), or call `useRuntime()` and run Effects manually (more white-box).

```tsx
import { useModule, useSelector, useDispatch } from "@logixjs/react"

export function Form() {
  const form = useModule(FormModule)
  const dispatch = useDispatch(form)

  // ✅ subscribe only to what you need to reduce unnecessary renders
  const value = useSelector(form, (s) => s.value)

  const onBulkUpdate = () => {
    dispatch.batch([
      { _tag: "setA", payload: 1 } as any,
      { _tag: "setB", payload: 2 } as any,
    ])
  }

  const onRecomputeSummary = () => {
    dispatch.lowPriority({ _tag: "recomputeSummary", payload: undefined } as any)
  }

  return (
    <>
      <input value={value} onChange={(e) => dispatch({ _tag: "change", payload: e.target.value } as any)} />
      <button onClick={onBulkUpdate}>bulk</button>
      <button onClick={onRecomputeSummary}>summary</button>
    </>
  )
}
```

## 5. Local state: useLocalModule

For state used only within a single page/component (temporary forms, wizards, etc.), you can use `useLocalModule` to create a “local module instance”:

```tsx
import { useLocalModule } from '@logixjs/react'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const LocalForm = Logix.Module.make('LocalForm', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

export function LocalFormComponent() {
  const runtime = useLocalModule(LocalForm, { initial: { text: '' } })
  const text = useSelector(runtime, (s) => s.text)
  const dispatch = useDispatch(runtime)

  return <input value={text} onChange={(e) => dispatch({ _tag: 'change', payload: e.target.value })} />
}
```

`useLocalModule` creates a new ModuleRuntime on mount, and automatically closes related Scope/resources on unmount.

> Tip: `useLocalModule` uses “resource caching + scope management” internally, and builds instances **synchronously** by default (it does not trigger Suspense).
>
> - Good for local UI state (as a replacement for `useState/useReducer`).
> - For async initialization (storage reads, requests), move async into module Logic (Effect), or lift it to `useModule(Impl)` together with `suspend/defer+preload`.

## 6. Fractal modules (imports): read/dispatch child modules under the parent instance scope

When a module composes child modules via `imports` (e.g. a page Host module imports a Query module), you often hit a practical question:

> “The child module isn’t a global singleton—it is created **together with the parent module instance**. How can the UI get the child module that belongs to **this parent instance**?”

Use either of these equivalent forms:

- `const child = useImportedModule(host, ChildModule.tag)` (explicit hook)
- `const child = host.imports.get(ChildModule.tag)` (chainable sugar; preferred)

Example:

```tsx
import { useDispatch, useModule, useSelector } from '@logixjs/react'
import { HostImpl, ChildModule } from './modules'

export function Page() {
  // use key for multi-instance scenarios (e.g. SessionA / SessionB)
  const host = useModule(HostImpl, { key: 'SessionA' })

  // ✅ resolves the child module that belongs to this host instance
  const child = host.imports.get(ChildModule.tag)

  const value = useSelector(child, (s) => s.value)
  const dispatch = useDispatch(child)

  return <button onClick={() => dispatch({ _tag: 'refresh' })}>{value}</button>
}
```

Notes:

- Don’t replace this with `useModule(ChildModule)`: that expresses “global Module (Tag)” semantics, cannot bind to a specific parent instance, and tends to mix instances in multi-instance cases.
- `host.imports.get(...)` returns a stable handle; you can call it directly in render without extra `useMemo`.
- If your goal is “multiple modals keep-alive under a route scope and destroy together when leaving the route”, apply the recipe: [Route-scoped modal keepalive](./route-scope-modals).
- If you only want to “trigger/orchestrate” child behavior (e.g. forward parent actions to child `Query.refresh`), prefer doing it in the parent module’s Logic (`$.use(ChildModule)`) or in a Link/Process, so the UI depends only on the parent module.
- If the UI needs to chain through many import layers (`host.imports.get(A).imports.get(B)`), it usually means dependency penetration is too deep: resolve once at a boundary and pass down a `ModuleRef`, or collapse into a Host-facing facade state/actions.

## 7. Migrating from useEffect / useRef to Logix

When migrating existing React code to Logix, a common question is:

> “This component uses a lot of `useEffect` / `useRef`. How do I rewrite it in a Logix style?”

A simple rule of thumb:

- **Business-logic mutable state** (affects branching/state/workflows) → model in Module `state` or as Effect flows inside Logic.
- **Refs only for DOM/third-party instances** → keep them in React (or wrap in custom hooks). Treat them as view-layer details and don’t force them into Logix.

Two typical examples follow.

### 7.1 Logic-state `useRef`: move to Module state/Logic

Many components use `useRef` to store “previous frame value” or a flag, e.g.:

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  const prevRef = useRef(count)

  useEffect(() => {
    if (count > prevRef.current) {
      console.log('up')
    }
    prevRef.current = count
  }, [count])
}
```

This `prevRef` is business state. Move it into the Module:

- add fields like `prevCount` / `trend` to Module `state`;
- maintain them in Logic via `$.onState` / `$.state.update`;
- components only subscribe to the final state and stop managing `useRef`.

The migrated structure looks like:

```ts
// 1) explicitly model “previous frame” info in module state
const CounterState = Schema.Struct({
  count: Schema.Number,
  prevCount: Schema.Number,
  trend: Schema.Union(
    Schema.Literal("flat"),
    Schema.Literal("up"),
    Schema.Literal("down"),
  ),
})

export const CounterDef = Logix.Module.make("Counter", {
  state: CounterState,
  actions: { inc: Schema.Void },
})

// 2) maintain trend/prevCount via onState in Logic
export const CounterLogic = CounterDef.logic(($) => Effect.gen(function*(){
  return $.onState((s) => s.count).mutate((draft, count) => {
    if (count > draft.prevCount) draft.trend = "up"
    else if (count < draft.prevCount) draft.trend = "down"
    else draft.trend = "flat"

    draft.prevCount = count
  }),
})
```

From a component’s perspective, it becomes “read + dispatch” only:

```tsx
function CounterView() {
  const count = useModule(CounterDef, (s) => s.count)
  const trend = useModule(CounterDef, (s) => s.trend)
  const dispatch = useDispatch(CounterDef)

  // ...
}
```

> Heuristic: if a `useRef` change affects UI or business branching, model it as Module state instead of hiding it in the component.

### 7.2 Flow-control `useRef`: move to Logic/Effect

Another common pattern is storing timers/request handles in `useRef` for debounce/cancel/retry, e.g.:

```tsx
function SearchBox() {
  const [keyword, setKeyword] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!keyword) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      fetch(`/search?q=${keyword}`)
    }, 300)
  }, [keyword])
}
```

This mutable isn’t business state; it’s a flow-control tool. It fits better in Logic/Effect:

- Module state expresses only business meaning like `keyword` / `isLoading` / `result`.
- Debounce/concurrency/cancel are expressed with Effect: `$.onState` + `Effect.sleep` / `runLatest` / `runExhaust`, etc.
- The component remains responsible only for input and rendering.

A more Logix-style version:

```ts
export const SearchModule = Logix.Module.make('Search', {
  state: Schema.Struct({
    keyword: Schema.String,
    isLoading: Schema.Boolean,
    result: Schema.optional(Schema.String),
  }),
  actions: {
    changeKeyword: Schema.String,
  },
})

export const SearchLogic = SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 1) listen to keyword changes, debounce + request
    yield* $.onState((s) => s.keyword)
      .debounce(300)
      .runLatest((keyword) =>
        Effect.gen(function* () {
          if (!keyword) {
            yield* $.state.mutate((draft) => {
              draft.result = undefined
              draft.isLoading = false
            })
            return
          }

          yield* $.state.mutate((draft) => {
            draft.isLoading = true
          })

          const result = yield* searchApi(keyword)

          yield* $.state.mutate((draft) => {
            draft.result = result
            draft.isLoading = false
          })
        }),
      )
  }),
)
```

The React component becomes:

```tsx
function SearchBox() {
  const keyword = useModule(SearchModule, (s) => s.keyword)
  const isLoading = useModule(SearchModule, (s) => s.isLoading)
  const result = useModule(SearchModule, (s) => s.result)
  const dispatch = useDispatch(SearchModule)

  // onChange only dispatches changeKeyword; no timerRef needed
}
```

> Heuristic: `useRef` used purely for flow control (timers, AbortController, etc.) should move to Logic/Effect and be expressed via `$.onState` + Effect’s concurrency primitives.

### 7.3 `useRef` you can keep: true DOM/instance handles

During migration, a small subset of `useRef` can stay in components:

- DOM handles like `inputRef` + `inputRef.current?.focus()`
- third-party UI component instances (charts/maps) used via imperative APIs
- no business state, no complex flow control

Recommended approach:

- wrap them into dedicated UI components or small custom hooks (e.g. `useAutoFocus`, `useChart`), so business components trigger “when” rather than implement “how”.
- business semantics (when to focus, where chart data comes from) still live in Module/Logic via state and Actions.

In short: business `useRef` belongs in Logix; pure UI/DOM `useRef` can stay in React (preferably encapsulated).

### 7.4 Lifecycle `useEffect`: express via local modules

Some `useEffect` exists mainly to express “do something while this component is mounted, and clean up on unmount”, e.g.:

```tsx
function Widget() {
  useEffect(() => {
    startSession()
    return () => stopSession()
  }, [])

  return <div>...</div>
}
```

This is really a **view session** lifecycle. It maps well to a “local Module” whose lifecycle is managed via `$.lifecycle.onInit/onDestroy`:

- create a dedicated `WidgetModule` + `WidgetImpl` (or use `useLocalModule`);
- in Logic:
  - `$.lifecycle.onInit(...)`: start subscriptions/polling/initial requests at first mount;
  - `$.lifecycle.onDestroy(...)`: stop subscriptions/clean up when the last holder unmounts;
- in the component, use `useModule(WidgetImpl)` or `useLocalModule(WidgetModule, { initial, logics })`, instead of hand-written `useEffect`.

Benefits:

- components become “dumb”: render + dispatch intents; lifecycle details live in Logic, easy to reuse and test.
- lifecycle semantics are explicit: `onInit/onDestroy` are tied to the local ModuleRuntime session, not a specific React component instance.
- it matches the Logix mental model: **component lifecycle = local module session lifecycle**.

The `useEffect` left in components is usually only:

- translating browser/third-party events into Actions (e.g. scroll listeners dispatching Actions)
- rare pure UI side effects (e.g. updating `<title>`) unrelated to business workflows

## 8. Synchronous vs async ModuleImpl modes (advanced)

In real projects, prefer exposing module implementations via `ModuleImpl`, and consume them in React via `useModule(Impl)`.  
`@logixjs/react` provides two modes for ModuleImpl:

1. **Default: synchronous mode (simple, direct)**

```tsx
// CounterModule is produced by CounterDef.implement(...) (program module, with `.impl`)
import { useModule, useSelector, useDispatch } from '@logixjs/react'
import { CounterModule } from '../runtime/counter'

export function LocalCounter() {
  // each component instance holds its own local ModuleRuntime for CounterModule
  const runtime = useModule(CounterModule)
  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)

  return <button onClick={() => dispatch({ _tag: 'inc', payload: undefined })}>count: {count}</button>
}
```

- Use when: module construction is synchronous (in-memory only; dependencies already injected via Layer).
- Pros: intuitive behavior, easy debugging; works for most page/component-level state needs.

2. **Optional: Suspense async mode (requires explicit key)**

When ModuleImpl construction depends on async initialization (IndexedDB / remote config), enable `suspend: true`:

```tsx
import { useId, Suspense } from 'react'
import { useModule, useSelector } from '@logixjs/react'
import { AsyncImpl } from '../runtime/asyncModule'

function AsyncWidgetInner({ userId }: { userId: string }) {
  const id = useId()

  const runtime = useModule(AsyncImpl, {
    suspend: true,
    key: `AsyncWidget:${id}`, // explicitly provide a stable key
    deps: [userId], // rebuild ModuleRuntime when deps change
  })

  const state = useSelector(runtime, (s) => s.state)
  return <div>{state}</div>
}

export function AsyncWidget(props: { userId: string }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncWidgetInner {...props} />
    </Suspense>
  )
}
```

Why does async mode require an explicit `key`?

- Under StrictMode / concurrent rendering / uncommitted branches, render count and order can differ from intuition.
- For the internal “resource cache”, a **caller-controlled stable identity** is required to reuse the same async resource across retries.
- Therefore, when `suspend: true` is enabled, `useModule(Impl)` requires a stable `key`. A common pattern:
  - use `useId()` as a component-level prefix,
  - append a business id (like `userId` / `formId`).

## 9. Session-level state retention (Session Pattern)

In real products, a common requirement is:

> “After switching tabs/pages (or briefly leaving a page), users want to come back and see the previous page state (filters, pagination position, temporary results, etc.).”

In Logix + React, express this with **the same ModuleImpl + an explicit `key` + optional `gcTime`**:

- **Component-level (default)**: `useModule(Impl)` creates a runtime per component instance. When it unmounts, state is released after a short window (default ~500ms, to tolerate StrictMode jitter; no explicit config needed).
- **Session-level**: `useModule(Impl, { key, gcTime })` uses `key` to identify a “session state” within the same Runtime. After unmount, it stays alive for a while; if a component remounts with the same `key` within the window, it reuses the same state.

A typical tab implementation:

```tsx
function TabContent({ tabId }: { tabId: string }) {
  const runtime = useModule(PageImpl, {
    key: `tab:${tabId}`,
    gcTime: 10 * 60 * 1000, // reuse state if the same key is used again within 10 minutes
  })

  const state = useSelector(runtime, (s) => s)
  const dispatch = useDispatch(runtime)

  // ...
}
```

In this pattern:

- within the same `ManagedRuntime`, `useModule(Impl, { key })` with the same `key` shares one `ModuleRuntime`;
- after all components using that `key` unmount, state is not dropped immediately; it’s retained according to `gcTime` (default comes from the RuntimeProvider config snapshot; override via Runtime Layer `ReactRuntimeConfig.replace` or ConfigProvider. Without explicit config it’s ~500ms);
- if remounted within the window with the same `key`, the session state is fully reused; if no one uses it past the window, it’s cleaned up automatically.

## 10. Global Module vs local ModuleImpl: an execution-time mental model

In React integration, two similar-looking forms have different semantics:

- `useModule(CounterImpl)` — you pass a “module object with `.impl`” (creates a local instance by default).
- `useModule(CounterDef)` or `useModule(CounterDef.tag)` — you pass a module definition or `ModuleTag` (connects to a global instance).

Use this rule:

> Whoever creates the Runtime manages lifecycle. `useModule` only “creates” when you pass a handle with `.impl` (module object / ModuleImpl).

### 10.1 App-level / global Module (Runtime.make + useModule(Module))

Typical code:

```ts
// runtime.ts
export const CounterModule = CounterDef.implement({ initial: { count: 0 }, logics: [CounterLogic] })
export const CounterImpl = CounterModule.impl
export const AppRuntime = Logix.Runtime.make(CounterModule, { layer: Layer.empty })
```

```tsx
// App.tsx
export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}

// Any child component
function CounterValue() {
  const count = useModule(CounterDef, (s) => s.count)
  // ...
}
```

In this mode:

- the `ModuleRuntime` for `CounterModule` is created and hosted by `Runtime.make` in the app-level Runtime;
- `useModule(CounterDef)` (or `useModule(CounterDef.tag)`) only connects to that existing global ModuleRuntime; it does not create a new instance;
- the Counter Logic starts roughly when the app Runtime is initialized (usually once at app startup).

Good for:

- “initialize once per app lifecycle” state such as current user, global config, app-level routing state;
- state that should naturally be shared by multiple routes/components without `key`-based splitting.

### 10.2 Component-level / session-level Module (useModule(Impl, options?))

Typical code:

```tsx
function LocalCounter({ sessionId }: { sessionId: string }) {
  const runtime = useModule(CounterModule, {
    key: `counter:${sessionId}`,
    gcTime: 10 * 60 * 1000,
  })
  // ...
}
```

In this mode:

- `useModule` creates/reuses a ModuleRuntime via an internal resource cache keyed by `(Impl, key, depsHash)`;
- the first time a `key` appears, the component is the “creator”, and corresponding Logic starts here;
- after all components holding that `key` unmount, the runtime is destroyed after the `gcTime` window, and `onDestroy` is triggered.

Good for:

- tabs/sessions: each tab/page instance needs its own state, and you want it kept alive for a while;
- local wizards/forms: naturally end when the component tree is destroyed, and should not stay resident.

### 10.3 Choosing between global vs local

- **Local form/wizard state used in one place** → component-level `useModule(Impl)` or `useLocalModule`.
- **State that should be kept alive across tab/page switches** → session-level `useModule(Impl, { key, gcTime })`.
- **Long-lived global state (current user, global config)** → app-level Root module + `Logix.Runtime.make`, then read via `useModule(module definition or ModuleTag)` in React.

## 11. Next steps

- Back to the overview: [Composability map](../advanced/composability)
- For more Logix APIs, continue to [API reference](../../api/index).
- For more complex integration scenarios (multi-module collaboration, async flows, remote services), see `examples/logix-react` in this repository.
