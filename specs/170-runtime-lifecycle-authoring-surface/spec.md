# Feature Specification: Runtime Lifecycle Authoring Surface

**Feature Branch**: `170-runtime-lifecycle-authoring-surface`
**Created**: 2026-04-30
**Status**: Implemented
**Input**: User description: "面向终局优化 Logix lifecycle authoring surface：public authoring 中不再出现 lifecycle noun；生命周期事实源归 `ModuleRuntime instance`；Logic 最多只贡献一个 readiness gate；启动后长期任务走 returned run effect；动态资源释放走 Effect Scope；错误观察走 Runtime / RuntimeProvider / diagnostics；宿主信号走 Platform / host dev lifecycle carrier。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Current Role

- This page is the active SSoT for public lifecycle authoring removal.
- This page freezes the terminal owner law, public authoring route, old-name classification, and closure gates.
- This page supersedes older public `$.lifecycle.*` authoring language in `011` and `136`.
- This page does not own implementation sequencing, file-level patch plan, HMR internals, or React Provider implementation details.
- Implementation planning lives in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md), [tasks.md](./tasks.md), and [checklists/requirements.md](./checklists/requirements.md).
- Readiness method naming review lives in [readiness-api-naming-proposal.md](./readiness-api-naming-proposal.md).
- Discussion details live in [discussion.md](./discussion.md), but discussion is not authority.

## Target Function

Public authoring must not expose `lifecycle` as a noun.

`lifecycle` remains valid only as:

- internal runtime substrate vocabulary
- diagnostics / evidence vocabulary
- archived history
- negative examples and migration notes

The only ordinary Logic authoring contribution to runtime instance readiness is a sealed singleton method:

```ts
$.readyAfter(effect, { id?: string })
```

Rules:

- `$.readyAfter(...)` registers a readiness requirement during the synchronous Logic builder root.
- The runtime instance is ready after the registered effect succeeds.
- The effect itself runs later during runtime startup, under the instance environment.
- Requirements run in declaration order.
- A failed requirement fails instance acquisition.
- The returned run effect starts only after all readiness requirements succeed.
- The returned run effect does not block readiness.
- Startup timeout, ordering, optionality, and fatal policy are not public options in this wave.

## Context

The current runtime already has a real lifecycle substrate: setup-time registration, boot gate execution, start task scheduling, LIFO destroy tasks, platform signal handlers, diagnostics, and status snapshots.

The current public shape exposes these as one `$.lifecycle.*` family. That family spans unrelated owners:

- runtime instance readiness
- run effect scheduling
- dynamic resource cleanup
- unhandled error observation
- host/platform signal handling

The terminal public API must keep the runtime substrate while removing lifecycle as an authoring noun. The public authoring surface should name the only necessary Logic contribution directly: readiness.

## Supersession Contract

| Prior source | Retained authority | Superseded by 170 |
| --- | --- | --- |
| [../011-upgrade-lifecycle/spec.md](../011-upgrade-lifecycle/spec.md) | Runtime-owned instance status, boot failure diagnostics, destroy ordering for internal substrate, interrupt handling, React Provider observation bridge | Public `$.lifecycle.*` authoring family, public platform signal hooks, per-logic lifecycle error hook as default guidance |
| [../136-declare-run-phase-contract/spec.md](../136-declare-run-phase-contract/spec.md) | Synchronous declaration root, returned run effect, no `{ setup, run }` public phase object, dynamic cleanup through Scope | Public `$.lifecycle.onInitRequired` spelling and any lifecycle noun in canonical authoring |
| [../158-runtime-hmr-lifecycle/spec.md](../158-runtime-hmr-lifecycle/spec.md) | Host dev lifecycle carrier, hot lifecycle evidence, reset / dispose dev boundary | Any implication that ordinary Logic authoring owns suspend, resume, reset, or hot update hooks |

If older specs or docs conflict with this page on public lifecycle authoring, this page wins.

## Lifecycle Authoring Routing Table

