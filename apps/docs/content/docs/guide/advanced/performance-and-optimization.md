---
title: Performance and Optimization
description: Tune Logix Runtime and DevTools observability strategies to keep good performance in complex scenarios.
---

# Performance and Optimization

Logix Runtime is “observability-first” by default.
In development it records full state transactions, trait behavior, and debug events, and DevTools provides a timeline and time travel.
In production it automatically converges to a lighter observability mode.

This page provides an actionable performance tuning playbook from the perspective of everyday application development.

### Who is this for

- You’re already using Logix Runtime / `@logixjs/react`, and DevTools is enabled.
- You want good responsiveness in high-frequency interaction, complex forms, or long-list scenarios.

### Prerequisites

- Understand basic usage of `Logix.Module` / `Module.logic` / `Module.live`.
- Know how to create a Runtime via `Logix.Runtime.make`, and use `RuntimeProvider` / `useModule` in React.

### What you’ll get

- Understand where the main costs of an interaction usually come from.
- Control observability overhead via `stateTransaction.instrumentation` and DevTools settings.
- A layered optimization checklist for “high trait density / lots of watchers”.

## 0. Remember 5 keywords

1. **Transaction window**: the write aggregation boundary of a synchronous entry; at most one outward commit at window end.
2. **Impact scope (`dirtySet`)**: which fields were affected; it determines incremental derive/validation range and attribution quality.
3. **Derivation closure**: the synchronous converge chain before commit (derive/validate write-backs), ideally kept within the same transaction.
4. **Visibility scheduling (`priority`)**: the UI notification cadence of a commit (normal/low), used to reduce unnecessary renders (without changing final state).
5. **Evidence chain**: every commit can explain “who triggered / what was affected / why it was scheduled this way / whether it degraded”.

### Coarse cost model (what you’re paying for)

- **Number of transactions**: bounds UI notifications and derive/validation frequency.
- **`dirtySet` quality**: more precise means more incremental paths; more `dirtyAll` means more full recomputation degradation.
- **Derive/validation scale**: more rules and deeper dependencies rely more on incremental and plan cache reuse.
- **React render fan-out**: coarse subscriptions and unstable list identity increase render pressure.
- **Module initialization**: build/setup/install at startup (including trait aggregation/merge/install) impacts first paint / first availability.
- **Diagnostics level**: more evidence improves explainability, but should have a predictable cost.

### Cost model for trait composition (`$.traits.declare` / Module `traits`)

If you use many traits in a module (both Module-level `traits` and `$.traits.declare` inside Logic setup), initialization does more work:

1. **Collect**: aggregate module-level declarations and each logic unit’s declarations into one set.
2. **Deterministic merge**: merge into the “final trait set” with stable rules (same input does not drift by composition order).
3. **Consistency checks**: detect duplicate `traitId`, mutual exclusion / prerequisites; failures surface before runtime.
4. **Freeze + install**: freeze traits after setup, then install corresponding behavior Programs during initialization.

Common tuning levers:

- **Control scale**: more traits slows init; prioritize extracting truly reusable rules into shared Logic/Patterns, keep the rest local.
- **Stable identity**: provide stable `logicUnitId` for reusable Logic to avoid provenance drift and replay/compare difficulty.
- **Observe on demand**: keep diagnostics off (default or explicit) on performance-sensitive paths; switch to `light/full` when debugging, and compare evidence packages via `digest/count`.

### A general optimization ladder (from default to split/refactor)

When you hit performance issues, proceed in this order (later steps cost more but are more controllable):

1. **Default**: start with default configs and declarative style; keep semantics clear.
2. **Observe**: enable DevTools and export evidence; first classify the bottleneck: transactions / dirtySet / derive scale / render fan-out / init.
3. **Narrow writes**: prefer `$.state.mutate` / `Module.Reducer.mutate` / `Module.Reducer.mutateMap` so Runtime can capture a precise impact scope; avoid meaningless full-tree setState.
4. **Stable identity**: provide stable business ids for list items / logic units (e.g. list `trackBy`, `logicUnitId`) to reduce drift and avoid recompute/re-render.
5. **Targeted overrides**: only override hotspots (observability level, scheduling/budget thresholds, etc.), and lock the regression window with evidence.
6. **Split/refactor**: if a single module/logic becomes too dense, split Module / Logic / trait rules to reduce complexity and improve diagnosability.

## 1. Where does the cost of one interaction go?

