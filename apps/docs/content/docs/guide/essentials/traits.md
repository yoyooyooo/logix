---
title: Traits (capability rules and convergence)
description: How traits turn derivation/validation/async snapshots into explainable, tunable runtime behavior.
---

Traits are Logix’s “capability rules” layer: you attach **derivation, linkage, validation, and async snapshot writeback rules** to a Module as diffable declarations, and the Runtime executes and converges them consistently inside each transaction window.

A practical mental model:

- UI/components: render + dispatch intent (Actions)
- Logic/Flow: step chains, concurrency policies, IO orchestration
- **Traits**: field-level capability rules (derive/validate/source snapshots), applied consistently within a transaction window

## 1) What traits solve

Once your app enters a “dense area of linkage and constraints”, hand-written watchers often become:

- hard to reuse (rules get copy-pasted across screens)
- hard to explain (which rule changed this field, and why?)
- hard to tune (every keystroke triggers too much work without a control plane)

Traits make rules understandable to the Runtime so it can:

- converge before commit: **at most one observable commit per window**
- recompute only what’s impacted (depends on dirty evidence + dependency graph)
- safely fall back to stable modes and emit diagnostics

## 2) Traits and transaction windows: when intermediate states aren’t visible

Logix guarantees: **one entry = one transaction = one external commit**. Multiple writes inside a synchronous transaction window are merged; React subscribers typically see only the final committed state.

That’s not “dropping state”, it’s transaction semantics: writes go into a draft and commit once at the end.

Key boundaries:

- **No IO/await inside the synchronous window**: otherwise you turn a short transaction into a long one; intermediate writes can be overwritten by the final writeback (and dev builds emit `state_transaction::async_escape`).
- **Split long interactions into multiple commits**: for “loading → IO → writeback”, prefer `run*Task` with `pending → IO → writeback`.

Related pages:

- [Task Runner (long chain: pending → IO → writeback)](../learn/escape-hatches/task-runner)
- [Troubleshooting: async_escape / enqueue_in_transaction](../advanced/troubleshooting)

## 3) Traits and Form: you usually shouldn’t hand-roll form state

`@logix/form` is the most typical “traits-based domain package”:

- `derived` (computed/link/source) compiles into StateTrait rules for derivation/linkage/snapshots
- `rules` compiles into validation rules (incremental triggers rely on `deps` contracts + list identity)
- the Runtime applies “write values/ui → converge → incremental validate → write errors” in one window, with at most one commit

So for multi-field forms, validations, and dynamic arrays, follow the Form track instead of building a custom form module in Get Started.

Recommended reading:

- [Form overview](../../form/introduction)
- [Derived & linkage (derived / Trait)](../../form/derived)
- [Rules DSL (z)](../../form/rules)
- [Performance](../../form/performance)

## 4) When you need to touch traits directly

Most app code doesn’t need to write StateTrait directly. You’ll usually touch it when:

1. You’re building reusable capability packages (Patterns/domain packages) and want rules to travel with Logic.
2. You need local tuning for converge strategy (`traitConvergeMode/budget/time-slicing`) to stabilize or optimize hotspots.
3. You’re debugging thrash and need a more explainable evidence chain.

Related pages:

- [Converge control plane](../advanced/converge-control-plane)
- [Performance & optimization (traits cost model)](../advanced/performance-and-optimization)
- [Debugging & DevTools](../advanced/debugging-and-devtools)

## 5) Two entry points (both are setup-only)

### 5.1 Module-level (common for domain packages)

If a module “ships with capability rules” (forms, dynamic lists, snapshot resources), traits are typically embedded by the domain package.

At the app layer, you’ll usually just consume those packages.

### 5.2 Logic setup-level: `$.traits.declare(...)`

If you want a reusable Logic to carry capability rules along, declare traits during setup:

```ts
Module.logic(($) => ({
  setup: Effect.sync(() => {
    const traits = Logix.StateTrait.from(StateSchema)({
      /* ... */
    })
    $.traits.declare(traits)
  }),
  run: Effect.void,
}))
```

Key constraints:

- setup-only: traits are frozen after setup to avoid runtime drift.
- pure data: final traits must not depend on randomness/time/external IO.

API reference:

- [Bound API: Traits (setup-only)](../../api/core/bound-api)