| Lane | Concern | Terminal owner | Public authoring route | Forbidden public route |
| --- | --- | --- | --- | --- |
| L1 | Instance readiness gate | `ModuleRuntime instance` | `$.readyAfter(effect, { id?: string })` | `$.lifecycle.onInitRequired`, `$.startup.*`, `$.ready.*` |
| L2 | Long-lived behavior after ready | returned run effect | returned `Effect` | `$.lifecycle.onStart`, `$.startup.onStart` |
| L3 | Dynamic resource cleanup | Effect Scope / runtime scope | `Effect.acquireRelease` / finalizer | `$.lifecycle.onDestroy`, `$.resources.onDispose` |
| L4 | Unhandled failure observation | Runtime / Provider / diagnostics | `Runtime` options, `RuntimeProvider.onError`, DebugSink | `$.lifecycle.onError`, per-logic global observer |
| L5 | Host and platform signal | Platform / host carrier | host integration / dev carrier | `$.lifecycle.onSuspend`, `$.lifecycle.onResume`, `$.lifecycle.onReset`, `$.signals.*` |

Provider observation rule:

- `RuntimeProvider.onError` is only an observation sink.
- It consumes runtime diagnostics.
- It does not register per-logic handlers.
- It does not decide recovery, retry, suppress policy, or instance lifetime.

## Old Lifecycle Mention Classification Rule

Every non-archived hit of `$.lifecycle`, `onInitRequired`, `onStart`, `onDestroy`, `onError`, `onSuspend`, `onResume`, or `onReset` must be classified as exactly one of:

- `removed-public`
- `internal-only`
- `negative-only`
- `archived`

No unclassified hit may remain in active docs, specs, examples, packages, or skills.

## Scope

### In Scope

- Public authoring removal of lifecycle as a noun.
- Terminal readiness spelling and singleton constraints.
- Owner routing for old public lifecycle hooks.
- Supersession of `011` and `136` public authoring language.
- Diagnostics and sweep requirements needed to prevent lifecycle authoring drift.
- SSoT, standards, examples, skills, and spec writeback required by this surface cutover.

### Out of Scope

- Development HMR internals owned by [../158-runtime-hmr-lifecycle/spec.md](../158-runtime-hmr-lifecycle/spec.md).
- Effect Scope implementation.
- React `RuntimeProvider` implementation details beyond observation-only ownership.
- Platform signal implementation details.
- New public state survival, reset, suspend, or resume authoring API.
- Compatibility layer, deprecation period, or old spelling alias.
- Implementation task breakdown.

## Imported Authority _(recommended)_

- [../../docs/adr/2026-04-04-logix-api-next-charter.md](../../docs/adr/2026-04-04-logix-api-next-charter.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/03-canonical-authoring.md](../../docs/ssot/runtime/03-canonical-authoring.md)
- [../../docs/ssot/runtime/05-logic-composition-and-override.md](../../docs/ssot/runtime/05-logic-composition-and-override.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../011-upgrade-lifecycle/spec.md](../011-upgrade-lifecycle/spec.md)
- [../136-declare-run-phase-contract/spec.md](../136-declare-run-phase-contract/spec.md)
- [../158-runtime-hmr-lifecycle/spec.md](../158-runtime-hmr-lifecycle/spec.md)

## Closure & Guardrails _(recommended for closure / cutover / hub specs)_

### Closure Contract

- Public authoring docs, examples, skills, and type witnesses no longer teach lifecycle as an authoring noun.
- `$.readyAfter(effect, { id?: string })` is the only public readiness contribution.
- `$.readyAfter` is a root builder method, not a namespace.
- `$.readyAfter` means the instance becomes ready after the registered effect succeeds; failure fails acquisition.
- The readiness option bag is sealed to `{ id?: string }`.
- The returned run effect starts after readiness requirements succeed and does not block readiness.
- Dynamic cleanup is expressed by Scope finalizers or runtime-owned internal finalizers.
- Unhandled failure observation is expressed by Runtime / Provider / diagnostics boundaries.
- Suspend, resume, reset, and hot update are owned by Platform / host carrier / dev lifecycle internals.
- Text sweep applies the Old Lifecycle Mention Classification Rule.

