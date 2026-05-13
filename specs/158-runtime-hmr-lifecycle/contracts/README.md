# Contracts: Runtime HMR Lifecycle

**Feature**: `158-runtime-hmr-lifecycle`  
**Date**: 2026-04-25

This folder defines behavioral contracts, not public API final names.

## Contract 1: Runtime Owner Boundary

Given a development host boundary owns a runtime, when that boundary is hot-replaced, the boundary must make exactly one lifecycle decision:

- reset
- dispose

The default React/Vite development decision is reset.

Acceptance:

- previous owner cleanup is invoked at most once per event, even if host calls dispose repeatedly
- repeated dispose is idempotent
- next runtime owner becomes interactive after reset
- no per-demo lifecycle policy duplicates the shared owner contract
- examples do not manually construct runtime lifecycle owners

## Contract 1A: Host Dev Lifecycle Carrier

Given an app or example enables Logix development lifecycle support at a host boundary, the host carrier must inject lifecycle services into runtime internals through Effect DI or an equivalent internal layer boundary.

Acceptance:

- activation happens once per host setup, such as a Vite plugin, React dev lifecycle entrypoint, or Vitest setup entrypoint
- ordinary example code keeps using normal `Runtime.make` and `RuntimeProvider`
- production bundles can avoid the development lifecycle implementation through dev-only module boundaries
- the carrier can be mocked in tests without adding a public `Runtime.hmr`, `Runtime.hotLifecycle`, or new `runtime.*` command

## Contract 2: Cleanup Attribution

Every runtime-owned resource category affected by hot lifecycle must be attributable to a runtime owner.

Covered first-wave categories:

- task
- timer
- watcher
- subscription
- module-cache-entry
- imports-scope
- runtime-store-topic
- debug-sink

Acceptance:

- cleanup evidence contains counts by category
- interrupted task/timer/watcher work cannot write back after owner disposal
- stale subscriptions cannot emit visible updates after cleanup settles

## Contract 3: Host Binding Cleanup

React and host-side bindings must be cleaned without becoming core runtime resources.

Covered first-wave categories:

- external-store-listener
- provider-layer-overlay
- host-subscription-binding
- hmr-boundary-adapter

Acceptance:

- React external-store listeners are attached to one runtime owner at a time
- provider layer overlay cleanup is summarized as host cleanup evidence
- host binding cleanup failures are visible in lifecycle evidence
- host binding categories do not enter the core `RuntimeResource` taxonomy

## Contract 4: Hot Lifecycle Evidence

When diagnostics or verification requests hot lifecycle evidence, the runtime must emit a slim serializable lifecycle event.

Required fields:

- owner id
- event id
- previous runtime id
- next runtime id when applicable
- decision
- reason
- cleanup outcome
- residual resource status
- host cleanup summary when React or host bindings participate

Acceptance:

- evidence contains no closures, Effect values, full Context objects, or large state snapshots
- diagnostics-disabled path does not require event allocation for correctness
- event ids are deterministic within owner/session
- host cleanup summary remains inside the same lifecycle evidence envelope and does not become a second evidence authority
- browser HMR evidence targets consume the same evidence envelope and do not define a separate report protocol

## Contract 5: React Snapshot Safety

React consumers must not observe mixed-runtime state during hot lifecycle replacement.

Acceptance:

- a selector subscription is attached to one runtime snapshot anchor at a time
- replacing runtime context does not leave old external-store listeners active
- no render-level tearing is observed in targeted test

## Contract 6: Example Author Contract

Examples must show the target user-facing authoring model.

Acceptance:

- covered examples create runtime through normal `Runtime.make` or `ManagedRuntime.make` patterns
- development hot update cleanup is handled by the configured host dev lifecycle carrier
- manual refresh is not needed for active timer/task recovery
- bespoke per-demo `import.meta.hot.dispose` snippets and `createExampleRuntimeOwner(...)` calls are treated as temporary residue and removed by closure

## Deferred Contract: Retention Safety Gate

Runtime state survival across hot update is deferred.

Future retention must prove:

- old and new program shape compatibility
- safe watcher/task/timer ownership transfer
- imports scope compatibility
- evidence for retained resources
- no stale closure execution

Current wave requirement:

- retention is not a lifecycle decision
- unsupported retention may only appear as a diagnostic rejection note or future reopen reason
