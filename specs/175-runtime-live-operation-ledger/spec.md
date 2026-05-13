# Feature Spec: Runtime-Live Operation Ledger

**Feature Branch**: `175-runtime-live-operation-ledger`
**Created**: 2026-05-04
**Status**: Done

## Role

175 implements the runtime-live operation ledger foundation required by [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md).

The ledger owns causal coordination. It does not own every inspect payload.

175 is successful only if live operations, diagnostics/process events and future timeline projections can share one target-scoped causal record without using latest current state as historical proof.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)
- Runtime reflection binding foundation: [../174-reflection-live-binding-model/spec.md](../174-reflection-live-binding-model/spec.md)

## Target

Runtime-live operation ledger must provide owner-backed causal records for:

- event envelope
- target coordinate
- attachment id
- ordering
- `txnSeq / opSeq / linkId`
- watermark
- stateAfter source ref law
- diagnostics/process event envelope
- operation window refs

Runtime-live current-state projection remains distinct from historical stateAfter. Latest state must not backfill historical timeline items.

## Current Implementation That Must Yield

`packages/logix-core/src/internal/runtime/core/liveTypes.ts` currently has operation facets, capture facets and target coordinates, but it does not define a ledger event envelope or watermark law.

`packages/logix-core/src/internal/runtime/core/liveOperations.ts` currently emits completed, failed and capture facets directly. It has no ordered target-scoped operation window and uses operation kind as a stable-looking operation id. This is insufficient for causal replay.

`packages/logix-core/src/internal/runtime/core/liveAttachment.ts` currently tracks attachment lifecycle and basic diagnostics counters. It does not drain a ledger window, record target-scoped watermarks or prove disabled overhead for ledger buffers.

`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` already projects debug events with `txnSeq`, `opSeq`, `linkId`, diagnostics and process metadata. These are valid source materials, but DebugSink is not the live operation ledger owner. The ledger must import or normalize owner-approved refs instead of making DebugSink output a second Runtime inspect truth.

172 event and timeline routes are closed as owner-backed-or-gap. 175 may replace those gaps with owner-backed ledger windows, but it must not reopen 172 as a roadmap.

## Ledger Event Envelope

Every ledger event must be target-scoped and serializable.

Minimum envelope fields:

- schema version
- ledger event id
- target coordinate
- attachment id when known
- event kind
- event label
- source authority `runtime-live`
- order key
- watermark after ingest
- optional `txnSeq`
- optional `opSeq`
- optional `linkId`
- optional artifact ref
- optional binding header from 174 for reflected dispatch
- budget, redaction and degraded markers
- payload ref or bounded payload summary
- structured gaps

The envelope may carry refs to reflection, field-runtime, React host or profile payloads. It cannot own those payloads.

## Ordering And Watermark Law

Ordering must be stable per live target.

The order key is derived from owner-approved runtime coordinates in this priority order:

1. explicit ledger sequence allocated by the runtime-live ledger for that target
2. `txnSeq` plus `opSeq` when both are available
3. `txnSeq` plus event sequence when `opSeq` is missing
4. ingest sequence with degraded marker when runtime coordinates are unavailable

Watermark represents the latest ledger position known for one target. It must include the target coordinate and enough order information to compare event windows.

Watermark must not be process-global.

`linkId` joins related operation, diagnostic, process, field and host evidence across owners. It is a join key, not ordering by itself.

## StateAfter Source Ref Law

Historical stateAfter is allowed only from owner-approved source refs:

- recorded post-event state artifact ref
- event-carried state artifact ref
- exact current-head state ref when the event watermark equals the current target watermark

Current latest state cannot be copied backward into older ledger events.

When stateAfter source is unavailable, over budget or redacted, the ledger emits a structured gap. It does not synthesize state.

Allowed gap codes include:

- `missing-state-after-source`
- `state-after-over-budget`
- `state-after-redacted`
- `state-after-watermark-mismatch`

Future timeline projection may read these refs, but timeline query shape is not owned by 175.

## Diagnostics And Process Envelope

Diagnostics and process events must become runtime-live ledger events only through an owner-approved normalization path.

The normalized envelope owns:

- event kind
- label or code
- severity when available
- target coordinate
- `txnSeq / opSeq / linkId`
- bounded metadata ref or summary
- degraded/redaction markers

The ledger does not own process static summaries, reflection payload schema, field semantic payloads or UI display shape.

Unsupported diagnostic or process source events must produce structured gaps with owner `runtime-live`.

## Operation Window Law

An operation window is a bounded, target-scoped slice of ledger events.

Window requests must include:

- target coordinate
- optional attachment id
- limit or budget
- optional event kind filter
- optional watermark cursor

