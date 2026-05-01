# Research: Runtime HMR Lifecycle

**Feature**: `158-runtime-hmr-lifecycle`  
**Date**: 2026-04-25  
**Status**: Complete for planning

## Decision 1: Default first wave is reset after hot update

**Decision**: The first implementation wave resets the affected runtime owner after a development hot update and proves recovery without manual page refresh.

**Rationale**:

- The current observed failure is permanent broken interaction until refresh. Reset fixes that class while keeping semantics simple.
- Arbitrary state survival across changed logic shape can retain stale watchers, timers, subscriptions, and old closure code.
- Reset gives a clear closure gate: previous resources are closed, next runtime initializes cleanly, UI is interactive again.

**Alternatives considered**:

- Preserve all runtime state by default. Rejected because code shape changes can make retained state and retained watchers invalid.
- Force full page reload. Rejected because it hides lifecycle leaks and removes diagnostic value.
- Per-demo `import.meta.hot.dispose` snippets. Rejected as final shape because it duplicates policy and misses core lifecycle evidence.

## Decision 2: Core owns lifecycle evidence, host owns boundary delivery

**Decision**: Core defines host-neutral lifecycle evidence and cleanup primitives. React, Vite, and Vitest development integrations deliver host lifecycle boundaries through a host dev lifecycle carrier. Example source must not expose repo-local lifecycle helpers as the authoring pattern.

**Rationale**:

- Runtime resources live in core and core-adjacent internals.
- HMR APIs are host-specific and must not enter core semantics.
- This keeps future hosts possible while allowing React examples to dogfood the contract first.
- Examples are user-facing reference code. They must show the intended user surface, so lifecycle wiring belongs to the host integration layer.
- Effect DI is the right internal bridge: the host carrier can provide owner, registry, and evidence services into runtime construction without asking authors to hand-assemble internal layers.

**Alternatives considered**:

- Put all logic in React. Rejected because timers, task runners, and module runtime resources need core attribution.
- Put Vite HMR handling in core. Rejected because it would make core depend on one development host.
- Require every demo to call `createExampleRuntimeOwner(...)`. Rejected because it leaks internal lifecycle policy into user-facing examples and does not match the target authoring surface.

## Decision 3: Lifecycle evidence uses the existing evidence envelope

**Decision**: Add a core-owned internal hot lifecycle event and capture it through the existing evidence envelope and feature evidence artifacts. This wave does not add a new `runtime.*` root command.

**Rationale**:

- The event must be easy to filter from task, transaction, and React render traces.
- Existing evidence envelope rules already provide the single machine-readable evidence authority.
- A distinct lifecycle event kind avoids raw trace dumps while keeping evidence slim.
- Keeping `runtime.check / runtime.trial / runtime.compare` unchanged prevents an HMR-specific second verification lane.

**Alternatives considered**:

- Only console warnings. Rejected because they are hard to compare and cannot drive automated acceptance.
- Full raw trace capture. Rejected because default evidence must stay slim.
- New `runtime.hmr` or HMR-only report surface. Rejected because it would create a second verification path.

## Decision 4: Retention requires a future safety gate

**Decision**: Runtime state retention across hot update is not part of the current decision set. Any state survival path must be explicit and gated by a future spec.

**Rationale**:

- Safe retention needs compatibility checks between old and new program shape, module ids, logic units, import scopes, and resource owner maps.
- Current closure requirement is recovery, not state continuity.
- A reset-first contract keeps active examples usable and forces cleanup correctness first.

**Alternatives considered**:

- Retain state when module id matches. Rejected because same module id does not prove watcher and logic compatibility.
- Retain only UI state. Rejected because React and Logix dual ownership would violate single lifecycle owner.

## Decision 5: Verification starts with browser hot lifecycle evidence

**Decision**: Add a browser-level evidence that simulates or triggers development hot lifecycle events and asserts recovery, cleanup, evidence, and no duplicate active resources.

**Rationale**:

- The bug is visible in browser development usage.
- Pure unit tests cannot prove React external-store subscription and provider replacement behavior.
- Repeated hot events expose leaked timers, watchers, and debug sinks.

**Alternatives considered**:

- Manual checklist in example app. Rejected because closure needs reproducible evidence.
- Unit-only cleanup tests. Rejected because they miss host subscription and render snapshot transitions.

## Decision 6: Decompose before semantic growth

**Decision**: If implementation touches `ModuleCache.ts` or extends `RuntimeProvider.tsx` with lifecycle behavior, first extract lifecycle-related internals into smaller files.

**Rationale**:

- `ModuleCache.ts` already exceeds 1000 LOC.
- Lifecycle logic is cross-cutting and will be difficult to audit if embedded in existing files.
- Constitution requires separating no-loss decomposition from semantic changes.

**Alternatives considered**:

- Patch current files directly. Rejected because it worsens current large-module risk and hides lifecycle ownership.

## Decision 7: Activation uses dev-only host entrypoints, not a core runtime boolean

**Decision**: Development lifecycle activation should be exposed through a host-level single integration point, such as a Vite plugin, React dev lifecycle entrypoint, or Vitest setup entrypoint. A core `Runtime.make({ hmr: true })` boolean is not the preferred activation mechanism.

**Rationale**:

- HMR boundaries are host-owned. Core runtime can consume injected lifecycle services, but it should not model Vite, React Fast Refresh, or Vitest directly.
- A boolean option in `Runtime.make` is a runtime value and does not by itself guarantee tree shaking. Static dev-only entrypoints and conditional exports give bundlers a clearer module boundary.
- Single host-level activation keeps example code and app authoring code aligned with the final surface.

**Alternatives considered**:

- User assembles internal HMR layer by hand. Rejected because it exposes implementation details and creates many failure modes.
- `Runtime.make(..., { hmr: true })`. Rejected as first choice because it puts host development lifecycle on the core public runtime option surface and weakens tree-shaking guarantees.
- Keep repo-local helper as the documented example path. Rejected because examples are user-facing documentation by code.
