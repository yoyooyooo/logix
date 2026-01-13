---
title: Concurrency control plane
description: Limit concurrency for parallel watchers/tasks via Runtime/module/Provider overrides; emit actionable warnings under backpressure/saturation; allow explicit opt-in to unbounded concurrency (audited).
---

This guide addresses two practical problems:

1. You want to use parallel watchers (e.g. `runParallel`) to improve throughput, but you don’t want “more and more tasks until the app stalls” under burst traffic.
2. You occasionally truly need “unbounded concurrency” (e.g. one-time fan-out), but you want it to be **explicit and auditable**, and visible to diagnostics.

## What you get

- **Safe by default**: parallel watchers / tasks are bounded by a concurrency limit (default 16).
- **Lossless backpressure**: under pressure, events aren’t silently dropped; when internal buffers reach the cap, backpressure slows the ingress (instead of unbounded memory growth).
- **Structured warnings**: when the system is continuously saturated/backlogged, it emits `concurrency::pressure` (with locators like `configScope`).
- **Unbounded requires explicit permission**: `concurrencyLimit: "unbounded"` only takes effect when `allowUnbounded: true`; when it takes effect, a one-time high-severity audit event is emitted.

> Note: this control plane primarily governs parallel entry points provided by Logix (e.g. Flow watcher parallel modes and TaskRunner parallel mode). It does not rewrite concurrency you manually create in business code (e.g. your own `Effect.all({ concurrency: "unbounded" })`).

## Defaults (worth memorizing)

- `concurrencyLimit = 16`
- `allowUnbounded = false`
- `losslessBackpressureCapacity = 4096`
- `pressureWarningThreshold = { backlogCount: 1000, backlogDurationMs: 5000 }`
- `warningCooldownMs = 30000`

## Override scopes and precedence

You can inject concurrency policy at three levels:

1. **Runtime default (`runtime_default`)**: global defaults
2. **Per-module override (`runtime_module`)**: applies only to a specific `moduleId` (rollback/gradual tuning)
3. **Provider subtree override (`provider`)**: applies only to a subtree (e.g. a page/session scope)

Precedence: `provider > runtime_module > runtime_default > builtin`  
Effective timing: takes effect from the **next transaction/op window** (it does not interrupt an in-flight interaction).

## Common recipes

### Recipe A: lower global default (more stable)

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 8,
  },
})
```

### Recipe B: rollback only for one module (recommended)

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 16,
    overridesByModuleId: {
      OrderForm: { concurrencyLimit: 4 },
    },
  },
})
```

### Recipe C: hot switch one module at runtime (diagnosis/rollback)

```ts
import * as Logix from "@logixjs/core"

Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", { concurrencyLimit: 4 })
// Remove override: pass undefined
Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", undefined)
```

### Recipe D: override within a Provider subtree (page-level experiment)

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const overrides = Logix.Runtime.concurrencyPolicyOverridesLayer({
  concurrencyLimit: 8,
  overridesByModuleId: {
    OrderForm: { concurrencyLimit: 4 },
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

### Recipe E: explicitly enable unbounded concurrency (use with care)

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: "unbounded",
    allowUnbounded: true,
  },
})
```

When enabled, a one-time high-severity audit diagnostic event `concurrency::unbounded_enabled` is emitted.  
If you set `concurrencyLimit: "unbounded"` but forget `allowUnbounded: true`, the system falls back to bounded concurrency and emits `concurrency::unbounded_requires_opt_in`.

## Reading diagnostic signals

### `concurrency::pressure` (warning)

This indicates backpressure/saturation (e.g. internal buffers hit the cap, or sustained waiting). Suggested troubleshooting order:

1. Reduce trigger frequency (debounce / throttle / batch)
2. Choose a more appropriate watcher mode (e.g. switch from “fully parallel” to `runLatest` or `runExhaust`)
3. Tune parameters (increase `concurrencyLimit` / adjust backpressure caps and thresholds)

`trigger.details` includes at least:

- `configScope`: which scope the effective config comes from
- `limit`: the effective concurrency limit (number or `"unbounded"`)
- plus fields like `backlogCount/saturatedDurationMs/threshold/cooldownMs/degradeStrategy/suppressedCount` (for dedup/merging and saturation duration)

### `concurrency::unbounded_enabled` (error)

An instance has enabled unbounded concurrency (audit; emitted once).  
Use only for “short-lived, controlled, cancelable” fan-out scenarios, and ensure there’s a clear upstream traffic boundary.

### `concurrency::unbounded_requires_opt_in` (error)

Unbounded concurrency was requested but not explicitly allowed, so the system fell back to bounded concurrency (emitted once).

## FAQ

### Q1: I set an override, but it doesn’t seem effective?

Most common causes:

1. **Effective timing**: it takes effect from the next transaction.
2. **Wrong moduleId**: verify it matches the id in `Logix.Module.make("...")`.
3. **Overridden by a higher-precedence scope**: e.g. a Provider override inside the subtree.