Window output must include:

- target coordinate
- start and end watermarks
- events in stable order
- dropped/degraded markers
- structured gaps

Field filtering, timeline item composition and summary aggregation are not 175 owners. They may be promoted only after 175 and 176 gates pass.

## Runtime And Owner Boundaries

Runtime-live ledger owns causal envelope, ordering, watermark, target lifecycle cleanup and stateAfter source refs.

Reflection live binding owns manifest/action/schema binding facts.

Field-runtime owns field semantic payloads and semantic adjacency.

React host owns host evidence payloads and selector/render identity, after a future promotion gate.

Profile owner owns local profiling payloads, after a future promotion gate.

Canonical evidence packages ledger refs and owner facts. It cannot become the operation ledger.

CLI, daemon, browser adapter and Workbench are carriers or consumers only.

## Cleanup And Disabled Overhead

Ledger buffers must be target-scoped and cleaned with runtime target lifecycle.

Attachment cleanup must either drain pending evidence refs or emit degraded dropped markers.

When live inspect is disabled, the runtime must not allocate ledger buffers or collect operation windows. Existing debug paths may continue their own disabled behavior, but they do not count as live ledger collection.

When diagnostics are disabled, ledger ingestion from diagnostics/process streams must have near-zero overhead and must not allocate payload projections.

## Performance And Memory Hardening

175 treats ledger retention as part of the runtime contract.

Ledger storage must be target-scoped and bounded. The terminal implementation should use a per-target ring buffer or equivalent bounded window store rather than an unbounded append-only list.

Each target ledger must define:

- max event count
- max inline byte budget
- optional max age or watermark retention policy
- overflow behavior
- dropped-event marker shape
- cleanup trigger

Overflow must preserve causal honesty. When events are dropped, the ledger must emit dropped or degraded markers with enough information for later windows to know that the window is incomplete. It must not silently present a partial window as complete.

Operation window capture must be lazy. A target may record bounded ledger events only when live inspect or owner-approved live evidence collection is enabled. Window projection payloads must be allocated only for explicit capture/read requests.

Diagnostics and process normalization must be gated separately from ordinary DebugSink recording. If diagnostics are disabled, 175 must not allocate normalization metadata or ledger payload projections. If diagnostics are enabled but live ledger is disabled, DebugSink may continue its own debug behavior, but no live ledger buffer should be allocated.

StateAfter payloads must stay behind refs. The ledger may store stateAfter source refs and bounded summaries, but it must not retain full state snapshots inline unless an explicit byte budget allows it.

Carrier memory must remain lease-bound. Browser adapter, daemon and CLI may hold pending operation requests and responses, but they must not retain unbounded operation windows or stale target ledger snapshots after target cleanup.

The 175 implementation cannot exit until retention, overflow, disabled-allocation and carrier queue cleanup are covered by focused tests.

## User Scenarios & Testing

### User Story 1 - Capture Target-Scoped Operation Window (Priority: P1)

As an Agent, I can request an operation window for a live target and receive ordered runtime-live ledger events with start and end watermarks.

**Independent Test**: Record accepted, completed and failed operations for one target, capture an event window, and verify target coordinate, ordering and watermarks are stable.

### User Story 2 - Preserve True StateAfter Sources (Priority: P1)

As a debugger, I can trust that historical stateAfter comes from recorded post-event source refs, not from latest state backfill.

**Independent Test**: Record two operations, update current state after both, and verify the first event either cites its own stateAfter source ref or emits a gap instead of copying latest state.

### User Story 3 - Normalize Diagnostics And Process Events (Priority: P2)

As an Agent, I can inspect diagnostic and process events through the same ledger envelope used for operations.

**Independent Test**: Feed diagnostic and process source events with `txnSeq / opSeq / linkId`, capture a window, and verify normalized envelope fields plus bounded metadata.

### User Story 4 - Cleanup Follows Target Lifecycle (Priority: P2)

As a maintainer, I can revoke or disconnect a target without leaving stale ledger windows behind.

**Independent Test**: Attach a target, record ledger events, cleanup the attachment, and verify subsequent window reads return a terminal-target gap or drained refs rather than stale events.

## Functional Requirements