### Must Cut

- Public `$.lifecycle.*`.
- Public `$.startup.*`.
- Public `$.ready.*`.
- Public `$.resources.onDispose(...)`.
- Public `$.signals.*`.
- Public `$.beforeReady(...)` or `$.afterReady(...)`.
- Any public alias that preserves the old lifecycle family shape.
- Any public option for readiness `fatalOnFailure`, timeout, ordering, optionality, retry, or recovery policy.
- Any new second phase object such as `{ setup, run }`, `lifecycle`, `processes`, or `workflows` in public authoring.
- Diagnostics that tell authors to add per-logic lifecycle handlers as the default solution.

### Reopen Bar

Only the following evidence can reopen this spec:

- A normal business module cannot express a required readiness gate through `$.readyAfter(...)` without worse public surface.
- Returned run effect cannot express the covered `onStart` class without hidden scheduling ambiguity or worse Agent generation stability.
- Scope cannot express the covered cleanup class, and a proposed public cleanup API strictly reduces surface and proof cost.
- Runtime / Provider / diagnostics observation cannot replace public `$.lifecycle.onError` without losing actionable error routing.
- Platform / host carrier ownership cannot cover suspend, resume, reset, or HMR without exposing a smaller public signal API that passes the dominance gates.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author Declares Readiness Without Lifecycle Noun (Priority: P1)

As a module author or Agent, I need one exact way to declare work that must finish before a module instance becomes ready.

**Traceability**: NS-3, NS-8, KF-3

**Why this priority**: Readiness is the only lifecycle-adjacent contribution that must remain visible in ordinary Logic authoring.

**Independent Test**: A module with two readiness requirements can be authored with `$.readyAfter(...)`, blocks instance readiness until both finish, and exposes structured failure evidence if either fails.

**Acceptance Scenarios**:

1. **Given** a Logic registers two readiness requirements, **When** the Program creates a runtime instance, **Then** the instance becomes ready only after both requirements complete in declared order.
2. **Given** a readiness requirement fails, **When** the instance is acquired, **Then** acquisition fails and diagnostics identify module id, instance id, readiness id, and failure summary.
3. **Given** an author reads public examples, **When** they need readiness, **Then** they see `$.readyAfter(...)` and no public lifecycle noun.

---

### User Story 2 - Author Runs Long-Lived Behavior Through Returned Run Effect (Priority: P1)

As a module author or Agent, I need startup-adjacent background behavior to live in the returned run effect, so Logic has one run path and no second start hook.

**Traceability**: NS-3, NS-4, KF-3, KF-4

**Why this priority**: `onStart` overlaps the returned run effect and creates a second entry for long-running work.

**Independent Test**: A module that previously used `$.lifecycle.onStart(...)` is rewritten to returned run effect behavior with the same observable action handling or background task outcome.

**Acceptance Scenarios**:

1. **Given** a Logic needs to start a non-blocking worker after readiness, **When** it returns a run effect, **Then** the worker is scheduled through the normal run path after readiness succeeds.
2. **Given** a returned run effect is still running, **When** the instance is already ready, **Then** the run effect does not block readiness.
3. **Given** a run effect fails unexpectedly, **When** diagnostics observe the failure, **Then** the error route is runtime-owned and does not require a public lifecycle error hook.

---

### User Story 3 - Author Releases Dynamic Resources Through Scope (Priority: P2)

As a module author, I need dynamic resources created during run to be released through Scope semantics, so cleanup is tied to acquisition.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: Cleanup should follow Effect resource ownership and should not require authors to register runtime destroy hooks from logic code.

**Independent Test**: A run effect using `Effect.acquireRelease` releases its resource on runtime scope close and no public destroy registration is needed.