In Logix, a typical user interaction (typing/clicking) goes through:

1. **Action dispatch**: `dispatch(action)` starts a StateTransaction.
2. **In-transaction logic**: reducer / trait / middleware reads/writes state multiple times within the transaction.
3. **State commit**: the transaction `commit`s; outwardly, state is written once and subscribers are notified once.
4. **React render**: affected components re-render based on selector results.
5. **Debugging & DevTools**: record debug events and update DevTools timeline/views.

In most cases:

- **The biggest cost is React rendering and your own business logic.**
- Runtime + debugging overhead mainly comes from:
  - number of watchers/traits (higher fan-out means more work per event),
  - observability strategy (whether to record patches/snapshots/fine-grained events),
  - DevTools depth mode and how many events it renders.

The next sections explain how to control these costs.

## 2. Control StateTransaction observability overhead

Internally, Logix uses `StateTransaction` to wrap all state evolution within a logic entry, and it guarantees:

- **one entry = one transaction**
- **one transaction = at most one outward commit**

The main knob is `stateTransaction.instrumentation`:

- `full`: record more structured information (patches/snapshots, better explainability)
- `light`: record less (lower overhead)

Example: set an app-level default strategy on the Runtime:

```ts
import * as Logix from '@logixjs/core'

// App-level default observability strategy
const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    instrumentation: 'full', // or 'light'
  },
})
```

For a few high-frequency modules (dragging/animation/heavy input forms), you can downgrade to `"light"` per module:

```ts
// HeavyFormDef = Logix.Module.make(...)
export const HeavyFormModule = HeavyFormDef.implement({
  // other config omitted
  stateTransaction: {
    instrumentation: 'light',
  },
})

export const HeavyFormImpl = HeavyFormModule.impl
```

Priority order:

1. **ModuleImpl config** (explicit on the module)
2. **Runtime.make config** (runtime-level default)
3. **Environment default**: `"full"` in non-production (`NODE_ENV !== "production"`), `"light"` in production

> Tip: when investigating performance, temporarily switch a module or the whole Runtime to `"light"` and compare interaction latency and React render counts to determine whether observability is part of the budget.

### 2.3 (Optional) control converge strategy & budgets

If your scenario has lots of derived fields/linkage/computed values and each interaction triggers substantial linkage computation, beyond observability you can also use the converge scheduling control plane for:

- quick mitigations when regressions occur
- experimenting with better defaults at page/module scope (with rollback)

See: [Converge scheduling control plane](./converge-control-plane)

## 3. Use DevTools settings to control noise

When DevTools is enabled, overhead also depends on DevTools settings. Common switches:

- `mode: "basic" | "deep"`
  - `basic`: shows coarse-grained events (Action/State/Service), hides trait details and time-travel controls; good for day-to-day work.
  - `deep`: shows trait-level events, React render events, and time-travel buttons; good for deep debugging.
- `showTraitEvents` / `showReactRenderEvents`
  - In high-frequency rendering or heavy-trait scenarios, you can temporarily disable a class of events to reduce timeline noise.
- `eventBufferSize`
  - controls how many events DevTools keeps internally (default ~500)
  - you can temporarily increase it for extreme debugging, but avoid keeping it in the thousands long-term to prevent DevTools itself from using too much memory.

### 3.1 Runtime-level knobs (besides the converge scheduling control plane)

