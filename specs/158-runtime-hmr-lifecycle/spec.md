# Feature Specification: Runtime HMR Lifecycle

**Feature Branch**: `158-runtime-hmr-lifecycle`  
**Created**: 2026-04-25  
**Status**: Done  
**Input**: User description: "面向终局补齐 Logix 在开发期 HMR 下的 runtime 生命周期、任务/计时器恢复、残留资源清理、诊断证据与示例一致性。当前 example 下改代码后计时器或长链路 demo 可能失效，刷新后恢复，说明 React/Vite Fast Refresh 与 Logix Runtime 长生命周期对象之间存在缺口。需要建立 spec，允许按 forward-only 原则整顿核心链路，优先 runtime clarity、performance、diagnostics，不保留兼容壳层。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-5, NS-8, NS-10
- **Kill Features (KF)**: KF-6, KF-8

## Current Role

- This page holds the minimum necessary SSoT for this feature.
- This page MUST answer owner, boundary, and closure gate before planning starts.
- This page MUST NOT delegate core truth to `discussion.md`.

## Clarifications

### Session 2026-04-26

- Q: Should examples expose `createExampleRuntimeOwner(...)` as the author-facing HMR integration pattern? → A: No. Examples are user-facing references and must keep the target user code shape. Hot lifecycle must be carried by host dev lifecycle integration and injected into runtime internals through Effect DI.
- Q: Should users assemble the internal HMR layer by hand, or enable it through a single host-level integration point? → A: Use a single host-level integration point. Vite, Vitest, or React development entrypoints may provide the lifecycle layer, while ordinary example code continues to use normal `Runtime.make` and `RuntimeProvider` patterns.

## Context

Logix React examples currently rely on normal development server hot updates and React remount tolerance, while Logix Runtime owns longer-lived runtime state, scoped resources, task fibers, timers, subscriptions, debug sinks, and module caches.

Observed failure: while editing example code, an already active feature such as a timer or long-chain task demo can stop working until a full page refresh. A refresh resets the JavaScript context and clears stale runtime resources, so the failure points to a lifecycle gap between development hot update boundaries and Logix Runtime lifetime.

This feature closes that gap as a runtime lifecycle requirement, not as a one-off example workaround. It may require forward-only changes in the React host adapter, runtime ownership model, scoped cleanup boundaries, diagnostics, and example conventions.

## Scope

### In Scope

- Development hot update owner-replacement contract for Logix Runtime instances created by examples, React hosts, and local development apps.
- Host dev lifecycle carrier for React/Vite/Vitest development flows that injects runtime lifecycle services through Effect DI without requiring per-demo authoring code.
- Deterministic cleanup behavior for runtime-owned resources during hot replacement and direct owner disposal when no successor runtime exists.
- Recovery behavior for timers, task runners, watchers, module caches, imported module scopes, runtime stores, debug sinks, and external subscriptions after development hot updates.
- Clear user-facing guidance for where runtimes should be created, who owns their lifecycle, and what resets during a hot update.
- Slim diagnostic evidence that explains hot lifecycle events, interrupted work, recreated runtimes, disposed runtimes, and unsafe residual resources.
- Example dogfooding under `examples/logix-react` and the covered `examples/logix` scenario paths used as public references.
- Verification coverage that reproduces the current failure class without relying on manual browser refresh.

### Out of Scope

- Production runtime live patching.
- Cross-version compatibility with old public lifecycle APIs.
- Full state migration across arbitrary logic shape changes.
- Runtime state survival across arbitrary development hot updates.
- Visual devtools UI redesign.
- Host framework support beyond the current React development path, unless the generic runtime contract needs a host-neutral boundary.
- Requiring app authors or example authors to manually construct internal HMR lifecycle layers or repo-local lifecycle helpers at each runtime call site.

## Imported Authority _(recommended)_

- `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- `docs/adr/2026-04-04-logix-api-next-charter.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
- `specs/042-react-runtime-boot-dx`
- `specs/134-react-runtime-scope-unification`
- `specs/136-declare-run-phase-contract`

## Closure & Guardrails _(recommended for closure / cutover / hub specs)_

### Closure Contract

- Editing a Logix React example while a timer, task runner, watcher, or imported module flow is active must not leave the demo in a permanently broken state that requires a manual page refresh.
- Runtime-owned resources from the replaced development owner must be released before the successor runtime becomes authoritative. If no successor exists, the previous owner must be disposed.
- Every hot lifecycle path must produce testable evidence: runtime identity before and after the update when a successor exists, cleanup outcome, interrupted work count, lifecycle decision, and residual resource status.
- Public docs must state the lifecycle model with one owner, one boundary, and one recovery story.
- The examples must follow the final lifecycle contract consistently.
- User-facing examples must keep the intended authoring surface: normal runtime creation plus normal React integration. HMR lifecycle wiring belongs to the host dev lifecycle carrier, not demo source.

### Must Cut

