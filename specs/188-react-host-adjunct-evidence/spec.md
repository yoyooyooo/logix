# Feature Specification: React Host Adjunct Evidence Closure

**Feature Branch**: `188-react-host-adjunct-evidence`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for React Host Adjunct Evidence Closure: close React host diagnosis blind spots as adjunct evidence only, without creating a second runtime truth or verification verdict lane."

## Implementation Result

Implemented on 2026-05-08. React host adjunct evidence now closes through adjunct-only selector/render evidence, interaction linkage, bounded local profile summaries carried by `LiveCapture(captureKind="profile")`, disagreement markers, disabled-safety and production bundle isolation proof. Proof refs: `packages/logix-react/test/internal/dev/live-host-adjunct-evidence.contract.test.ts`, `packages/logix-react/test/internal/dev/live-interaction-linkage.contract.test.ts`, `packages/logix-react/test/internal/dev/live-profile-summary.contract.test.ts`, `packages/logix-react/test/internal/dev/live-profile-disabled.guard.test.ts`, `packages/logix-react/test/internal/dev/live-host-adjunct-disabled.guard.test.ts`, `packages/logix-react/test/internal/dev/live-host-adjunct-cleanup.guard.test.ts`, `packages/logix-react/test/internal/dev/live-browser-adapter.contract.test.ts`, `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`, `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`, `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-evidence-facets.contract.test.ts`, `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`, `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`, `examples/logix-react/test/production-bundle-dev-isolation.guard.ts`.

## Current Role

- This page holds the minimum necessary SSoT for React host adjunct evidence as a terminal Agent diagnosis requirement.
- This page is the adopted terminal successor for host diagnosis blind spots after the standalone 182 direction was stopped.
- This page does not make React host evidence a Runtime fact owner or verification verdict owner.

## Context

Runtime owner facts explain declaration, runtime state, operation windows, field semantics, and live evidence. Some Agent diagnosis gaps can still involve React host behavior: selector/render boundary, interaction linkage, local profile summary, or host cleanup. These facts are useful only as adjunct evidence.

The terminal requirement is to admit enough React host adjunct evidence to close real Agent blind spots while preserving:

- Runtime truth wins over host adjunct evidence.
- React host evidence does not own timeline ordering, stateAfter, field semantics, selector authority, repair hints, or verdicts.
- Export happens through canonical evidence packaging or repo-internal host harness output unless public CLI authority is reopened.

## Scope

### In Scope

- Selector/render boundary adjunct evidence.
- Interaction linkage using target, attachment, transaction, operation, link, and artifact refs.
- Local profile summary as bounded local diagnosis evidence.
- Host cleanup and lifecycle adjunct evidence where tied to runtime hot lifecycle or dev lifecycle carrier.
- Structured gap and disagreement markers for missing or conflicting host evidence.
- Disabled capture, no extra subscription fanout, no transaction-window IO, and cleanup proof.

### Out of Scope

- React host as Runtime fact owner.
- React host verification verdicts, repair hints, compare truth, or stage scheduling.
- New `logix debug` namespace or new host evidence public command route.
- Second selector authority.
- Browser HMR protocol, replay system, or scenario execution.
- Reviving `182-react-host-adjunct-evidence` as standalone owner.

## Imported Authority