**Acceptance Scenarios**:

1. **Given** a run effect acquires a resource, **When** the runtime instance closes, **Then** the release finalizer runs once.
2. **Given** a user attempts old public destroy hook spelling, **When** public type or text sweep runs, **Then** the use is rejected or classified by the Old Lifecycle Mention Classification Rule.
3. **Given** an internal runtime subsystem requires destroy ordering, **When** it uses lifecycle substrate internally, **Then** that internal use remains out of public authoring.

---

### User Story 4 - Host Signals Stay With Host Owners (Priority: P2)

As a host or platform integrator, I need suspend, resume, reset, and hot update boundaries to remain host-owned.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: Host signals have different ownership, proof, and diagnostics from module readiness.

**Independent Test**: React dev lifecycle and Platform signal docs route through host carrier or Platform owner, while ordinary Logic examples contain no public suspend, resume, or reset hooks.

**Acceptance Scenarios**:

1. **Given** a React dev lifecycle carrier handles hot replacement, **When** docs explain ownership, **Then** the owner is the host carrier and runtime internals.
2. **Given** Platform emits suspend or resume, **When** the runtime consumes it, **Then** diagnostics can attribute the host signal without adding public Logic signal hooks.

---

### User Story 5 - Reviewer Can Reject Lifecycle Surface Drift (Priority: P3)

As a reviewer, I need a small owner matrix and old-name classification rule, so I can reject attempts to reintroduce lifecycle authoring or replacement phase families.

**Traceability**: NS-4, KF-4, KF-9

**Why this priority**: Without a durable rejection rule, examples and skills will drift back to the old lifecycle family or a new equivalent namespace.

**Independent Test**: A proposed API or doc patch containing old lifecycle names or new startup/signal/resource namespaces can be classified as allowed internal, negative, archived, or rejected public drift within five minutes.

**Acceptance Scenarios**:

1. **Given** a patch adds a new public lifecycle method, **When** reviewer checks this spec, **Then** the patch is rejected unless it passes the reopen bar.
2. **Given** text sweep finds old lifecycle names, **When** each hit is classified, **Then** no unclassified hit remains in public authoring, examples, skills, or active docs.

### Edge Cases