- Ad hoc per-demo cleanup snippets that duplicate lifecycle policy.
- Hidden global runtime registries that cannot provide per-runtime cleanup evidence.
- Silent survival of stale watchers, timers, subscriptions, debug sinks, or module cache entries after a hot update.
- Dual truth sources where React component state and Logix runtime state both claim ownership of the same lifecycle.
- Compatibility shims for old development lifecycle behavior.
- Example-visible lifecycle helpers such as `createExampleRuntimeOwner(...)` as the documented or long-term author path.

### Reopen Bar

- A reproducible example shows a hot update causing a timer, task, watcher, imported module, or selector subscription to stop responding until full page refresh.
- Diagnostics cannot explain which runtime was reset, which runtime was disposed, or which resources remained active.
- Hot lifecycle support regresses render snapshot integrity, transaction boundary safety, or hot path performance.
- A new host integration exposes a lifecycle boundary that the current contract cannot model without unsafe global state.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Active Demo Survives Development Edits (Priority: P1)

As a developer using the Logix React example gallery, I can edit source code while a timer or long-running task demo is active, and the demo recovers without requiring a full page refresh.

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: This is the current user-visible failure and blocks trustworthy dogfooding.

**Independent Test**: Can be tested by starting an active timer or task demo, applying a development hot update, and verifying that the visible controls and state transitions continue to work without manual refresh.

**Acceptance Scenarios**:

1. **Given** a running timer or task demo with active work, **When** a development hot update replaces the demo module, **Then** the demo must become interactive again without manual page refresh.
2. **Given** a task is pending during a hot update, **When** the update completes, **Then** the task must be interrupted under the reset or dispose decision with visible and diagnostic evidence.
3. **Given** a watcher or subscription is active during a hot update, **When** the previous runtime owner is replaced, **Then** stale listeners must not continue to receive or emit user-visible updates.

---

### User Story 2 - Runtime Lifecycle Is Explainable (Priority: P2)

As a Logix maintainer, I can inspect structured evidence for a hot update and understand which runtime was reset, recreated, disposed, or found unsafe.

**Traceability**: NS-5, NS-10, KF-6, KF-8

**Why this priority**: Runtime HMR without evidence will hide leaks and make future host integration fragile.

**Independent Test**: Can be tested by triggering a hot lifecycle event and asserting that structured evidence contains the runtime identity, lifecycle decision, cleanup result, and residual resource status.

**Acceptance Scenarios**:

1. **Given** a runtime is replaced during development, **When** diagnostics are enabled, **Then** one lifecycle event must identify the previous runtime, the next runtime, and the decision applied.
2. **Given** cleanup interrupts a task, timer, watcher, or subscription, **When** diagnostics are enabled, **Then** the event must identify the interrupted resource category and outcome without dumping raw trace by default.
3. **Given** diagnostics are disabled, **When** hot updates occur, **Then** overhead must remain near zero and no diagnostic-only state may become required for correctness.

---

### User Story 3 - Authors Get One Lifecycle Model (Priority: P3)

As an app author, I can enable Logix development lifecycle once at the host boundary, then keep writing normal runtime and React code while hot updates recover predictably.

**Traceability**: NS-8, NS-10

**Why this priority**: The final API must be easy for humans and agents to generate without carrying host-specific folklore.

**Independent Test**: Can be tested by reviewing docs and examples for a single consistent lifecycle policy, then applying it to a new example that uses normal `Runtime.make` and `RuntimeProvider` code plus one host dev lifecycle integration.

**Acceptance Scenarios**:

1. **Given** an author creates a new React example, **When** they enable the documented host dev lifecycle integration once, **Then** the example must pass hot lifecycle verification without bespoke cleanup code or example-local lifecycle helper calls.
2. **Given** an author needs state continuity across a development update, **When** they try to encode that behavior, **Then** the docs must mark it as a deferred state-survival gate outside the current reset-first contract.
3. **Given** a runtime should reset on code edit, **When** the owner is replaced, **Then** all runtime-owned resources must be released and the next runtime must initialize cleanly.

### Edge Cases

