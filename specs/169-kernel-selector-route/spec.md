# Feature Specification: Kernel Selector Route Contract

**Feature Branch**: `169-kernel-selector-route`  
**Created**: 2026-04-30  
**Status**: Active  
**Input**: User description: "Convert the adopted T2 kernel selector proposal into a requirements spec: Logix must remove public no-arg React host reads, make selector precision and route decision a core-owned contract, force React and Agent-generated code through exact selector inputs by default, reject broad/dynamic/dirty fallback under dev/test policy, keep internal evidence nouns out of public authoring, and preserve a layered verification control plane."

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Current Role

This page turns the adopted T2 selector proposal into the active requirements spec for kernel-owned selector precision and React host route closure.

| File | Role | Does Not Own |
| --- | --- | --- |
| [../../docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md](../../docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md) | Adopted T2 design record and review evidence | Active implementation requirements |
| [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md) | Public API spine and terminal host read surface | Internal selector route details |
| [../../docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md) | Hot-path reopen and performance evidence direction | User-facing authoring recipes |
| [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) | Verification stage boundaries and report layering | React host render observation |
| [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md) | React host projection law | Product-specific render fanout fixes |
| [../../docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md) | Selector input type-safety ceiling | Runtime routing policy |
| This spec | Testable requirements, closure gates, measurable outcomes | Implementation sequencing, file-level patch plan |

This spec is forward-only. It does not preserve old public host read forms for compatibility.

## Context

Playground render fanout exposed a broader runtime problem: ordinary React applications and Agent-generated code can subscribe too broadly even when components are split. The root failure is that selector precision, dirty/read overlap, and host subscription route are not closed by a single kernel-owned contract.

The accepted terminal direction is T2: Selector-Input Precision Law plus Core Projection Quality Route. It removes public whole-state host reads, keeps a single public selector gate, moves precision and route decisions to the kernel, makes React consume that route, and rejects broad, dynamic, or dirty fallback in dev/test when host projection correctness is affected.

This spec converts that direction into requirements suitable for planning and implementation.

## Scope

### In Scope

- Terminal public React read shape.
- Selector input default generation rules for docs, examples, skills, and Agent recipes.
- Core-owned selector precision classification.
- Core-owned host route decision.
- Selector fingerprint identity requirements.
- Dirty/read path authority overlap requirements.
- Dev/test strict failure policy for broad, dynamic, unknown, dirty-all, missing path authority, unsafe coarse dirty root, and evaluate-all fallback.
- Internal debug/resilience marker boundary.
- React host consumption of core route decisions.
- Verification control-plane reporting boundaries for selector-quality artifacts and host projection evidence.
- Contract tests, type-surface witnesses, text sweep requirements, and non-Playground business witnesses.

### Out of Scope

- Public `ReadQuery` authoring.
- New public selector namespace such as `select.*`.
- Second React hook family.
- Public object/struct projection descriptor.
- Playground-specific public API.
- Component-level Playground refactor as the owner of kernel law.
- Compatibility wrapper, deprecation period, or dual public route.
- Host render isolation proof as a default `runtime.check` or startup responsibility.
- Final implementation file layout, naming of internal records, or task sequencing.

## Imported Authority

- [../../docs/adr/2026-04-04-logix-api-next-charter.md](../../docs/adr/2026-04-04-logix-api-next-charter.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md)
- [../../docs/ssot/runtime/03-canonical-authoring.md](../../docs/ssot/runtime/03-canonical-authoring.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../../docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md)
- [../../docs/ssot/capability/03-frozen-api-shape.md](../../docs/ssot/capability/03-frozen-api-shape.md)
- [../../docs/proposals/read-query-selector-law-internalization-contract.md](../../docs/proposals/read-query-selector-law-internalization-contract.md)
- [../../docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md](../../docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md)

## Closure & Guardrails

### Closure Contract

This spec is closed when:

