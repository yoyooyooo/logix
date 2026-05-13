# Feature Spec: Runtime Inspect Summary Projection

**Feature Branch**: `178-runtime-summary-projection`
**Created**: 2026-05-04
**Status**: Implemented

## Role

178 promotes the remaining `summary` structured gaps from the runtime inspect coverage inventory into a standalone composition projection.

It owns only `LiveInspectArtifact(section="summary")` query and output shape. It consumes runtime-live operation windows from [175](../175-runtime-live-operation-ledger/spec.md) and field-runtime summaries from [176](../176-field-runtime-inspect-model/spec.md).

178 is not a new evidence owner. It does not own ledger ordering, watermarks, stateAfter, field semantics, diagnostics/process event normalization, React host evidence, profile payloads, CLI grammar or canonical evidence export.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger foundation: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field-runtime inspect foundation: [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- Timeline projection precedent: [../177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)
- CLI grammar and transport envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

## Target

`logix live summary --target <target> [--attachment <attachmentId>]` must return an owner-backed `LiveInspectArtifact(section="summary")` when the attached runtime can provide a 175 operation window and/or a 176 field summary.

The summary projection must provide:

- bounded recent operation/event counts derived from 175 operation windows
- bounded event-kind counts derived from 175 event envelopes
- latest operation marker derived from 175 order and watermark facts
- field convergence summary derived from 176 field-runtime summary source
- owner-coded structured gaps for missing operation window or missing field summary
- degraded/truncated/redaction markers preserved from source owners

## Implementation Closure

`packages/logix-core/src/internal/runtime/core/liveSummary.ts` now provides `LiveInspectArtifact(section="summary")` composition helpers.

`packages/logix-react/src/internal/dev/lifecycleCarrier.ts` now exposes `projectSummary(...)`; `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` routes `inspect.summary` through that owner projection.

`packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts` now records `operation-summary` and `field-converge` as owner-backed.

175 already provides bounded operation windows, watermarks and event envelopes. 176 already provides latest field summary artifacts. 178 must compose those facts without inventing a third owner.

## Summary Query Law

Summary query input is limited to existing CLI grammar:

- target coordinate or target query
- optional attachment id
- request budget and redaction policy carried by the live lane

178 must not add public CLI flags. If later implementation needs internal knobs such as count limits or section masks, they must remain carrier/internal until a separate CLI grammar decision changes SSoT 15.

## Summary Projection Law

Allowed output facts include:

- target coordinate
- operation count
- event count
- event-kind counts
- latest operation/event marker with 175 watermark/order refs
- operation-window completeness, dropped and degraded markers
- latest field convergence summary from 176
- owner-coded gaps for missing owner inputs
- artifact refs for over-budget details

Output must not contain:

- raw operation window payloads as a full dump
- raw field graph, raw field program, runtime handles or `SubscriptionRef`
- React render/selector evidence
- profile samples
- verification verdict fields or repair hints
- synthesized current latest state as historical event summary

## Owner Boundaries

Runtime-live ledger owns operation/event envelope, order, watermark and window completeness.

Field-runtime owns field convergence summary and field semantic payload.

178 owns only summary query normalization and composition output shape.

CLI, daemon, browser adapter and Workbench remain carriers or consumers only.

## User Scenarios & Testing

### User Story 1 - Inspect Runtime Summary (Priority: P1)

As an Agent, I can request a live target summary and receive compact operation/event counts with latest owner refs.

**Independent Test**: Record accepted and completed events in a 175 window, request `inspect.summary`, and verify counts and latest marker derive from the operation window without reordering.

### User Story 2 - Include Field Convergence Summary (Priority: P1)

As an Agent debugging field behavior, I can see field convergence status in the same summary output without reading raw field internals.

**Independent Test**: Provide a 176 field summary source, request `inspect.summary`, and verify the field convergence section preserves field-runtime owner markers and degraded reasons.

### User Story 3 - Degrade Honestly Under Missing Inputs (Priority: P2)

As a maintainer, I can distinguish missing operation windows and missing field summaries from valid empty summaries.

**Independent Test**: Simulate missing operation window and missing field summary independently, and verify owner-coded gaps remain separate.

## Functional Requirements

- **FR-001**: The system MUST provide owner-backed `LiveInspectArtifact(section="summary")` when 175 operation windows or 176 field summaries are available.
- **FR-002**: Summary operation/event counts MUST derive only from 175 operation windows.
- **FR-003**: Summary field convergence facts MUST derive only from 176 field-runtime summaries.
- **FR-004**: Summary projection MUST preserve source owner redaction, dropped, degraded and gap markers.
- **FR-005**: Missing operation window MUST emit a runtime-live structured gap instead of a fabricated empty summary.
- **FR-006**: Missing field summary MUST emit a field-runtime structured gap without blocking operation summary facts that are available.
- **FR-007**: Browser adapter, daemon, CLI and Workbench MUST NOT own summary facts or rewrite owner gap codes.
- **FR-008**: Canonical evidence export MUST package summary artifact refs and owner gaps only.
- **FR-009**: Public CLI grammar MUST remain unchanged.
- **FR-010**: Runtime inspect coverage inventory MUST record `operation-summary` and `field-converge` as owner-backed only after core, React carrier and daemon carrier proofs pass.

## Non-Functional Requirements

- **NFR-001**: Disabled summary projection MUST allocate no summary payloads, caches or carrier-retained owner data.
- **NFR-002**: Summary output MUST be bounded by request and owner budgets.
- **NFR-003**: Summary identity and ordering refs MUST be deterministic for snapshot comparison.
- **NFR-004**: Summary projection MUST avoid raw owner internals and verification verdict fields.
- **NFR-005**: Carrier memory MUST remain lease-bound and target-lifecycle-cleaned.

## Key Entities

- **LiveSummaryProjection**: Composition payload for `section="summary"`.
- **LiveSummaryOperationSlice**: Bounded operation/event counts and latest marker derived from 175.
- **LiveSummaryFieldConvergenceSlice**: Field convergence summary derived from 176.
- **LiveSummaryGap**: Structured runtime-live or field-runtime gap for missing owner inputs.

## Success Criteria

- **SC-001**: `logix live summary` returns operation/event counts for a target with ledger events.
- **SC-002**: Field convergence summary appears when 176 owner data exists and remains absent with a field-runtime gap when it does not.
- **SC-003**: Summary output never contains raw field graph/program data, React host evidence, profile samples, verification verdicts or repair hints.
- **SC-004**: Carrier and export proofs preserve owner markers without rewriting summary facts.
- **SC-005**: Runtime inspect coverage inventory records `operation-summary` and `field-converge` as owner-backed only after proof passes.

## Reopen Rules

Reopen 178 if:

- summary projection needs a new operation ordering, watermark or stateAfter law
- field convergence cannot reuse 176 summary ownership
- public CLI grammar must change
- React host evidence or profile payload must become part of summary truth before their owners are promoted