If you want more “deterministic” control (not just UI toggles), tune Runtime config:

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  // if devtools is omitted or set to false, DevTools observability is not enabled (cheaper)
  devtools: {
    bufferSize: 500, // DevTools event window length (bigger uses more memory)
    observer: false, // disable effectop trace (enable when needed)
    sampling: { reactRenderSampleRate: 0.1 }, // optional: lower sampling rate for React render events
  },
})
```

Two commonly-confused switches:

- **Diagnostics level** (`Debug.diagnosticsLevel`): controls “whether/how much debug events are emitted” (`off` is near-zero overhead but blind; `sampled` keeps tail-latency tracing at low cost; `light/full` is for debugging and alignment).
- **Transaction instrumentation** (`stateTransaction.instrumentation`): controls whether a transaction records structured info like patches/snapshots (`full` is better for debugging, `light` is cheaper).

#### Diagnostics levels: off / sampled / light / full (how to choose)

Diagnostics level affects how many debug events are generated/retained for export surfaces like DevTools / TrialRun.
It does not change business semantics, but it affects “how much evidence you can see” and “how much extra overhead you pay”.

- `off`: near-zero overhead, good for benchmarks/extreme performance checks; you lose most explainability (DevTools/evidence packages become sparse).
- `sampled`: keeps debugging capability at low cost (especially for hotspots in the trait converge chain). Runtime uses **deterministic sampling per transaction**, and only emits Top-K hotspot summaries for converge chains in sampled transactions (payload stays slim).
- `light`: emits slim events for every transaction, good as a default “observable but not too expensive” tier; it doesn’t include step-level hotspot summaries.
- `full`: the most complete and the most expensive; use it for short, deep debugging and explanation-chain alignment.

If your main concern is “converge linkage jank in complex forms/long lists”, prefer `sampled` first; only switch to `full` when the summary is insufficient.

Example: enable `sampled` on a Runtime with sampling frequency and Top-K cap:

```ts
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Logix.Debug.devtoolsHubLayer({
      diagnosticsLevel: 'sampled',
      traitConvergeDiagnosticsSampling: { sampleEveryN: 32, topK: 3 },
    }),
  ),
})
```

A common practice:

1. When first developing a module: `instrumentation = "full"` + `mode = "deep"` to fully observe transactions and trait behavior.
2. After the module stabilizes: switch back to `mode = "basic"` and keep only key events.
3. When performance issues appear:
   - use Overview Strip and Timeline in `"deep"` to locate the noisiest window,
   - then combine `"light"` instrumentation and `showReactRenderEvents` to validate whether it’s mostly render fan-out or trait event volume.

### 3.2 TrialRun: offline evidence and IR collection (for diffs/regression)

When you need “refactor without regression” comparisons, prefer **TrialRun** to run a program in a controlled environment and export machine-processable evidence:

- You can collect key evidence **without opening DevTools UI**.
- You can explicitly control `diagnosticsLevel` and `maxEvents` to avoid observer effects.
- `EvidencePackage.summary` answers “what runtime strategies/overrides were enabled for this instance”, and provides comparable IR summaries.

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

const result = await Effect.runPromise(
  Logix.Observability.trialRun(program, {
    runId: "perf-check-1",
    source: { host: "node", label: "trial-run" },
    diagnosticsLevel: "light",
    maxEvents: 200,
  }),
)

// summary.runtime.services: evidence of runtime strategies and override provenance (slim, serializable)
// summary.converge.staticIrByDigest: static IR summaries (deduped by digest, easy to diff)
console.log(result.evidence.summary)
```

Practical steps:

1. Run once with the same inputs to produce a “baseline evidence package” (save it for comparison).
2. Run again after changes with the same inputs, and compare key fields and event density in `summary`.
3. If you only care about performance (not explainability), prefer `diagnosticsLevel: "off"` + smaller `maxEvents` for a quick check.

## 4. Watcher and trait granularity guidelines

Logix allows many `$.onAction` / `$.onState` watchers and trait nodes within one Module.
From experience, these ballpark numbers can serve as guidance:

- Watcher count per Module / per Logic block:
  - about **≤ 128**: usually “safe”; interaction latency is mostly decided by business logic and React.
  - about **256**: watch for many watchers firing at once and handlers doing heavy work.
  - **≥ 512**: prefer splitting Module/Logic or merging rules instead of stacking more watchers.
- Trait granularity:
  - for high-frequency fields (e.g. form inputs), avoid too many layers of computed/link nodes;
  - for statistics only needed on submit, consider computing during submit logic instead of maintaining via traits on every input;
  - inspect node density around a hot field in TraitGraph; if a hotspot field has too many attached traits, simplify first.

Common simplification tactics:

- merge similar rules into structured matching within one watcher instead of duplicating many similar watchers;
- move recomputation unrelated to UI down into Services or dedicated Flows instead of doing it synchronously in traits/watchers;
- for long lists/virtual scrolling, prefer list virtualization components to reduce the number of nodes React needs to re-render per state change.

### 4.1 Writing high-frequency watchers

If a page has many `$.onAction / $.onState` watchers (or a few but extremely high-frequency ones), follow these rules of thumb:

- **Treat watchers as long-lived subscriptions**: each `.run* / .update / .mutate / .runFork` starts a long-running listener. More watchers means a longer processing chain per event.
- **Keep handlers fast (especially for high-frequency events)**:
  - push heavy computation/I/O into the Effect body, and use appropriate execution strategies to cap throughput (see next).
  - if dispatch feels “blocked/janky” in high-frequency scenarios, event production is likely outpacing consumption—prefer debounce/throttle, merge watchers, or reduce per-handler synchronous work.
- **Choose the right `.run*` strategy for the semantics**:
  - **search/suggest/input-driven requests**: `debounce + runLatest` (cancel previous requests on new input; keep only the latest).
  - **submit/save/idempotent ops**: `runExhaust` (ignore new events while busy; avoid duplicate submits).
  - **allow concurrency but cap it**: when using `runParallel`, remember concurrency is constrained by the Runtime’s concurrency policy; avoid assuming “unbounded parallelism” in performance-sensitive modules (see [Concurrency control plane](./concurrency-control-plane)).
- **Prefer reducers over watchers when possible**: if an Action only performs pure synchronous state updates, prefer `$.reducer(...)` (or Module Reducer) and reserve watchers for I/O or complex orchestration.
- **Make `onState` selectors return stable values**:
  - selector dedupe usually relies on value/reference equality; if you return a new object/array every time, it’s almost always considered “changed”, amplifying watcher pressure.
  - prefer primitives, stable references, or narrower selectors (subscribe only to what you truly need).

## 5. High-frequency performance checklist

When a page “feels janky”, check in this order:

1. **Confirm transaction semantics**
   - In DevTools, verify a single interaction produces only one `state:update` event.
   - If one interaction causes multiple commits, first find and fix duplicate state writes.
2. **Observe React render counts**
   - Switch the Timeline to `react-render` and see how many component renders one transaction triggers.
   - Combine selector optimization (subscribe only to necessary fields) and list virtualization to reduce render fan-out.
3. **Adjust observability strategy**
   - Locally switch the target module or Runtime to `instrumentation = "light"` and compare performance.
   - If the difference is significant, observability is consuming part of the budget; in DevTools, consider disabling deep events or shrinking the event window.
4. **Review watcher / trait counts**
   - Identify high-frequency Actions/fields and the nearby watcher and trait node counts.
   - Merge rules or move logic down as suggested above to shorten the per-event processing chain.
5. **Make trade-offs from the business perspective**
   - For modules that truly require strong observability (e.g. financial flows, risk control), keep `"full"` instrumentation and fine-grained traits.
   - For display-only modules that just need to be fast, use `"light"` + `mode = "basic"` and reserve budget for UI and business logic.

## 6. Explicit batching and low-priority updates (high-frequency fallback)

If you hit “very frequent input / too many synchronous dispatches / high render pressure”, you can choose two fallback strategies without changing business correctness:

- **Explicit batch**: `dispatchBatch([...])` merges multiple synchronous dispatches into one outward commit.
- **Low-priority notifications**: `dispatchLowPriority(action)` keeps semantics but makes UI notifications merge more gently.

> Note: lowPriority is for UI notification cadence, not for delaying critical state semantics. Latency-sensitive UI (like dragging feedback) should not use lowPriority.

By default, low-priority notifications are roughly “deferred to the next frame” (~16ms) and have a maximum delay bound (default 50ms). You can tune it via:

- `logix.react.low_priority_delay_ms`
- `logix.react.low_priority_max_delay_ms`

### 6.3 Migration guide (old patterns → new modes)

1. **Multiple synchronous dispatches → `dispatchBatch`**
   - Old: `dispatch(a1)`, `dispatch(a2)`… each produces an observable commit.
   - New: collapse multiple dispatches within one “business intent” into `dispatchBatch([...])`.

2. **Manual setTimeout/raf batching → `dispatchLowPriority`**
   - Old: manually batch dispatch/setState in UI with `setTimeout` / `requestAnimationFrame`.
   - New: explicitly mark “deferrable” updates as lowPriority and let Runtime + React adapter handle scheduling and bounds.

3. **Full update/setState → `Module.Reducer.mutate/mutateMap` / `$.state.mutate` / `$.onAction(...).mutate`**
   - Old: full-tree replacements like `(s) => ({ ...s, a: s.a + 1 })` or `$.state.update((s) => ({ ...s, a: s.a + 1 }))` are hard to attribute at field-level, and derived/validation is more likely to degrade to full paths.
   - New: prefer `Logix.Module.Reducer.mutate(...)` / `Logix.Module.Reducer.mutateMap({...})`, `$.state.mutate(...)`, or `$.onAction(...).mutate(...)` so Runtime can auto-capture “change paths” for incremental derive/validation.

