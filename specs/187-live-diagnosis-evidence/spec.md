# Feature Specification: Live Diagnosis Evidence Closure

**Feature Branch**: `187-live-diagnosis-evidence`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for Live Diagnosis Evidence Closure: make logix live a runtime diagnosis evidence lane that exports canonical evidence into verification without producing verdicts or repair hints."

## Implementation Result

Implemented on 2026-05-08. `logix live` now closes as an evidence lane through `LiveCommandResult`, owner-backed `LiveInspectArtifact` / `LiveOperationFacet` / `LiveCapture` / `CanonicalEvidencePackage` / `EvidenceGap` families, daemon-backed target discovery and canonical evidence handoff into verification. Proof refs: `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`, `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`, `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`, `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`, `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`, `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`, `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-evidence-facets.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts`, `packages/logix-core/test/internal/LiveBridge/live-evidence-segment.contract.test.ts`.

## Current Role

- This page holds the minimum necessary SSoT for live diagnosis evidence as part of Agent self-verification.
- This page owns the product-level closure that lets Agents move from active runtime inspection to canonical evidence handoff.
- This page does not own live fact authority; fact authority remains with runtime owners defined by SSoT 18 and predecessor specs.

## Context

The live lane already separates itself from verification: `LiveCommandResult` must not contain verdicts, repair hints, or next-stage scheduling. The terminal requirement is to make the lane usable as an Agent diagnosis path without letting CLI, daemon, browser adapter, or Workbench become Runtime fact owners.

The final live diagnosis flow is:

```text
live start/status -> targets -> inspect/drilldown -> capture/snapshot/wait/dispatch/profile -> export evidence -> trial/compare
```

Live output provides owner-backed facts, operation facets, capture refs, profile summaries, evidence refs, or structured gaps. Verification repair still belongs to `VerificationControlPlaneReport`.

## Scope

### In Scope

- Public `logix live <task>` diagnosis route surface.
- Owner-backed `LiveInspectArtifact(section=...)` and structured gaps.
- Target discovery, state, actions, events, timeline, fields, field graph, field summary, summary, capture, snapshot, wait, dispatch, profile summary, and export evidence.
- Canonical evidence export and handoff into trial or compare.
- Proof that live output does not carry verification verdict authority.

### Out of Scope

- New `logix debug` or flat live root commands.
- Verification verdicts, repair hints, or next-stage scheduling in live output.
- Daemon-owned Runtime facts, ordering, timeline completeness, or repair truth.
- Scenario execution.
- React host adjunct evidence beyond refs or deferred ownership; terminal host adjunct work is owned by spec 188.

## Imported Authority

- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [specs/171-agent-live-runtime-bridge/spec.md](../171-agent-live-runtime-bridge/spec.md)
- [specs/172-agent-first-runtime-inspect-data-plane/spec.md](../172-agent-first-runtime-inspect-data-plane/spec.md)
- [specs/173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- [specs/174-reflection-live-binding-model/spec.md](../174-reflection-live-binding-model/spec.md)
- [specs/175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- [specs/176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- [specs/177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)
- [specs/178-runtime-summary-projection/spec.md](../178-runtime-summary-projection/spec.md)
- [specs/179-debug-event-source-bridge/spec.md](../179-debug-event-source-bridge/spec.md)
- [specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md](../180-runtime-timeline-continuation-and-evidence-segment/spec.md)
- [specs/185-repair-intent-contract/spec.md](../185-repair-intent-contract/spec.md)

## Closure & Guardrails

### Closure Contract

- Agents can discover a live target, inspect owner-backed facts or structured gaps, export canonical evidence, and feed it into verification.
- Every live artifact family has proof that it excludes verification verdicts, repair hints, and next-stage scheduling.
- Evidence handoff proof shows verification reports can link repair hints back to evidence artifacts after evidence is consumed.
- CLI, daemon, browser adapter, and Workbench remain carriers or consumers only.

### Must Cut

- No `logix debug` namespace.
- No flat live roots.
- No live verdict or repair hint.
- No daemon-computed Runtime truth.
- No raw runtime handles, raw field graph, source maps, AST indexes, or task history as live fact truth.

### Reopen Bar

Reopen only if a real Agent diagnosis workflow cannot obtain necessary owner-backed facts or structured gaps through existing live tasks and canonical evidence handoff.

## User Scenarios & Testing

### User Story 1 - Inspect A Live Target (Priority: P1)

An Agent needs runtime context from a running app. It must discover live targets and inspect state, actions, events, timeline, fields, or summary through owner-backed artifacts.

**Why this priority**: Runtime context is the main reason live lane exists.

**Independent Test**: Run daemon-backed live route tests and inspect only `LiveCommandResult` artifacts.

**Acceptance Scenarios**:

1. **Given** a running live daemon and browser attachment, **When** the Agent runs `live targets`, **Then** target rows include stable runtime, module, instance, and attachment coordinates.
2. **Given** a target coordinate, **When** the Agent runs a drilldown route, **Then** the primary artifact is `LiveInspectArtifact` or an owner-coded gap.

---

### User Story 2 - Export Evidence To Verification (Priority: P1)

An Agent captures a live diagnosis window and needs verification to produce repair hints. Live must export canonical evidence and trial or compare must consume it.

**Why this priority**: This keeps live diagnosis useful without making live a verifier.

**Independent Test**: Run live capture or snapshot export and feed the package to trial startup.

**Acceptance Scenarios**:

1. **Given** a live capture ref, **When** `live export evidence` runs, **Then** the result is a canonical evidence ref or structured gap.
2. **Given** exported evidence, **When** trial consumes it, **Then** any repair hints come from the verification report and can link to evidence artifacts.

---

### User Story 3 - Preserve No-Second-Truth Boundaries (Priority: P2)

An Agent or tool must not treat live output as verification truth. Live artifacts must be useful but non-authoritative for verdicts.

**Why this priority**: This prevents a second control plane.

**Independent Test**: Sweep live result schemas and artifacts for forbidden fields.

**Acceptance Scenarios**:

1. **Given** any live command result, **When** it is serialized, **Then** it contains no `verdict`, `repairHints`, `nextRecommendedStage`, or `primaryReportOutputKey`.
2. **Given** retained daemon evidence, **When** it is exported, **Then** it preserves owner markers and does not synthesize missing facts.

### Edge Cases

- No daemon is running.
- Target disappeared between discovery and inspect.
- Attachment is ambiguous or missing.
- Timeline cursor is expired or mismatched.
- Evidence lease is missing, expired, or over budget.
- Live dispatch precondition fails and must be denied without mutation.

## Requirements

### Functional Requirements

- **FR-001**: Live commands MUST return `LiveCommandResult`, not `CommandResult`.
- **FR-002**: Live artifacts MUST be limited to target, inspect, operation, capture, profile, canonical evidence ref, evidence gap, or transport error families authorized by SSoT 15.
- **FR-003**: Live output MUST NOT contain verification verdict, repair hints, next-stage scheduling, or primary report output key.
- **FR-004**: Every successful inspect route MUST return owner-backed facts or explicit structured gaps.
- **FR-005**: Target-specific live commands MUST use target coordinates selected from actual live target discovery.
- **FR-006**: Evidence export MUST preserve owner facts, gaps, redaction, degraded markers, artifact refs, and lease provenance.
- **FR-007**: Live-derived evidence MUST affect repair only after a verification command consumes the evidence.
- **FR-008**: Mutation-capable dispatch MUST use declared action admission and produce structured denial without mutation on precondition failure.
- **FR-009**: Timeline continuation MUST use opaque cursor tokens and owner-backed safe resume boundaries.
- **FR-010**: CLI, daemon, browser adapter, and Workbench MUST remain carriers or consumers, not fact owners.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Disabled live inspect MUST not allocate owner buffers, projection payloads, or background collectors.
- **NFR-002**: Live outputs MUST be bounded by explicit event, byte, retention, and lease budgets.
- **NFR-003**: Live evidence MUST preserve redaction, degraded, dropped, and structured gap markers.
- **NFR-004**: Per-target owner indexes and buffers MUST clean up with target or manifest lifecycle.
- **NFR-005**: Public docs and skills MUST explain that live output is evidence, not verdict authority.

### Key Entities

- **Live Target Coordinate**: Runtime, module, instance, and optional attachment identity.
- **Live Inspect Artifact**: Owner-backed or gap-bearing inspect output for a specific section.
- **Canonical Evidence Package**: Verification-consumable evidence export.
- **Evidence Gap**: Structured reason that requested live facts are unavailable or inadmissible.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Public live route proof covers target discovery, state/actions/events/timeline/fields/summary, capture/snapshot, wait/dispatch, profile summary, and export evidence.
- **SC-002**: Schema and tests prove 100% of live command outputs exclude verdict, repair hints, next stage, and primary report fields.
- **SC-003**: At least one end-to-end proof demonstrates live evidence export followed by verification report repair hint linkage.
- **SC-004**: Runtime inspect coverage inventory records no unmapped P1 owner-backed fact family without owner-coded gap or deferred/rejected status.
- **SC-005**: Disabled-overhead proof shows live diagnosis does not add hot-path allocation or background collection when disabled.