- **FR-001**: The system MUST provide a runtime-live owner ledger for target-scoped operation events.
- **FR-002**: Ledger events MUST include target coordinate, event kind, order key and watermark.
- **FR-003**: Ledger events MUST carry `txnSeq`, `opSeq` and `linkId` when owner-approved source events provide them.
- **FR-004**: Operation windows MUST be bounded, target-scoped and ordered.
- **FR-005**: Watermarks MUST be target-scoped and comparable within one target.
- **FR-006**: StateAfter MUST cite recorded post-event source refs, event-carried state refs or exact current-head refs.
- **FR-007**: Latest current state MUST NOT backfill historical stateAfter.
- **FR-008**: Missing, oversized, redacted or watermark-mismatched stateAfter MUST emit structured gaps.
- **FR-009**: Diagnostics events MUST normalize into runtime-live ledger envelopes when owner-approved source refs are available.
- **FR-010**: Process events MUST normalize into runtime-live ledger envelopes when owner-approved source refs are available.
- **FR-011**: Ledger buffers MUST clean up with target lifecycle.
- **FR-012**: Disabled live inspect MUST NOT allocate ledger buffers.
- **FR-013**: Canonical evidence export MUST package ledger refs without becoming the ledger owner.
- **FR-014**: CLI, daemon, browser adapter and Workbench MUST NOT own ordering, watermark or stateAfter truth.
- **FR-015**: Live output MUST NOT contain verification verdict fields.
- **FR-016**: Ledger storage MUST be target-scoped and bounded by event count and inline byte budgets.
- **FR-017**: Ledger overflow MUST emit dropped or degraded markers instead of silently presenting incomplete windows as complete.
- **FR-018**: Diagnostics/process normalization MUST be gated separately from DebugSink recording.
- **FR-019**: StateAfter data MUST be stored as refs or bounded summaries, not retained as unbounded inline state snapshots.
- **FR-020**: Carrier queues MUST release pending windows and responses when the target lifecycle closes.

## Non-Functional Requirements

- **NFR-001**: Ledger ingestion MUST be bounded by per-target event and byte budgets.
- **NFR-002**: Ledger event payloads MUST be JSON-safe or represented by artifact refs and degraded markers.
- **NFR-003**: Disabled-mode overhead MUST be proven with allocation counters or focused tests.
- **NFR-004**: Ledger ordering MUST be deterministic for snapshot comparison.
- **NFR-005**: Ledger cleanup MUST be idempotent for terminal attachments.
- **NFR-006**: Public surface sweep MUST show no new public inspect or devtools root.
- **NFR-007**: Per-target ledger buffers MUST have explicit retention and overflow tests.
- **NFR-008**: Diagnostics-disabled mode MUST not allocate diagnostics/process ledger payload projections.
- **NFR-009**: Window capture MUST allocate projection payloads only for explicit capture/read requests.
- **NFR-010**: Carrier-side operation windows MUST remain lease-bound and lifecycle-cleaned.

## Key Entities

- **LiveOperationLedger**: Runtime-live owner store for target-scoped causal events.
- **LiveLedgerEventEnvelope**: Serializable event envelope with target, order, watermark and owner refs.
- **LiveLedgerOrderKey**: Stable per-target ordering key.
- **LiveLedgerWatermark**: Comparable target-scoped ledger cursor.
- **LiveStateAfterSourceRef**: Ref or gap explaining where post-event state comes from.
- **LiveOperationWindow**: Bounded event slice returned to inspect/capture callers.
- **LiveLedgerCleanupResult**: Drain or dropped evidence result for target lifecycle cleanup.

## Success Criteria

- **SC-001**: Captured event windows contain ordered events and start/end watermarks for one target.
- **SC-002**: Diagnostics and process events use owner-backed runtime-live envelopes.
- **SC-003**: Historical stateAfter never copies latest current state unless exact current-head watermark proves it is the same event.
- **SC-004**: Missing stateAfter emits owner-coded structured gaps.
- **SC-005**: Ledger cleanup follows target lifecycle and does not expose stale windows after cleanup.
- **SC-006**: Disabled live inspect does not allocate ledger buffers.
- **SC-007**: Canonical evidence packages ledger refs without redefining ordering or watermark truth.
- **SC-008**: Text sweep finds no forbidden public roots, planning-only code names or second-truth language in the 175 surface.
- **SC-009**: Per-target retention and overflow behavior is proven with dropped/degraded markers.
- **SC-010**: Diagnostics-disabled mode proves no diagnostics/process ledger projection allocation.
- **SC-011**: StateAfter refs do not retain unbounded inline state snapshots.
- **SC-012**: Carrier pending windows are released on target cleanup.

## Reopen Rules

Reopen 175 if:

- owner-approved debug source events cannot provide stable target coordinates
- `txnSeq / opSeq / linkId` cannot be normalized without a new runtime coordinate law
- stateAfter source refs cannot be represented without copying latest state
- disabled overhead requires always-on buffers
- timeline projection must be promoted before ledger and field-runtime gates close
- bounded ring/window retention cannot preserve enough causal honesty for Agent replay
- diagnostics/process normalization requires always-on payload projection