For example, define draft-style reducers directly in `Module.make` (recommended):

```ts
immerReducers: {
  inc: (draft) => {
    draft.count += 1
  },
  add: (draft, action) => {
    draft.count += action.payload
  },
},
```

If you want to keep the `reducers` field, you can wrap them in bulk via `Logix.Module.Reducer.mutateMap({...})`:

```ts
reducers: Logix.Module.Reducer.mutateMap({
  inc: (draft) => {
    draft.count += 1
  },
  add: (draft, action) => {
    draft.count += action.payload
  },
}),
```

Type tip: if `draft/action` degrade to `any` in IDE inside `mutateMap`, prefer `immerReducers`; or use `satisfies Logix.Module.MutatorsFromMap<typeof State, typeof Actions>` to explicitly “attach” type constraints.

If you need both “normal reducers” and draft reducers, you can provide both `immerReducers` and `reducers` (same key uses `reducers` as the winner):

```ts
immerReducers: {
  inc: (draft) => {
    draft.count += 1
  },
},
reducers: {
  reset: (state) => ({ ...state, count: 0 }),
},
```

When you see the `state_transaction::dirty_all_fallback` diagnostic in dev, it usually means you should apply migration step #3.

## 7. Form / Query-specific recommendations

If your page is dominated by “complex form linkage” or “parameterized queries”, these tips often help:

1. **Treat `deps` as a contract, not a hint**
   - If you see `state_trait::deps_mismatch` warnings in dev, fix `deps` first:
     - missing deps can cause “no update when it should update”;
     - overly fine deps can cause “recompute on irrelevant changes”.
   - If a rule truly depends on an entire object, declare a coarser dep (e.g. depend on `profile` instead of `profile.name`).

2. **Use `validateOn / reValidateOn` to control validation workload per keystroke**
   - Default is “two-phase”: before first submit it tends to validate on submit; after first submit it incrementally validates on change/blur.
   - For cross-row validation, complex deps, or high-frequency forms: prefer a more conservative `validateOn` (e.g. only `"onSubmit"`), and use `controller.validatePaths(...)` to precisely trigger local validation when needed.

3. **Watch for budget-triggered degradation in traits**
   - If you see warnings like `trait::budget_exceeded`, it means linkage computation exceeded budget for an interaction.
   - Common treatments:
     - move heavy computation down into service calls or async tasks (turn synchronous derive into cached results);
     - add equivalence checks to computed values (avoid write-back when nothing changes);
     - split rules around hotspot fields to reduce per-interaction derive fan-out.

4. **Subscribe only to the state slices you truly need in React**
   - Avoid subscribing to whole `values/errors`; prefer a derived view state selector (e.g. `canSubmit/isSubmitting/isValid/isDirty/submitCount`).
   - `@logixjs/form/react` provides `useFormState(form, selector)` for stable access without scanning huge trees.

5. **Long lists/nested arrays: provide stable identity**
   - For “thousand-row forms” or “virtual scrolling”, ensure each row has a stable business id, and provide `trackBy` hints in domain/trait config when available.
   - This improves cache reuse and async write-back stability and reduces meaningless invalidation due to insert/reorder.

6. **Query scenarios: ensure the cache engine is injected and enabled**
   - If you expect caching and in-flight dedup, ensure QueryClient is injected in the Runtime scope and the corresponding Query integration middleware is enabled.
   - If injection is missing, the query should fail with a config error rather than silently degrade to uncached behavior (avoids uncontrolled prod differences).

With these layered strategies, you can keep Logix performant in complex scenarios without sacrificing debugging experience.

## 8. Common anti-patterns (high chance of degradation)

- Doing IO/await inside a transaction window (turns a “sync window” into an unpredictable long transaction).
- Using untrackable writes that cause `dirtySet.dirtyAll = true`, pushing derive/validation onto full paths.
- In high-frequency interactions (typing/dragging), frequently using full writes like `$.state.update` / `$.onAction(...).update` / `runtime.setState`.
- Subscribing to the whole state tree in UI or passing large objects directly as props, causing unnecessary re-renders.
- Using list index as id (insert/reorder amplifies small changes into large impact).
- Putting heavy computation into synchronous derive/validation (prefer moving to services/async tasks or splitting hotspot dependencies).