- Hot update occurs while a task runner is between pending and writeback.
- Hot update occurs while a timer is scheduled but not fired.
- Hot update occurs while a watcher has forked work still running.
- Hot update occurs while a local module instance is pending through Suspense.
- Hot update replaces only a module definition while the root runtime owner file remains unchanged.
- Hot update replaces the runtime owner while nested providers, imported modules, and selector subscriptions are mounted.
- Hot update fails and the development server keeps the previous module graph alive.
- Diagnostics or devtools sink throws during lifecycle cleanup.
- Cleanup itself is interrupted, repeated, or invoked after the runtime has already been disposed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10) The system MUST define a single development hot lifecycle contract for Logix Runtime ownership, replacement, reset, dispose, and recovery.
- **FR-002**: (NS-8) The system MUST provide a default lifecycle path through host dev lifecycle integration so examples prevent stale runtime-owned work from breaking active demos after code edits without exposing internal helpers in demo code.
- **FR-003**: (NS-10, KF-8) The system MUST expose structured hot lifecycle evidence covering runtime identity, lifecycle decision, cleanup outcome, and residual resource status.
- **FR-004**: (NS-5, KF-6) The system MUST make interrupted timers, task runners, watchers, external-source subscriptions, module cache entries, imported module scopes, and debug sinks attributable to a runtime owner.
- **FR-005**: The system MUST ensure repeated hot replacement does not accumulate active copies of replaced runtime-owned work.
- **FR-006**: The current lifecycle decision set MUST be limited to runtime reset and runtime dispose.
- **FR-007**: The system MUST ensure hot lifecycle cleanup is idempotent and safe when called more than once.
- **FR-008**: The system MUST preserve render snapshot integrity for React consumers during hot lifecycle transitions.
- **FR-009**: The system MUST keep runtime transaction boundaries intact during hot lifecycle cleanup and recovery.
- **FR-010**: The system MUST update the public lifecycle documentation and example conventions so new examples follow the final contract by default.
- **FR-011**: The system MUST provide automated verification that reproduces the active-demo failure class and proves recovery without manual page refresh.
- **FR-012**: The system MUST treat per-example bespoke cleanup and example-visible lifecycle owner helpers as temporary smells and converge examples onto the final host-carried lifecycle policy.
- **FR-013**: The system MUST expose development lifecycle activation through a single host-level integration path, such as a React/Vite dev lifecycle entrypoint or test setup entrypoint, and MUST NOT require authors to hand-assemble internal lifecycle layers at each runtime creation site.
- **FR-014**: Runtime internals MUST receive lifecycle owner and evidence services through Effect DI or an equivalent internal layer boundary so runtime-owned resources can be attributed from creation time.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) System MUST define performance budgets for hot lifecycle bookkeeping and record a measurable baseline before implementation.
- **NFR-002**: System MUST provide structured diagnostic signals for hot lifecycle transitions, and diagnostics MUST have near-zero overhead when disabled.
- **NFR-003**: System MUST use deterministic identifiers for runtime instances, module instances, transactions, tasks, timers, and cleanup operations in diagnostic and replay surfaces.
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO or async work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: System MUST update user-facing documentation with a stable mental model, a coarse cost model, and an optimization ladder for development lifecycle behavior.
- **NFR-006**: System MUST encapsulate lifecycle coordination as explicit runtime or host contracts that are mockable per instance or session and do not depend on hidden process-global correctness.
- **NFR-007**: If this feature introduces breaking changes, the project MUST provide a migration note and MUST NOT keep compatibility layers or a deprecation period.
- **NFR-008**: React consumption MUST guarantee no render-level tearing and MUST avoid data-glue `useEffect` syncing state as a lifecycle correctness mechanism.
- **NFR-009**: Hot lifecycle support MUST not add steady-state overhead to production runtime paths.
- **NFR-010**: Cleanup evidence MUST stay slim, serializable, and stable enough for snapshot comparison.
- **NFR-011**: Hot lifecycle verification MUST consume the existing evidence envelope and MUST NOT introduce a separate HMR report protocol or new `runtime.*` root command in this wave.
- **NFR-012**: Development lifecycle implementation MUST be tree-shakable from production bundles through separate dev-only entrypoints, conditional package exports, or equivalent static module boundaries. A runtime boolean option alone is insufficient as the tree-shaking guarantee.

### Key Entities _(include if feature involves data)_

- **Runtime Owner**: The host boundary responsible for creating, resetting, or disposing a runtime during development lifecycle events.
- **Host Dev Lifecycle Carrier**: The React/Vite/Vitest development integration that detects host hot update boundaries, provides lifecycle services through Effect DI, and records host cleanup summary without appearing in ordinary example authoring code.
- **Hot Lifecycle Event**: A development update boundary with a previous runtime owner, optional next runtime owner, lifecycle decision, cleanup result, and diagnostic evidence.
- **Runtime Resource**: Runtime-owned work or state that may require cleanup, including timers, task fibers, watchers, subscriptions, module cache entries, imported module scopes, runtime stores, and debug sinks.
- **Lifecycle Decision**: The explicit outcome selected for a runtime during a hot lifecycle event: reset or dispose.
- **Residual Resource Evidence**: Slim evidence showing whether cleanup left active resources behind and whether those resources are allowed by the lifecycle contract.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-8, NS-10) A verified example can undergo at least 20 consecutive development hot updates while an active timer or task flow remains recoverable without manual page refresh.
- **SC-002**: No verified hot lifecycle scenario leaves more than one active copy of a replaced timer, watcher, subscription, or task runner after cleanup settles.
- **SC-003**: Hot lifecycle diagnostics identify runtime lifecycle decision and cleanup outcome for 100% of verified hot update scenarios.
- **SC-004**: Diagnostic-disabled hot lifecycle bookkeeping adds no measurable steady-state production overhead against the recorded baseline.
- **SC-005**: React consumers observe no tearing or mixed-runtime snapshot during verified hot lifecycle transitions.
- **SC-006**: Documentation and examples contain one consistent runtime ownership model and no example requires bespoke cleanup code for the covered hot lifecycle class.
- **SC-007**: Covered examples contain no `createExampleRuntimeOwner(...)` authoring calls and still pass hot lifecycle recovery tests through the configured host dev lifecycle carrier.
