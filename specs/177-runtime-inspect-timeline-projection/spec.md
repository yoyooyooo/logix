# Feature Spec: Runtime Inspect Timeline Projection

**Feature Branch**: `177-runtime-inspect-timeline-projection`
**Created**: 2026-05-04
**Status**: Implemented

## Role

177 implements the promoted timeline projection row from [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md).

It owns only timeline query and output projection shape. It consumes the runtime-live operation ledger from [175](../175-runtime-live-operation-ledger/spec.md) and field semantic payloads from [176](../176-field-runtime-inspect-model/spec.md).

177 is not a new runtime evidence owner. It does not own ordering, watermark, stateAfter source law, field semantics, React host evidence, profile payloads, CLI grammar or canonical evidence export envelope.

## Imported Authority

- Owner law and promotion gate: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella and backlog review: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger foundation: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field-runtime inspect foundation: [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- CLI grammar and transport envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

## Target

`logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>]` must return an owner-backed `LiveInspectArtifact(section="timeline")` when the attached runtime can provide a 175 operation window.

The timeline projection must provide:

- stable target-scoped item ordering derived from 175
- start and end watermark refs derived from 175
- per-item `LiveStateAfterSourceRef` display or owner-coded stateAfter gaps from 175
- optional field-path filter derived from 176 field semantic payload joins
- budget, truncation, degraded and redaction markers preserved from source owners
- structured runtime-live or field-runtime gaps when required inputs are missing

## Current Implementation That Must Yield

`packages/logix-core/src/internal/runtime/core/liveInspect.ts` already has `timeline` as a `LiveInspectSection`, but there is no owner-backed timeline projection.

`packages/logix-core/src/internal/runtime/core/liveLedger.ts` already provides `LiveOperationWindow`, watermarks and `LiveStateAfterSourceRef`. 177 must consume these facts instead of redefining them.

`packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts` already provides field semantic payload joins. 177 must consume those joins for `--field` filtering instead of scanning raw field state, raw graph assets or latest field summaries as timeline truth.

`packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` currently answers `inspect.events` with an operation window artifact and leaves `inspect.timeline` on the generic gap path. The adapter must transport owner timeline artifacts without owning timeline semantics.

`packages/logix-cli/src/internal/liveDaemonServer.ts` already routes `inspect.timeline` through the live daemon carrier and times out to `missing-operation-window`. The daemon must continue to be a carrier only.

`packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts` currently records timeline as a structured gap. 177 can close that row only after owner-backed timeline projection and carrier proof land.

## Timeline Query Law

Timeline query input is limited to the existing CLI grammar:

- target coordinate or target query
- optional attachment id
- optional field path
- optional limit
- request budget and redaction policy carried by the live lane

Implementation may reuse internal operation-window request fields such as cursor or event-kind filter when the carrier already supplies them, but 177 must not expand public CLI grammar.

180 supersession note: [180-runtime-timeline-continuation-and-evidence-segment](../180-runtime-timeline-continuation-and-evidence-segment/spec.md) adds exactly one public timeline grammar upgrade, `--cursor <token>`, for same-query continuation. That upgrade belongs to 180 only. 177's no-new-grammar rule remains valid for baseline timeline projection and does not authorize wall-clock flags or raw watermark JSON grammar.

Missing target, terminal target, missing operation window, unsupported carrier and over-budget projection must return structured gaps. A timeline query must never silently downgrade into latest-state snapshot output.

## Timeline Item Law

Each timeline item is a projection from one `LiveLedgerEventEnvelope`.

Allowed item facts include:

- item id derived from the ledger event id
- target coordinate
- event kind and label
- order key and watermark ref from 175
- `txnSeq`, `opSeq` and `linkId` when present
- payload owner refs or bounded summaries already present in the ledger envelope
- stateAfter source ref or stateAfter gap from 175
- field semantic match summary from 176 when a field filter is requested
- owner degraded, redaction, dropped and structured gap markers

Timeline items must not contain verification verdict fields, repair hints, current latest state backfill, raw field graph objects, React render payloads or profile samples.

## Field Filter Join Law

`--field <path>` filters timeline items only through 176-owned field semantic payloads joined to 175 ledger envelopes by target, watermark or `linkId`.

When field semantic metadata is unavailable, mismatched or over budget, the projection must emit a field-runtime structured gap and mark completeness as degraded. It must not present a filtered timeline as complete when relevant source events may have been skipped.

The field filter may include:

- matched field path
- field identity digest when available
- semantic event kind
- relation digest when relevant
- field snapshot digest or source ref
- degraded/redaction markers

The field filter may not inspect raw field program, raw graph edges, runtime handles, `SubscriptionRef`, closure identity or latest field summary as a substitute for event metadata.

## Runtime And Owner Boundaries

Runtime-live ledger owns ordering, watermark, operation envelope and stateAfter source refs.

Field-runtime owns field semantic payloads and field identity.

Reflection owns manifest/action/schema binding facts.

React host evidence and local profiler owner remain deferred.

Canonical evidence packages timeline artifact refs, source refs and owner gaps. It cannot become the timeline owner or synthesize missing stateAfter/field facts.

CLI, daemon, browser adapter and Workbench are carriers or consumers only.

## Budget, Redaction And Cleanup

Timeline projection is target-scoped and explicitly requested.

When live inspect or timeline projection is disabled, runtime must not allocate timeline item payloads, projection caches or carrier-retained timeline owner data.

Timeline projection must reuse bounded operation windows. Large timelines must truncate or degrade with counts, watermarks, dropped markers, owner gap codes and artifact refs.

If projection caches are introduced, they must be derived, target-scoped and cleaned with target lifecycle. They must not outlive the operation window or field semantic payloads they summarize.

Carriers may hold a timeline response only for request delivery or evidence export lease. They must not retain unbounded timeline windows after target cleanup.

## User Scenarios & Testing

### User Story 1 - Inspect Ordered Timeline (Priority: P1)

As an Agent, I can request a live target timeline and receive ordered items with stable watermarks and stateAfter source refs or explicit gaps.

**Independent Test**: Record accepted, completed and failed events with stateAfter source refs, request `inspect.timeline`, and verify item order, watermarks and stateAfter facts are derived from the 175 operation window.

### User Story 2 - Filter Timeline By Field (Priority: P1)

As an Agent debugging a field change, I can request a field-filtered timeline and see only events with owner-backed field semantic joins, plus gaps when filtering cannot be proven complete.

**Independent Test**: Join ledger events with field semantic payloads for multiple field paths, request `inspect.timeline` with one field path, and verify matching items keep 175 and 176 ownership separate.

### User Story 3 - Preserve Carrier Boundaries (Priority: P2)

As a CLI or browser adapter implementer, I can transport timeline artifacts without defining private timeline ordering or stateAfter rules.

**Independent Test**: Browser adapter and daemon carrier tests verify `LiveInspectArtifact(section="timeline")` preserves owner markers and does not rewrite ordering, watermark, stateAfter or field gap codes.

### User Story 4 - Degrade Honestly Under Missing Inputs (Priority: P2)

As a maintainer, I can distinguish missing operation windows, missing field event metadata, over-budget timelines and terminal targets from valid empty timelines.

**Independent Test**: Simulate missing window, missing field metadata, over-budget projection and target cleanup, then verify each returns owner-coded gaps or degraded completeness.

## Functional Requirements

- **FR-001**: The system MUST provide owner-backed `LiveInspectArtifact(section="timeline")` for targets with a readable 175 operation window.
- **FR-002**: Timeline projection MUST derive ordering and watermarks from 175 only.
- **FR-003**: Timeline projection MUST display `LiveStateAfterSourceRef` or 175 owner-coded stateAfter gaps without copying latest current state.
- **FR-004**: Timeline query MUST preserve existing CLI grammar and MUST NOT add a new public command or flag family.
- **FR-005**: Timeline items MUST be JSON-safe and bounded.
- **FR-006**: `--field` filtering MUST use 176 field semantic payload joins only.
- **FR-007**: Missing or mismatched field semantic metadata MUST emit a field-runtime structured gap or degraded marker.
- **FR-008**: Missing operation windows MUST emit a runtime-live structured gap rather than a fabricated empty timeline.
- **FR-009**: Dropped events, overflow and truncated projections MUST preserve dropped/degraded markers.
- **FR-010**: Browser adapter, daemon, CLI and Workbench MUST NOT own timeline ordering, watermark, stateAfter or field semantics.
- **FR-011**: Canonical evidence export MUST package timeline refs and gaps without redefining timeline truth.
- **FR-012**: Timeline output MUST NOT contain verification verdict fields, repair hints or replay/time-travel commands.
- **FR-013**: Timeline projection MUST clean derived caches or retained responses with target lifecycle.

## Non-Functional Requirements

- **NFR-001**: Disabled live inspect or disabled timeline projection MUST not allocate timeline item payloads or projection caches.
- **NFR-002**: Projection cost MUST be bounded by requested limit, operation-window budget and inline byte budget.
- **NFR-003**: Timeline item identity MUST be deterministic for snapshot comparison.
- **NFR-004**: Field filtering MUST NOT scan raw field graph, raw field program, runtime handles or `SubscriptionRef`.
- **NFR-005**: Carrier memory MUST remain lease-bound and lifecycle-cleaned.
- **NFR-006**: Public surface sweep MUST show no new public inspect, devtools, reflection or timeline root.

## Key Entities

- **LiveTimelineProjection**: Owner-side projection from a 175 operation window into timeline output.
- **LiveTimelineItem**: Bounded item derived from one `LiveLedgerEventEnvelope`.
- **LiveTimelineQuery**: Internal query derived from existing live CLI grammar and carrier payload.
- **LiveTimelineFieldFilter**: 176-backed field semantic filter and completeness marker.
- **LiveTimelineCompleteness**: Complete, partial, degraded or gap state derived from source owner evidence.
- **LiveTimelineGap**: Structured runtime-live or field-runtime gap emitted when projection cannot prove a requested timeline fact.

## Success Criteria

- **SC-001**: `inspect.timeline` returns ordered timeline items with target-scoped start and end watermarks for a target with ledger events.
- **SC-002**: Historical stateAfter in timeline output is always a 175 source ref or gap, never latest current state backfill.
- **SC-003**: Field-filtered timeline items join 176 field semantic payloads while preserving 175 envelope ownership.
- **SC-004**: Missing operation window, missing field metadata, over-budget projection and terminal target each emit stable owner-coded gaps or degraded markers.
- **SC-005**: Browser adapter and daemon transport timeline artifacts without rewriting owner, ordering, watermark, stateAfter or field gap codes.
- **SC-006**: Runtime inspect coverage inventory moves timeline from structured gap to owner-backed only after core, carrier and export proofs pass.
- **SC-007**: Text sweep finds no forbidden public roots, planning-only code names or second-truth language in the 177 surface.
- **SC-008**: Disabled timeline projection shows no timeline payload allocation, projection cache allocation or carrier-retained owner data.

## Entry Gates

177 may enter implementation because:

- 175 has closed ledger envelope, ordering, watermark, stateAfter, retention, overflow and cleanup proof.
- 176 has closed field semantic payload join and carrier preservation proof.
- SSoT 18 promotion gate has been satisfied by 173 WP-007.

## Exit Gates

177 exits only after:

- timeline projection consumes 175 operation windows without redefining ledger law
- field filters consume 176 semantic payloads without redefining field law
- missing source inputs emit owner-coded gaps
- carriers preserve timeline owner markers and remain lease-bound
- canonical evidence export derives timeline refs from owner artifacts only
- disabled allocation, bounded projection and lifecycle cleanup are covered by focused tests
- Runtime inspect coverage harness records timeline as owner-backed

## Reopen Rules

Reopen 177 if:

- timeline projection requires a new ordering, watermark or stateAfter law
- field filtering cannot be implemented without raw field graph or latest summary backfill
- CLI grammar beyond 180's `--cursor <token>` is required to express the minimal timeline query
- disabled allocation requires always-on timeline buffers
- React host evidence or local profile payload must become part of timeline truth before their owners are promoted