- Public React host read examples, type witnesses, docs, README, and Agent generation rules no longer teach or accept public no-arg host reads as a success path.
- Every host-visible selector read receives a core-owned precision classification.
- React host follows the core route decision and cannot silently fall back to broad module subscription for rejected reads.
- Selector topic identity is fingerprint-based and prevents label collisions.
- Dirty and read paths share one internal authority for overlap decisions.
- Dev/test strict policy rejects broad, dynamic, unknown, dirty-all, missing path authority, unsafe coarse dirty root, and evaluate-all fallback when they affect host projections.
- Diagnostics and verification reports explain precision failure without exposing internal nouns as public authoring concepts.
- Non-Playground business witnesses prove the same behavior outside the original Playground symptom.

### Must Cut

- Public no-arg `useSelector(handle)` as a host read success path.
- Public `ReadQuery` as an authoring concept.
- Function selector as L0/L1 generated recipe.
- React-owned broad/dynamic/topic eligibility decision.
- Selector topic identity based only on a selector id label.
- Silent module-topic fallback for dynamic, broad, unknown, or unsafe selector precision.
- Dirty-all or evaluate-all fallback as a normal host projection route.
- Debug/resilience marker access from public types, root exports, README examples, cookbook examples, or Agent generation material.
- Any compatibility layer, deprecation period, or second hook family for the removed public read path.

### Reopen Bar

Only the following evidence can reopen this spec:

- Exact selector inputs cannot support ordinary business UI projection without introducing worse public surface.
- The core cannot classify broad/dynamic/dirty fallback precisely enough to avoid false failures in normal business witnesses.
- Fingerprint identity adds unacceptable hot-path cost in clean comparable measurements and no smaller internal identity can satisfy collision safety.
- Verification control-plane layering cannot report selector-quality failures without either hiding actionable failure or creating a second report truth.
- A future public selector helper strictly improves Agent generation stability and type-safety without resurrecting public `ReadQuery`, a second hook family, or a second route owner.

## User Scenarios & Testing

### User Story 1 - App author reads React state through precise selector inputs (Priority: P1)

As an application author or Agent generating React code, I need the public host read surface to lead me to exact selector inputs by default, so ordinary UI components avoid whole-state subscriptions without requiring manual runtime knowledge.

**Traceability**: NS-3, NS-8, KF-3

**Why this priority**: If the public API still exposes a whole-state read success path, users and Agents will keep generating broad subscriptions that component splitting cannot repair.

**Independent Test**: Review public docs, README, examples, skills, and type-surface witnesses. Confirm that exact selector inputs are the taught path and public no-arg host reads are rejected or marked internal-only.

**Acceptance Scenarios**:

1. **Given** a user follows canonical React host docs, **When** they need a field value, **Then** they are shown a selector input read rather than a whole-state host read.
2. **Given** an Agent uses local generation guidance, **When** it creates React form reads, **Then** it generates field and domain selector primitives by default.
3. **Given** a public type-surface contract, **When** a no-arg host read appears as a success witness, **Then** the contract fails this spec.

---

### User Story 2 - React host cannot bypass core selector precision (Priority: P1)

As a runtime maintainer, I need React host reads to consume a kernel-owned route decision, so broad, dynamic, unknown, or unsafe reads cannot silently subscribe to a broad module topic.

**Traceability**: NS-3, NS-10, KF-3, KF-8

**Why this priority**: A React-side fallback can defeat kernel precision even when selector metadata exists elsewhere.

**Independent Test**: Construct exact, broad, dynamic, unknown, and debug-marked selector cases. Verify that React host follows the core route outcome for each case and has no independent broad/dynamic eligibility authority.

**Acceptance Scenarios**:

1. **Given** an exact static selector input, **When** React subscribes, **Then** the read uses the exact route chosen by core.
2. **Given** a dynamic selector fallback, **When** React subscribes under dev/test policy, **Then** the read is rejected or reported according to core policy rather than using a broad module subscription.
3. **Given** a broad-state or broad-root read, **When** React host receives the core route decision, **Then** React cannot override it with a local fallback.

---

### User Story 3 - Kernel prevents selector identity and dirty/read overlap ambiguity (Priority: P1)

As a runtime maintainer, I need selector identity and dirty/read overlap to share stable kernel authority, so unrelated subscribers are not evaluated or published due to label collision, dirty-all, or missing path mapping.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: Render fanout can reappear if selector identities collide or dirty paths cannot be compared with read paths.

