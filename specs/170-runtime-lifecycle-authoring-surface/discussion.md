# Runtime Lifecycle Authoring Surface Discussion

**Purpose**: Carry pre-freeze reasoning, rejected alternatives, and reopen evidence for [spec.md](./spec.md).
**Status**: Revised after plan-optimality-loop Round 1; frozen decisions compressed into planning artifacts
**Feature**: [spec.md](./spec.md)

## Rules

- `spec.md` owns the active authority.
- This file is a review scratchpad and does not own public surface decisions.
- Any future adopted decision from this file must be written back to `spec.md` and bound SSoT pages.

## Review Result

Round 1 did not pass until the following changes were adopted:

- Replace the target function from “replace `$.lifecycle`” to “remove lifecycle as a public authoring noun”.
- Adopt a sealed singleton readiness method: `$.readyAfter(effect, { id?: string })`.
- Reject `$.startup.*` and `$.ready.*` as replacement namespaces.
- Add a supersession contract for `011`, `136`, and `158`.
- Add one Lifecycle Authoring Routing Table.
- Add one Old Lifecycle Mention Classification Rule.
- Freeze run scheduling: returned run effect starts after readiness succeeds and does not block readiness.
- Freeze Provider error bridge as observation-only.

## Adopted Candidate

```ts
const Logic = Module.logic("logic-id", ($) => {
  $.readyAfter(loadInitialData, { id: "load-initial-data" })

  return Effect.gen(function* () {
    yield* runBackgroundWorker
    yield* Effect.acquireRelease(acquireResource, releaseResource)
  })
})
```

Adopted semantics:

- `$.readyAfter` is a root builder method.
- It is not a namespace.
- It is declaration-only.
- It registers synchronously.
- Its effect runs during runtime startup under the instance environment.
- The instance is ready after its effect succeeds.
- Its option bag is sealed to `{ id?: string }`.
- Failure fails instance acquisition.

## Closed Questions

- Q170-001 terminal spelling: closed as `$.readyAfter(effect, { id?: string })`.
- Q170-002 options: closed as `{ id?: string }` only.
- Q170-003 error observation: closed as Runtime / Provider / diagnostics only; no public per-logic replacement.
- Q170-004 Platform signals: closed as host-owned in this wave.
- Q170-005 diagnostics wording: closed by routing old lifecycle names to readiness, run effect, Scope, Runtime / Provider observation, or host carrier.

## Must Close Before Implementation

None.

## Deferred / Non-Blocking

- [ ] D170-001 State survival across development hot updates remains owned by `158-runtime-hmr-lifecycle` and is outside this authoring surface.
- [ ] D170-002 Public host signal DSL can reopen only with evidence that Platform / host carrier ownership cannot cover normal business use.
- [ ] D170-003 Rich readiness progress UI is outside this wave unless required to keep diagnostics actionable.

## Rejected Alternatives

### Full `$.lifecycle.*`

Rejected because one public noun spans readiness, run behavior, cleanup, error observation, and host signals.

### `$.lifecycle.onInitRequired(...)` Only

Rejected because it keeps lifecycle alive as a public authoring noun and invites sibling hooks to return.

### `$.startup.require(...)`

Rejected after review because `startup` creates a namespace that can grow into `startup.optional`, `startup.onStart`, `startup.timeout`, or `startup.order`.

### `$.ready.require(...)`

Rejected because it creates a namespace and can imply dynamic ready-state control.

### Public `$.resources.onDispose(...)`

Rejected as a duplicate of Effect Scope.

### Public `$.signals.*`

Rejected because host signals are owned by Platform / host carrier.

### Public `$.errors.onUnhandled(...)`

Rejected for this wave because it risks duplicating Runtime / Provider / diagnostics observation and encouraging per-logic global observers.

## Reopen Evidence

Only evidence listed in [spec.md](./spec.md#reopen-bar) can reopen the adopted candidate.

## Decision Backlinks

- Authority target: [spec.md](./spec.md)
- Implementation plan target: [plan.md](./plan.md)
- Research target: [research.md](./research.md)
- Contract target: [contracts/README.md](./contracts/README.md)
- Task target: [tasks.md](./tasks.md)
- Review ledger target: [../../docs/review-plan/runs/2026-04-30-runtime-lifecycle-authoring-surface-optimality-loop.md](../../docs/review-plan/runs/2026-04-30-runtime-lifecycle-authoring-surface-optimality-loop.md)
