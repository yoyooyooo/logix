# Data Model: Runtime HMR Lifecycle

**Feature**: `158-runtime-hmr-lifecycle`  
**Date**: 2026-04-25

## RuntimeOwner

Represents the lifecycle authority attached to a runtime during development lifecycle events. It is provided to runtime internals by the host dev lifecycle carrier, not by user-facing example code.

Fields:

- `ownerId`: stable human-readable owner key derived from the host carrier, runtime label, or configured development boundary
- `runtimeInstanceId`: stable runtime identity when available
- `runtimeLabel`: optional display label
- `hostKind`: `react` for first dogfood target, host-neutral in core evidence
- `carrierId`: stable id of the host dev lifecycle carrier instance that supplied the owner
- `policy`: `reset` or `dispose`
- `createdAtSeq`: monotonic sequence within the current page/session

Validation rules:

- `ownerId` must be stable across a hot update for the same logical owner.
- `runtimeInstanceId` must not use random or time defaults.
- `policy` must be explicit in evidence.
- User-facing examples must not construct `RuntimeOwner` directly.

## HostDevLifecycleCarrier

Represents a host integration that detects development hot update boundaries and injects lifecycle services into runtime internals through Effect DI.

Carrier examples:

- React development lifecycle integration
- Vite dev lifecycle plugin or entrypoint
- Vitest setup entrypoint for simulated HMR lifecycle tests

Fields:

- `carrierId`: stable carrier identity within the current dev session
- `hostKind`: `react`, `vite`, `vitest`, or another host-neutral string
- `enabled`: whether the carrier installs real lifecycle services or the default noop layer
- `runtimeKeyStrategy`: how the carrier derives owner keys, for example runtime label plus module boundary
- `providesLayer`: internal Effect Layer that supplies lifecycle owner, registry, and evidence services
- `cleanup`: host cleanup collector for external-store listeners, provider overlays, and host subscription bindings

Validation rules:

- Carrier activation must be a single host-level integration point.
- Carrier implementation may depend on host APIs, but core lifecycle primitives must not.
- Carrier-provided services must be tree-shakable from production bundles through dev-only entrypoints or equivalent static module boundaries.
- A carrier may be enabled by test setup, but test setup must exercise the same internal lifecycle services as the React/Vite development path.

## HotLifecycleEvent

Represents one development lifecycle boundary.

Fields:

- `eventId`: deterministic sequence scoped to owner
- `phase`: `before-dispose`, `dispose`, `after-dispose`, `recover`, `failed`
- `previousRuntimeInstanceId`
- `nextRuntimeInstanceId`
- `decision`: lifecycle decision applied
- `reason`: `hot-update`, `dispose-without-successor`, or `test-simulated`
- `resourceSummary`: counts by core runtime resource category
- `hostCleanupSummary`: optional counts by host binding cleanup category
- `residualSummary`: disallowed residual counts

Validation rules:

- A reset event must include previous and next runtime identities when next runtime exists.
- A dispose-only event may omit next runtime identity.
- Evidence payload must be serializable and bounded.

## RuntimeResource

Represents runtime-owned work or state that may need cleanup.

Resource categories:

- `task`
- `timer`
- `watcher`
- `subscription`
- `module-cache-entry`
- `imports-scope`
- `runtime-store-topic`
- `debug-sink`

Fields:

- `resourceId`: stable within runtime owner
- `category`
- `moduleId`
- `moduleInstanceId`
- `startedAtSeq`
- `status`: `active`, `closing`, `closed`, `failed`
- `ownerId`

Validation rules:

- A resource closed by hot lifecycle must not emit user-visible updates after closure.
- Failed cleanup must be diagnosable and must not be silent.

## HostBindingCleanup

Represents React or host-side cleanup required to keep projection and subscriptions safe. It is reported with the lifecycle event, but it is not a core runtime resource.

Categories:

- `external-store-listener`
- `provider-layer-overlay`
- `host-subscription-binding`
- `hmr-boundary-adapter`

Fields:

- `bindingId`: stable within host owner
- `category`
- `ownerId`
- `status`: `active`, `closing`, `closed`, `failed`

Validation rules:

- Host binding cleanup must not become a core runtime-owned noun.
- React selector subscriptions must not observe mixed-runtime snapshots during owner replacement.
- Failed host cleanup must be summarized in lifecycle evidence.
- Host binding cleanup must be gathered by the host dev lifecycle carrier or React host projection layer, not by user demo code.

## LifecycleDecision

Represents the decision chosen at a hot lifecycle event.

Values:

- `reset`: dispose previous runtime resources and initialize a new runtime owner
- `dispose`: close previous runtime resources without creating a successor

First-wave rule:

- `reset` is the default for examples and React development owner replacement.
- `dispose` applies when no successor runtime is created.
- State survival is outside the current decision set and requires a future spec.
- The decision is selected by the host dev lifecycle carrier; application authors do not encode the decision in each demo.

## ResidualResourceEvidence

Represents cleanup result after the lifecycle boundary settles.

Fields:

- `ownerId`
- `eventId`
- `checkedAtSeq`
- `closedCountByCategory`
- `disallowedActiveCountByCategory`
- `hostCleanupStatusByCategory`
- `errors`: bounded list of cleanup failure summaries

Validation rules:

- `disallowedActiveCountByCategory` must be zero for closure.
- Errors must be summarized by code and resource category, not raw object graphs.
- Diagnostic-disabled runtime correctness must not depend on this evidence being collected.

## State Transitions

```text
RuntimeOwner(active)
  <- HostDevLifecycleCarrier(provides owner service)
  -> HotLifecycleEvent(before-dispose)
  -> RuntimeResource(closing)
  -> RuntimeResource(closed | failed)
  -> ResidualResourceEvidence(checked)
  -> RuntimeOwner(recovered | disposed | failed)
```

Closure requires:

- previous owner no longer has disallowed active resources
- next owner, if any, is interactive
- evidence exists when diagnostics or test evidence capture requests it