**Independent Test**: Create selector collisions, nested dirty path changes, missing path authority, coarse dirty root, and evaluate-all fallback fixtures. Verify strict failure or precise routing according to the declared policy.

**Acceptance Scenarios**:

1. **Given** two selector inputs share a label but differ in shape or reads, **When** both subscribe, **Then** the runtime detects distinct selector identity and does not reuse a single topic entry by label alone.
2. **Given** a write dirties a nested field, **When** subscribed selectors read unrelated fields, **Then** unrelated selectors are not treated as affected if path authority can prove no overlap.
3. **Given** dirty/read overlap cannot be proven, **When** the fallback would affect host projection, **Then** dev/test policy rejects or reports the precision failure instead of silently evaluating all subscribers.

---

### User Story 4 - Agent receives actionable precision diagnostics through the right verification layer (Priority: P2)

As an Agent repairing code, I need selector precision failures to appear in structured diagnostics and verification reports only where that stage can legitimately observe them, so I can fix broad reads or dirty fallback without confusing static, startup, and host evidence.

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8, KF-9

**Why this priority**: Over-reporting host behavior in static or startup stages creates a second truth source and makes repair loops unreliable.

**Independent Test**: Run check, startup trial, scenario or host harness proof cases. Verify that selector-quality failures appear only through the permitted evidence layer and carry structured repair hints.

**Acceptance Scenarios**:

1. **Given** only static selector-quality artifact exists, **When** `runtime.check` runs, **Then** it reports only static selector-quality findings and does not claim React commit or subscription fanout evidence.
2. **Given** startup wiring has invalid selector policy configuration, **When** startup trial runs, **Then** the report identifies the policy wiring problem without requiring browser host interaction.
3. **Given** host projection evidence exists through an explicit host harness or scenario artifact, **When** a precision failure is detected, **Then** the report links that evidence and gives a structured repair hint.

### Edge Cases

- A selector function has valid TypeScript return type but cannot be admitted as exact runtime precision.
- A whole-state read exists only in repo-internal debug or test harness code.
- A debug/resilience marker is missing, malformed, or reachable from public imports.
- A selector input has stable label but a different projection shape.
- Path authority changes between selector compilation and subscription.
- A dirty path is source-marked as inferred but is too coarse for overlap routing.
- Multiple precision failures occur in one transaction.
- Diagnostics are disabled in production-like mode.

## Requirements

### Functional Requirements

