# Contract: Selector Route Closure

This file defines required observable contracts for implementation and tests. It does not freeze exact public API names for internal records.

## C1 Public Host Read Surface

Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-026.

Contract:

- Public host reads use `useSelector(handle, selector, equalityFn?)`.
- Public no-arg host read is not a success path.
- L0/L1 generated examples use selector inputs.
- Function selector examples are expert-only or negative.
- Public authoring material does not teach internal evidence nouns.

Proof:

- Type-surface test rejects no-arg public host read.
- README, SSoT, skills, examples text sweep classifies remaining hits as negative, internal, history, or test-only.

## C2 Core Precision Admission

Requirements: FR-006, FR-007, FR-008, FR-009, FR-011, FR-012, FR-013.

Contract:

- Every host-visible read receives core precision classification.
- Precision qualities include exact, broad-root, broad-state, dynamic, debug, and unknown.
- Core route decision returns exact subscription, rejection, or internal resilience.
- Internal resilience requires an internal marker.
- Dev/test policy rejects broad, dynamic, unknown, and unsafe debug host projection.

Proof:

- Core contract tests cover all precision qualities.
- React host tests prove rejected cases do not reach broad module subscription.
- Public export tests prove debug/resilience marker is not exported.

## C3 Selector Fingerprint Identity

Requirements: FR-014, FR-015.

Contract:

- Read topic and graph entry identity use selector fingerprint.
- Fingerprint covers static shape, reads, equality, projection/operator shape, and path-authority digest or epoch.
- Selector id is diagnostic label only.

Proof:

- Same label with different fingerprint does not share a topic or graph entry.
- Same shape with same path authority can reuse when fingerprint matches.
- Changing path authority invalidates fingerprint match.

## C4 Dirty/Read Overlap

Requirements: FR-016, FR-017, FR-018, FR-019, FR-020.

Contract:

- Read paths and dirty paths use one path-id authority.
- Dirty precision reports dirty-all, missing path authority, missing dirty path, selector without exact precision, unsafe coarse root, and evaluate-all fallback.
- Dirty-side precision loss rejects or surfaces strict failure under dev/test when host projection is affected.
- Inferred dirty information is source-marked.

Proof:

- Nested dirty path affects only overlapping selector reads.
- Missing path authority rejects or reports strict failure.
- Dirty-all and evaluate-all fallback do not silently publish all host selectors.

## C5 React Host Route Consumption

Requirements: FR-010, FR-011, FR-024.

Contract:

- React host calls core precision/route for every host read.
- React host does not maintain independent broad/dynamic/topic eligibility.
- React host trace includes enough metadata to diagnose selector label, fingerprint, precision quality, route, and fallback reason.

Proof:

- Tests fail if React calculates route from local `selectorTopicEligible`-style logic after core route exists.
- Dynamic and broad selector cases reject under dev/test.
- Exact selector input subscribes by core route identity.

## C6 Verification Control Plane Layering

Requirements: FR-021, FR-022, FR-023, FR-024.

Contract:

- `runtime.check` reports only static/build selector-quality artifacts.
- Startup trial reports selector policy wiring and startup artifacts only.
- Host projection precision enters report only through explicit host evidence artifact, scenario evidence, or repo-internal host harness evidence.
- Reports produce structured repair hints for selector precision failures.

Proof:

- Static check cannot claim React commit or subscription fanout evidence.
- Startup trial cannot claim browser host render isolation.
- Host harness or scenario evidence can carry host projection precision with stable coordinates.

## C7 Business Witnesses

Requirements: FR-025, SC-010.

Contract:

- Form row editing uses field value, error, companion, and row companion selector inputs.
- Master-detail imported child reads use exact selector inputs.
- Dashboard independent cards use local selector ownership.
- Playground remains product witness only.

Proof:

- Each witness proves broad read rejection, dynamic fallback rejection, exact selector update locality, and dirty precision strict failure.

## C8 Performance And Diagnostics

Requirements: NFR-001, NFR-002, NFR-003, NFR-004, NFR-007, SC-011.

Contract:

- Exact selector steady-state remains within accepted performance budget.
- Diagnostics disabled path avoids unbounded additional overhead.
- Dev/test strict diagnostics are measured and serializable.

Proof:

- Before/after perf evidence is written under `specs/169-kernel-selector-route/perf/`.
- Diff is comparable before claiming success.
