---
title: Converge scheduling control plane
description: Control trait convergence strategy (auto/full/dirty) and budgets via Runtime/Provider/module overrides, with safe rollback and tunable defaults.
---

This is a hands-on advanced guide: without knowing the implementation details, you can achieve the following with a small amount of configuration:

- **Rollback (“stop the bleeding”)**: when a page/module suddenly becomes slow or unstable, quickly fall back to a safer mode (locally scoped).
- **Tune**: gradually probe better defaults without impacting the whole app (and with rollback).

## Who is this for?

- You use Logix for form interactions / derived fields / rule computations and you see interaction jank or performance regression after an upgrade.
- You want to quickly validate (without changing business logic) whether the issue is in convergence strategy and roll back safely.

## “Converge” in one sentence

You can think of **convergence (converge)** as:

> After state changes, the runtime recomputes a set of “derived values / linkage rules / computed fields” to make the final state consistent.

The core tradeoff is simple:

- **Full recompute** (stable but can be wasteful)
- **Recompute only affected parts** (faster but needs more decisions and accurate dependency relationships)

The control plane lets you switch between them in a controlled way.

## What you can control

### 1) Strategy: `traitConvergeMode`

Treat it as a three-position switch:

- `"auto"` (default): runtime decides “full vs partial” per transaction, aiming to be as fast as possible without sacrificing stability.
- `"full"` (most stable): always do full convergence; great as a “stable baseline / rollback mode”.
- `"dirty"` (more aggressive): always try to recompute only affected parts. Use when you’re confident writes are local and dependencies are accurate.

### 2) Two budgets: `traitConvergeBudgetMs` / `traitConvergeDecisionBudgetMs`

You don’t need to know the exact algorithm; just remember the “feel”:

- `traitConvergeBudgetMs`: **how much time you’re willing to spend converging for one interaction** (bigger = “compute more”, smaller = “protect responsiveness”).
- `traitConvergeDecisionBudgetMs`: how much time `auto` can spend deciding “full vs partial” (smaller = more conservative, more likely to fall back to `"full"`).

If you configure nothing, runtime uses defaults (currently `traitConvergeMode="auto"`, `traitConvergeBudgetMs=200ms`, `traitConvergeDecisionBudgetMs=0.5ms`).

### 3) Time-slicing: `traitConvergeTimeSlicing` (explicit opt-in)

When a module has many traits (e.g. 1000+) and interactions are frequent, you may hit a hard limit: “every keystroke needs to check/converge a lot of derivations”.
That’s when you should consider time-slicing.

First, a few concepts (no implementation detail required):

- **A transaction / interaction window**: roughly “one state commit” (e.g. one `dispatch`, one `$.state.mutate(...)`, one state write triggered by business logic). Runtime merges all writes in the window into one commit.
- **immediate**: must be up-to-date by the end of the window (for key business fields, validation, submission gating, etc.).
- **deferred**: allowed to lag briefly; skip computation in the current window and catch up later (good for UI display, formatting, non-critical stats).

The core idea of time-slicing is simple:

- **Split traits explicitly** into two groups: `immediate` (must converge within the same window) and `deferred` (may temporarily read stale values).
- **Only converge immediate on each window**, and coalesce deferred work to be caught up later (bounded to avoid starvation).

Important: **time-slicing does not automatically mark anything as deferred**. Only `computed/link` with explicit `scheduling: "deferred"` are deferred; everything else remains immediate.

