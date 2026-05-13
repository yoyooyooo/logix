# Feature Spec: Runtime-Live Debug Event Source Bridge

**Feature Branch**: `179-debug-event-source-bridge`
**Created**: 2026-05-04
**Status**: Implemented

## Role

179 promotes the former `diagnostics` and `process-events` structured gaps from the runtime inspect coverage inventory to owner-backed runtime-live event windows.

It owns the source bridge that feeds owner-approved DebugSink diagnostic/process records into the 175 runtime-live ledger at explicit read/capture time.

179 is not a new event owner. Runtime-live ledger remains the owner of event envelopes, ordering, watermarks and operation windows. DebugSink remains source material only.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger foundation: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- CLI grammar and transport envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

## Target

`logix live events --target <target> --kind diagnostic` and `--kind process` must return owner-backed `LiveInspectArtifact(section="events")` when the attached runtime has owner-approved diagnostic or process source records.

The bridge must:

- expose or inject bounded diagnostic/process source records into the live ledger source
- normalize records only during explicit events/capture reads
- preserve 175 ordering, watermark and target lifecycle ownership
- return owner-coded gaps for missing source, disabled diagnostics or unsupported source kind
- avoid always-on ledger payload projection

## Implemented Closure

175 already defines `LiveDebugSourceRecord`, `addDebugSourceRecord`, `addRuntimeDebugEventRef` and capture-time normalization inside `packages/logix-core/src/internal/runtime/core/liveLedger.ts`.

`packages/logix-react/src/internal/dev/lifecycleCarrier.ts` hosts the runtime-live operation ledger for browser-handled live operations and now feeds owner-approved DebugSink diagnostic/process source records into that ledger.

`packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` returns diagnostic/process event reads only when the carrier exposes owner-backed runtime-live windows; it keeps owner-coded gaps when source records are absent or disabled.

`packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts` records `diagnostics` and `process-events` as owner-backed with core, React carrier and daemon carrier proofs.

## Source Bridge Law

Debug source records are source material, not inspect facts.

The bridge may expose:

- target coordinate
- diagnostic or process kind
- label/code/severity
- bounded serializable metadata summary
- `txnSeq / opSeq / linkId` when available
- degraded, redaction and gap markers

The bridge must not expose:

- DebugSink ring internals
- raw Runtime objects
- closures, functions or runtime handles
- process-global mutable buffers as owner truth
- always-on ledger projection side effects when live inspect is disabled

## Read-Time Normalization Law

Diagnostic/process source records enter runtime-live ledger envelopes only when an explicit live events/capture read requests those kinds.

The resulting event envelopes must be indistinguishable from other 175 ledger events in terms of target scoping, order, watermark, budget, redaction and cleanup behavior.

Unsupported DebugSink events must remain owner-coded gaps. Missing source records must not be reported as valid empty diagnostic windows unless the owner can prove the target had no relevant diagnostic/process source.

## User Scenarios & Testing

### User Story 1 - Inspect Diagnostic Events (Priority: P1)

As an Agent, I can request diagnostic events for a live target and receive ordered runtime-live ledger events with bounded diagnostic metadata.

**Independent Test**: Feed owner-approved diagnostic source records into the lifecycle carrier, request `inspect.events(kind="diagnostic")`, and verify returned events preserve target, order, watermark and sourceAuthority `runtime-live`.

### User Story 2 - Inspect Process Events (Priority: P1)

As an Agent, I can request process events and correlate them with operation ledger refs.

**Independent Test**: Feed process source records with `txnSeq / opSeq / linkId`, request `inspect.events(kind="process")`, and verify the ledger output preserves those coordinates.

### User Story 3 - Preserve Disabled Overhead (Priority: P2)

As a maintainer, I can disable diagnostics or live inspect without hidden event payload allocation.

**Independent Test**: Disable diagnostic normalization and assert reads return owner-coded gaps while allocation counters remain unchanged.

## Functional Requirements

- **FR-001**: The system MUST provide a live source bridge from owner-approved DebugSink diagnostic/process records into 175 runtime-live ledger read-time normalization.
- **FR-002**: The bridge MUST NOT make DebugSink, browser adapter, daemon, CLI or Workbench owners of diagnostic/process event facts.
- **FR-003**: Diagnostic/process event output MUST be `LiveInspectArtifact(section="events")` backed by `LiveOperationWindow`.
- **FR-004**: Diagnostic/process records MUST preserve target coordinate, order key inputs and `txnSeq / opSeq / linkId` when available.
- **FR-005**: Unsupported source records MUST emit runtime-live structured gaps.
- **FR-006**: Disabled diagnostics MUST emit owner-coded gaps without allocating diagnostic/process ledger payload projections.
- **FR-007**: Carrier outputs MUST preserve runtime-live owner markers and gap codes.
- **FR-008**: Public CLI grammar MUST remain unchanged.
- **FR-009**: Runtime inspect coverage inventory MUST move `diagnostics` and `process-events` from structured gap to owner-backed only after source bridge, React carrier and daemon carrier proofs pass.

## Non-Functional Requirements

- **NFR-001**: The bridge MUST have near-zero overhead when live inspect or diagnostics are disabled.
- **NFR-002**: Source metadata MUST be JSON-safe and bounded.
- **NFR-003**: Source bridge state MUST be target-scoped or lease-scoped and cleaned with target lifecycle.
- **NFR-004**: The bridge MUST not introduce always-on DebugSink push into live ledger buffers.
- **NFR-005**: Diagnostic/process output MUST avoid verification verdict fields, repair hints, raw runtime handles and process-global truth.

## Key Entities

- **LiveDebugSourceBridge**: Carrier/runtime integration that feeds owner-approved source records into a ledger store.
- **LiveDebugSourceRecord**: Bounded source material accepted by 175 normalization.
- **DiagnosticProcessEventWindow**: `LiveOperationWindow` filtered to diagnostic/process event kinds.

## Success Criteria

- **SC-001**: `logix live events --kind diagnostic` returns owner-backed ledger events when diagnostic source records exist.
- **SC-002**: `logix live events --kind process` returns owner-backed ledger events when process source records exist.
- **SC-003**: Missing, disabled and unsupported source cases emit stable runtime-live gaps.
- **SC-004**: Carrier and export proofs preserve owner markers without rewriting diagnostic/process facts.
- **SC-005**: Runtime inspect coverage inventory records `diagnostics` and `process-events` as owner-backed only after proof passes.

## Reopen Rules

Reopen 179 if:

- DebugSink cannot provide owner-approved target coordinates
- diagnostic/process normalization requires always-on ledger payload projection
- process events need a new owner taxonomy outside runtime-live
- public CLI grammar must change