- [docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [specs/158-runtime-hmr-lifecycle/spec.md](../158-runtime-hmr-lifecycle/spec.md)
- [specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md](../180-runtime-timeline-continuation-and-evidence-segment/spec.md)
- [specs/182-react-host-adjunct-evidence/spec.md](../182-react-host-adjunct-evidence/spec.md)
- [specs/183-agent-debug-closure/spec.md](../183-agent-debug-closure/spec.md)
- [specs/187-live-diagnosis-evidence/spec.md](../187-live-diagnosis-evidence/spec.md)

## Closure & Guardrails

### Closure Contract

- React host adjunct evidence closes documented Agent diagnosis blind spots that runtime owner facts cannot answer alone.
- Host evidence links to runtime facts only through approved coordinates and refs.
- Missing, ambiguous, conflicting, redacted, or degraded host evidence returns structured gap or disagreement markers.
- Disabled mode proves no host capture buffer, no render subscription fanout, no transaction-window IO, bounded cleanup, and no public route drift.

### Must Cut

- No host-owned verification verdicts.
- No host-owned timeline ordering, stateAfter, field semantics, selector truth, or compare truth.
- No always-on host capture without explicit proof.
- No public debug namespace.
- No standalone 182 revival.

### Reopen Bar

Reopen only if Agent diagnosis requires host evidence that cannot be expressed as adjunct evidence linked to runtime owner facts, and the evidence has a bounded, disabled-safe, no-second-truth proof path.

## User Scenarios & Testing

### User Story 1 - Explain A React Host Blind Spot (Priority: P1)

An Agent has runtime evidence but still cannot explain a UI symptom involving selector/render boundary or interaction linkage. Host adjunct evidence must supply the missing context without overriding runtime truth.

**Why this priority**: This is the primary value of host adjunct evidence.

**Independent Test**: Use repo-internal host harness or evidence package fixtures to show host context linked to runtime target and operation refs.

**Acceptance Scenarios**:

1. **Given** runtime evidence for an operation, **When** host adjunct evidence is available, **Then** it links through approved coordinates and clarifies the host boundary.
2. **Given** host evidence conflicts with runtime facts, **When** the evidence is packaged, **Then** the output marks disagreement and runtime truth remains authoritative.

---

### User Story 2 - Bound Local Profile Evidence (Priority: P2)

An Agent needs local performance context for a diagnosis. The host lane may provide a bounded local profile summary that links back to runtime facts.

**Why this priority**: Performance diagnosis is valuable, but high risk if profile evidence becomes unbounded or authoritative.

**Independent Test**: Capture profile summary fixtures under explicit budget and verify redaction, bound, and link refs.

**Acceptance Scenarios**:

1. **Given** an authorized local profile summary, **When** it is exported, **Then** it includes budget, redaction, target, and link refs.
2. **Given** profile capture is disabled or over budget, **When** requested, **Then** it returns a structured gap or degraded marker.

---

### User Story 3 - Prove Disabled Safety (Priority: P1)

React host adjunct evidence must not impose cost when disabled.

**Why this priority**: Host instrumentation can easily damage hot paths or render isolation.

**Independent Test**: Run disabled-overhead and cleanup proofs.

**Acceptance Scenarios**:

1. **Given** adjunct evidence is disabled, **When** host renders and runtime operations run, **Then** no host capture buffer or extra subscription fanout is allocated.
2. **Given** a target is disposed, **When** host cleanup runs, **Then** bounded host buffers and refs are released.

### Edge Cases

- Host evidence arrives without matching target coordinate.
- Host evidence is delayed relative to runtime event window.
- Multiple render boundaries claim the same linkage.
- Selector fingerprint is missing or degraded.
- Profile capture is denied, redacted, over budget, or local-only.
- Host cleanup evidence exists but runtime target was already disposed.

## Requirements

### Functional Requirements

- **FR-001**: React host adjunct evidence MUST only supplement runtime owner facts and MUST NOT override them.
- **FR-002**: Adjunct evidence linkage MUST use target coordinate, attachment id, transaction sequence, operation sequence, link id, artifact ref, gap, redaction, and degraded markers.
- **FR-003**: Selector/render identity MUST reference React host law and MUST NOT create a second selector authority.
- **FR-004**: Host adjunct evidence MUST NOT contain verification verdicts, repair hints, next-stage scheduling, or compare truth.
- **FR-005**: Missing, ambiguous, conflicting, redacted, or degraded linkage MUST produce structured gap or disagreement markers.
- **FR-006**: Local profile summaries MUST be bounded, local-only, redaction-preserving, and linked to runtime facts through approved refs.
- **FR-007**: Exported host adjunct evidence MUST enter canonical evidence packaging or repo-internal host harness output unless CLI authority is reopened.
- **FR-008**: Disabled adjunct evidence MUST allocate no host capture buffer and add no render subscription fanout.
- **FR-009**: Host evidence collection MUST not perform IO inside runtime transaction windows.
- **FR-010**: Host buffers, linkage indexes, and profile summaries MUST clean up with target or host lifecycle.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Disabled host adjunct evidence MUST have measurable near-zero overhead.
- **NFR-002**: Enabled host evidence MUST have explicit memory, event, profile, and byte budgets.
- **NFR-003**: Host evidence payloads MUST be slim, serializable, redaction-preserving, and bounded.
- **NFR-004**: Diagnostics MUST make host evidence authority class explicit: adjunct, local-only, gap, degraded, or disagreement.
- **NFR-005**: Documentation and specs MUST state that runtime truth wins when host adjunct evidence disagrees.

### Key Entities

- **Host Adjunct Evidence**: React host context that supplements runtime facts.
- **Interaction Linkage**: Approved refs connecting host event or render context to runtime operation facts.
- **Local Profile Summary**: Bounded local performance summary with no Runtime fact ownership.
- **Disagreement Marker**: Structured output when host adjunct evidence conflicts with runtime owner facts.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At least one proof demonstrates host adjunct evidence closing an Agent diagnosis blind spot without producing verdicts or repair hints.
- **SC-002**: Disabled-overhead proof confirms no host capture buffer, no extra subscription fanout, and no transaction-window IO.
- **SC-003**: Conflict fixtures show runtime truth wins and host disagreement is marked structurally.
- **SC-004**: Profile summary fixtures prove explicit budget, redaction, local-only status, and runtime refs.
- **SC-005**: Active docs route standalone 182 as stopped and this spec or 183 as the terminal adopted closure path.