The switch lives under `stateTransaction` (off by default):

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeTimeSlicing: {
      enabled: true,
      debounceMs: 16, // "how long to wait before catching up" (start with 16ms / one frame)
      maxLagMs: 200, // "latest time to catch up" (avoid deferred never catching up)
    },
  },
})
```

In plain terms:

- `enabled`: whether to enable time-slicing (default `false`).
- `debounceMs` (coalescing window, ms): during continuous input/transactions, runtime “batches” deferred work; **when there are no new transactions for `debounceMs`**, deferred work is caught up once (default `16`).
- `maxLagMs` (max lag bound, ms): starting from the first time deferred work is needed, **even if input continues**, runtime forces a catch-up after `maxLagMs` (default `200`) so deferred work doesn’t starve.
  Think of it as the maximum time deferred values are allowed to be stale.

### Understanding `maxLagMs`

Assume `maxLagMs = 200`:

- While you keep typing, deferred fields (e.g. display-only `priceText`) may stay stale temporarily.
- But they will be caught up **no later than** ~200ms after the first trigger (or earlier if you pause input).

How to choose:

- If you mainly want “no jitter, no lag” and can tolerate a bit of staleness: start with `200ms`.
- If UI must feel more “immediate”: try `100ms` or smaller (more frequent catch-ups; diminishing returns).
- If UI can be noticeably delayed (non-critical stats, helper hints): use `300ms~500ms`, but watch whether users feel values are “untrustworthy”.

### When should you enable time-slicing?

- You have many traits/derivations (1000+) with high-frequency interactions, and you clearly feel “every input recomputes too much”.
- You can clearly classify which derivations must be immediate vs can be deferred.

### When should you avoid it?

- You’re not confident which fields can be delayed; or business correctness strongly depends on derived results (validation/submission/inventory/amounts).
- You require UI to be fully consistent after every input and cannot accept even brief staleness (e.g. 100ms).

### How to tune (recommended flow)

1. **Try it on one problematic module first** (module-level override; see “Recipe E”), don’t apply globally.
2. Start by marking a small, safest set as `deferred` (display text, formatting, non-critical stats), and observe UX.
3. If still janky: gradually expand the deferred set or increase `debounceMs` (better coalescing under high-frequency input).
4. If values feel “too slow / untrustworthy”: decrease `maxLagMs`, or move key derivations back to immediate.

### How do I confirm it’s actually working?

The most direct check is behavioral difference:

- Enabled: at the end of one input/transaction, immediate fields are updated, but deferred fields might not be; they will catch up after `debounceMs`/`maxLagMs`.
- Disabled (or no deferred traits): at the end of each transaction, all derivations update within the same window (same behavior as before).

### 4) Override scopes: global / module-level / Provider subtree

You can inject config at three levels:

1. **Runtime default**: global (good for “global switches/defaults”).
2. **Per-module override**: affects only one module (most common rollback).
3. **Provider subtree override**: affects only a React subtree (page-level experiments or per-domain tuning).

Precedence is `provider > runtime_module > runtime_default > builtin`, and config takes effect from the **next transaction** (does not interrupt an in-flight interaction).

## Practical question: what is `moduleId`?

`moduleId` is the string you passed to `Logix.Module.make(...)` when creating the module:

```ts
const OrderForm = Logix.Module.make("OrderForm", { /* ... */ })
// "OrderForm" here is the moduleId
```

If you’re unsure, search your codebase for `Module.make("OrderForm"` or `Module.make(` to see available ids.

## Common recipes

### Recipe A: emulate a “stable baseline” (full converge)

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "full",
  },
})
```

### Recipe B: rollback for one module only (recommended)

When “only one page/module is janky”, prefer this local rollback: other modules keep the default strategy.

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "auto",
    traitConvergeOverridesByModuleId: {
      OrderForm: { traitConvergeMode: "full" },
    },
  },
})
```

### Recipe C: probe defaults within a React subtree (page-level tuning)

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const overrides = Logix.Runtime.stateTransactionOverridesLayer({
  traitConvergeMode: "auto",
  traitConvergeDecisionBudgetMs: 0.25,
  traitConvergeOverridesByModuleId: {
    OrderForm: { traitConvergeMode: "full" },
  },
})

export function App({ runtime }: { runtime: Logix.ManagedRuntime<any, any> }) {
  return (
    <RuntimeProvider runtime={runtime} layer={overrides}>
      {/* Effective within this subtree */}
    </RuntimeProvider>
  )
}
```