- **FR-001**: (NS-3, NS-8) The public React host read contract MUST expose `useSelector(handle, selector, equalityFn?)` as the terminal read gate and MUST NOT expose public no-arg host reads as a success path.
- **FR-002**: (NS-3, NS-8) Public docs, README, examples, skills, and Agent generation material MUST teach selector inputs first, including core-owned field selectors and domain-owned selector primitives.
- **FR-003**: (NS-3) Function selectors MUST be classified as expert inputs and MUST NOT be taught as L0/L1 generated recipes.
- **FR-004**: (NS-3, NS-8) The system MUST keep public authoring language limited to selector input, broad read, and dynamic selector fallback for this feature.
- **FR-005**: (NS-3) Public authoring material MUST NOT introduce `ReadQuery`, projection evidence, dirty evidence, read topic, selector graph, registry, runtime topic key, or Playground product terms as primary user concepts.
- **FR-006**: (NS-10) Every host-visible read MUST receive a core-owned precision classification before React host chooses a subscription route.
- **FR-007**: (NS-10) Selector precision classification MUST distinguish exact, broad-root, broad-state, dynamic, debug, and unknown cases.
- **FR-008**: (NS-10) Broad classification MUST consider path kind, schema knowledge, and internal path authority when available; it MUST NOT depend only on dot-path depth.
- **FR-009**: (NS-10) Core route decision MUST distinguish exact subscription, rejection, and explicitly marked internal resilience routes.
- **FR-010**: (NS-10) React host MUST consume the core route decision and MUST NOT maintain a separate broad, dynamic, or topic eligibility authority.
- **FR-011**: (NS-10) Dynamic, broad-root, broad-state, unknown, and unsafe debug precision MUST reject or surface strict failure under dev/test policy when they affect host projection.
- **FR-012**: (NS-10) Explicit debug or resilience routes MUST require internal-only markers and MUST remain diagnostic-visible.
- **FR-013**: (NS-3) Debug/resilience markers MUST NOT be available through public types, root exports, README snippets, cookbook examples, or Agent generation material.
- **FR-014**: (NS-4, NS-10) Selector topic identity MUST be based on a selector fingerprint that covers static shape, reads, equality semantics, projection or operator shape, and path-authority digest or epoch.
- **FR-015**: (NS-4, NS-10) Selector id labels MUST NOT be sufficient to reuse a selector entry, subscription topic, or graph entry when fingerprints differ.
- **FR-016**: (NS-4, NS-10) Read paths and dirty paths MUST normalize through one internal path-id authority for overlap decisions.
- **FR-017**: (NS-10) Dirty precision quality MUST identify dirty-all, missing path authority, missing dirty path, selector without exact precision, and unsafe coarse dirty root when these conditions affect host projections.
- **FR-018**: (NS-10) Dirty-all, unmapped write path, missing path authority, unsafe coarse dirty root, and evaluate-all fallback MUST reject or surface strict failure under dev/test policy when they affect host projection.
- **FR-019**: (NS-10) Inferred dirty information MUST be source-marked and MUST only be admitted when overlap routing remains precise enough for affected host projections.
- **FR-020**: (NS-10) Evaluate-all fallback MUST report why overlap routing failed and MUST NOT be a silent normal route for host projection.
- **FR-021**: (NS-4, NS-8) `runtime.check` MUST only report selector-quality information from existing static or build artifacts and MUST NOT claim React commit, subscription fanout, or render isolation observations.
- **FR-022**: (NS-8, NS-10) Startup trial MAY verify selector policy wiring and startup selector-quality artifacts, but MUST NOT claim browser host render isolation or subscription fanout evidence.
- **FR-023**: (NS-4, NS-8) Host projection precision MAY enter reports only through explicit host evidence artifacts, scenario evidence, or repo-internal host harness evidence.
- **FR-024**: (NS-8, NS-10) Precision failure diagnostics MUST be structured enough to identify dynamic fallback, broad host read, dirty-all fallback, missing path authority, unsafe coarse dirty root, fingerprint collision, shape mismatch, and evaluate-all fallback.
- **FR-025**: (NS-8) At least three non-Playground business witnesses MUST prove the contract: form row editing, master-detail imported child reads, and dashboard-style independent cards.
- **FR-026**: (NS-3, NS-8) This feature MUST NOT introduce a public selector namespace, second React hook family, public object/struct projection descriptor, or compatibility wrapper.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) Any implementation that changes selector route, selector fingerprint, path authority, dirty/read overlap, evaluate-all fallback, or React host projection route MUST record before/after performance evidence under comparable conditions.
- **NFR-002**: (NS-10) Performance evidence MUST cover selector count scale, dirty path count scale, nested path depth, selector fingerprint overhead, rejection overhead, diagnostics disabled, and dev/test diagnostics enabled.
- **NFR-003**: (NS-10) Diagnostic signals for selector precision and dirty fallback MUST be slim, serializable, and tied to stable runtime coordinates.
- **NFR-004**: (NS-10) Diagnostics-disabled operation MUST avoid adding unbounded steady-state cost to ordinary exact selector reads.
- **NFR-005**: (NS-4, KF-9) SSoT, specs, README, skills, examples, and type witnesses MUST use one consistent public vocabulary for selector inputs and rejected broad/dynamic fallback.
- **NFR-006**: (NS-8) The cutover MUST be forward-only: no compatibility layer, deprecation period, dual public route, or hidden helper that preserves the removed public host read shape.
- **NFR-007**: (NS-10) Structured diagnostics MUST allow repair loops to identify whether a failure is read-side precision, dirty-side precision, identity collision, missing path authority, or verification-layer absence.
- **NFR-008**: (NS-3, NS-10) The implementation MUST avoid a second runtime truth, second subscription truth, second verification truth, or second public authoring model.

### Key Entities