- A readiness effect reads Env or performs asynchronous work.
- A readiness effect dispatches or updates state before ready.
- A returned run effect wants to start work only after readiness requirements finish.
- A cleanup finalizer fails during runtime close.
- A runtime assembly failure occurs before any Logic readiness declaration can run.
- Diagnostics are disabled.
- Internal field-kernel or external-store cleanup still uses lifecycle substrate.
- Archived docs and negative examples mention old lifecycle family methods.
- Development HMR emits reset or dispose evidence while ordinary Logic code remains unchanged.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) The public Logic authoring surface MUST remove lifecycle as an authoring noun.
- **FR-002**: (NS-3, KF-3) The public Logic authoring surface MUST provide one readiness declaration API: `$.readyAfter(effect, { id?: string })`.
- **FR-003**: (NS-3, NS-10) Readiness declaration MUST register synchronously during the Logic builder root.
- **FR-004**: (NS-3, NS-10) The registered readiness effect MUST execute later during runtime startup under the instance environment.
- **FR-005**: (NS-10) Readiness requirements MUST execute before the runtime instance becomes ready, MUST make the instance ready only after successful completion, and MUST fail instance acquisition when a requirement fails.
- **FR-006**: (NS-10, KF-8) Readiness diagnostics MUST carry stable module id, instance id, readiness id or equivalent coordinate, phase, and serializable failure summary.
- **FR-007**: (NS-3, KF-4) The returned run effect MUST start only after readiness requirements succeed and MUST be the public path for long-lived behavior currently covered by `onStart`.
- **FR-008**: (NS-4, KF-4) Dynamic run-phase resource cleanup MUST use Effect Scope semantics or internal runtime finalizers, not public destroy registration.
- **FR-009**: (NS-4, KF-4) Unhandled logic error observation MUST be owned by Runtime / React Provider / diagnostics boundaries, not by public per-logic lifecycle hooks.
- **FR-010**: (NS-4, NS-10) Suspend, resume, reset, and hot update behavior MUST be owned by Platform / host carrier / dev lifecycle internals, not by public Logic hooks.
- **FR-011**: (NS-3, KF-4) The system MUST reject public `$.startup.*`, `$.ready.*`, `$.resources.*`, `$.signals.*`, `$.beforeReady(...)`, or `$.afterReady(...)` as replacement lifecycle surfaces unless a future spec passes the reopen bar.
- **FR-012**: (NS-4, KF-9) Active SSoT, standards, examples, and skill guidance MUST classify all old lifecycle names using the Old Lifecycle Mention Classification Rule.
- **FR-013**: (NS-8, KF-9) Agent generation guidance MUST teach the routing table as owner lanes, while only generating `$.readyAfter(...)` for readiness.
- **FR-014**: (NS-10, KF-8) Internal lifecycle substrate MAY remain if it is runtime-owned, slim, serializable, stable under diagnostics-off, and absent from public authoring.
- **FR-015**: (NS-3, NS-4) The public API MUST not introduce a second phase object, second process family, or second host signal authoring family to replace removed lifecycle methods.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) Implementation SHOULD record a measurable baseline for runtime instance creation, readiness gate execution, and scope close when the branch is performance-comparable. Current 2026-05-01 dirty worktree evidence is intentionally deferred and recorded in [perf/README.md](./perf/README.md).
- **NFR-002**: (NS-10, KF-8) Diagnostics MUST stay slim, serializable, and stable enough for snapshot comparison.
- **NFR-003**: (NS-10) Diagnostics-off mode MUST not require lifecycle evidence for correctness.
- **NFR-004**: (NS-4, KF-9) Text sweep MUST classify old lifecycle names across `docs`, `specs`, `packages`, `examples`, and skills.
- **NFR-005**: (NS-3, KF-3) Public docs and examples MUST preserve one authoring formula: synchronous declaration root plus returned run effect.
- **NFR-006**: (NS-3, NS-4) No compatibility layer, deprecation period, or hidden alias may be added for the removed public lifecycle family.

### Key Entities _(include if feature involves data)_

- **Readiness Requirement**: A Logic-declared runtime instance gate that must complete before the instance is ready.
- **Runtime Instance Lifecycle**: Runtime-owned status and transition truth for creating, initializing, ready, failed, terminating, and terminated states.
- **Run Effect**: The single public run path returned from `Module.logic(...)`.
- **Scope Finalizer**: Resource release mechanism tied to dynamic acquisition and runtime scope close.
- **Host Signal**: Suspend, resume, reset, or hot update boundary owned by Platform or host carrier.
- **Unhandled Runtime Error Observation**: Runtime / Provider / diagnostics route that reports unexpected failures without becoming a public Logic hook.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) Public examples and canonical docs have zero success-path occurrences of lifecycle as an authoring noun.
- **SC-002**: (NS-3, NS-8) Agent generation guidance generates `$.readyAfter(...)` for readiness and routes former lifecycle concerns through the routing table without creating new public families.
- **SC-003**: (NS-10, KF-8) Readiness failure produces structured diagnostics with stable coordinates in every covered test.
- **SC-004**: (NS-4, KF-4) Every old lifecycle family hit in active docs, examples, tests, packages, and skills is classified as removed-public, internal-only, negative-only, or archived.
- **SC-005**: (NS-10, KF-8) Runtime instance creation, readiness gate, and close paths require a future comparable performance pass before any performance claim. This implementation closure makes no performance pass or regression claim.
- **SC-006**: (NS-4, KF-9) SSoT, standards, this spec, and skills agree that lifecycle truth belongs to runtime instance, while Logic only contributes readiness declaration through `$.readyAfter(...)`.