### Recipe D: hot switch one module at runtime (for diagnosis; avoid frequent releases)

```ts
import * as Logix from "@logixjs/core"

Logix.Runtime.setTraitConvergeOverride(runtime, "OrderForm", { traitConvergeMode: "full" })
// Remove override: pass undefined
Logix.Runtime.setTraitConvergeOverride(runtime, "OrderForm", undefined)
```

> Tip: hot switching is a rollback/diagnosis tool; don’t treat it as a long-term configuration system. Long-term defaults should live in Runtime/Provider config.

### Recipe E: enable time-slicing for one module (large-N, high-frequency input rollback)

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "dirty",
    traitConvergeOverridesByModuleId: {
      OrderForm: {
        traitConvergeTimeSlicing: { enabled: true, debounceMs: 16, maxLagMs: 200 },
      },
    },
  },
})
```

### Recipe F: mark a trait as deferred (must be explicit)

> Only derivations that can temporarily read stale values should be deferred (e.g. display text, formatting, non-critical stats). Keep key business fields immediate.

```ts
import * as Logix from "@logixjs/core"

const Traits = Logix.StateTrait.from(State)({
  // immediate (default): converge within the same window
  priceWithTax: Logix.StateTrait.computed({
    deps: ["price"],
    get: (price) => price * 1.13,
  }),

  // deferred: allow delayed catch-up (requires traitConvergeTimeSlicing enabled in runtime)
  priceText: Logix.StateTrait.computed({
    deps: ["price"],
    scheduling: "deferred",
    get: (price) => `¥${price.toFixed(2)}`,
  }),

  // link also supports scheduling (example: map one field to a display field)
  displayPrice: Logix.StateTrait.link({ from: "price", scheduling: "deferred" }),
})
```

## A practical workflow: rollback -> compare -> clean up

### 1) Rollback (get the business running)

Prefer per-module rollback:

1. Identify the slow module `moduleId`.
2. Add `traitConvergeOverridesByModuleId[moduleId].traitConvergeMode = "full"`.
3. Verify the page recovers (at least “more stable and predictable”).
4. Record the override (so you can clean it up later).

### 2) Compare (is it really convergence strategy?)

You can do a first-pass judgment without precise measurements:

- `"full"` is clearly more stable: “auto/partial” may need tuning or deeper investigation.
- `"full"` and `"auto"` feel similar: the bottleneck may not be convergence (look at rendering/observability/business logic).

### 3) Clean up (don’t keep overrides forever)

After fixing root causes or tuning defaults, remove module/subtree overrides and return to the default strategy.

## FAQ

### Q1: I just want “behavior like before the upgrade”. What should I change?

Only one change is enough: pin `traitConvergeMode` to `"full"` (globally or for the target module). Don’t touch budgets initially.

### Q2: I set an override, but it doesn’t seem effective?

Three most common causes:

1. **Effective timing**: config takes effect from the **next transaction** (it won’t interrupt an in-flight interaction).
2. **Wrong moduleId**: verify it matches `Logix.Module.make("...")`.
3. **Overridden by higher precedence**: e.g. another Provider override inside the subtree.

### Q3: Can I just reduce `traitConvergeBudgetMs` aggressively?

Not recommended initially. It’s an “execution budget”. Too small may trigger degradation, causing derivations/linkage computations to not fully complete in extreme transactions (more conservative/stable, but not necessarily faster).

### Q4: Should I use `"dirty"`?

Treat `"dirty"` as “experimental”: use `"full"` as a stable baseline first, then tune `"auto"` to satisfaction; only when you’re very confident writes are local and dependencies are accurate should you try `"dirty"` on a small number of modules.

## Common pitfalls

- Treating “rollback overrides” as long-term defaults: overrides should be temporary. Ultimately you should either fix root causes or bake better defaults into configuration.