- **Selector Input**: The public concept passed to the single React host read gate to describe a precise state projection.
- **Precision Quality**: The core-owned classification of a host-visible read or write-side fallback.
- **Route Decision**: The core-owned decision that tells React whether a selector can use exact subscription, must reject, or may use an internal resilience route.
- **Selector Fingerprint**: Stable identity digest for a selector shape, reads, equality semantics, projection/operator shape, and path-authority version.
- **Path Authority**: Internal authority that normalizes read paths and dirty paths to comparable path ids.
- **Dirty Precision Failure**: Write-side or overlap-routing condition that prevents exact subscriber impact analysis.
- **Debug/Resilience Marker**: Internal-only marker that permits explicitly diagnosed broad or resilience behavior outside public authoring.
- **Selector-Quality Artifact**: Static, startup, scenario, or host-harness evidence that verification control plane may consume according to stage boundaries.

## Success Criteria

### Measurable Outcomes

- **SC-001**: (NS-3, NS-8) Public surface and type-surface checks prove public no-arg host reads are absent from success examples and public terminal contracts.
- **SC-002**: (NS-8) Text sweep proves docs, README, examples, and skills teach selector inputs first and do not teach function selectors as L0/L1 defaults.
- **SC-003**: (NS-10) Core selector contract tests cover exact, broad-root, broad-state, dynamic, debug, and unknown precision classification.
- **SC-004**: (NS-10) React host tests prove exact selector inputs use the core route and broad or dynamic reads cannot silently fall back to module subscription.
- **SC-005**: (NS-4, NS-10) Selector identity tests prove same selector label with different fingerprint cannot reuse the same topic or graph entry.
- **SC-006**: (NS-4, NS-10) Dirty/read overlap tests prove nested dirty paths notify affected subscribers only when path authority can prove overlap.
- **SC-007**: (NS-10) Dirty fallback tests prove dirty-all, missing path authority, unsafe coarse root, and evaluate-all fallback reject or surface strict failure under dev/test policy when host projection is affected.
- **SC-008**: (NS-8, NS-10) Diagnostic tests prove precision failures produce structured, serializable diagnostics with stable runtime coordinates.
- **SC-009**: (NS-4, NS-8) Verification control-plane tests prove `runtime.check`, startup trial, and host evidence layers report only the selector-quality facts they are authorized to observe.
- **SC-010**: (NS-8) Business witness tests cover form row editing, master-detail imported child reads, dashboard independent cards, and Playground render isolation as product witness only.
- **SC-011**: (NS-10) Performance matrix shows no unacceptable regression for exact selector steady-state under diagnostics-disabled conditions and records dev/test strict-policy overhead.
- **SC-012**: (NS-4, KF-9) Cross-reference sweep proves this spec, active SSoT, README, skills, and prior Playground fanout proposal all point to the same T2 authority.

## Assumptions

- The project remains in a zero-existing-user, forward-only phase.
- Existing public host reads can be removed without a compatibility period.
- `fieldValue(path)` and domain-owned selector primitives remain the default selector input family for this spec.
- Future selector helper naming or type-safety improvements require a separate reopen and must not block this cutover.
- Playground remains a product witness, not the owner of kernel selector law.

## Implementation Result Snapshot

Status on 2026-04-30:

- Public React no-arg host read has been removed from the public hook type surface and guarded by `packages/logix-react/test-dts/canonical-hooks.surface.ts`.
- Core owns selector precision, route decision, selector fingerprint, path-authority normalization, and dirty fallback classification under `packages/logix-core/src/internal/runtime/core/selectorRoute.*.ts`.
- React host consumes `RuntimeContracts.Selector.route(...)`, uses selector fingerprint as read-query topic identity, and no longer keeps a local `selectorTopicEligible` route policy.
- `StateTransaction.ts` dirty, patch, and snapshot helpers have been split into mutually exclusive files with a no-behavior guard test.
- Selector-quality evidence now serializes through an internal slim artifact shape. `Runtime.check` may report static selector-quality artifact refs, startup trial may report startup selector-quality artifact refs, and host evidence appears only through debug trace or explicit host harness.
- Non-Playground business witnesses landed for form row editing, master-detail imported child reads, and dashboard independent cards.
- Performance evidence remains open until comparable before/after collect and diff files are written under `perf/`.
