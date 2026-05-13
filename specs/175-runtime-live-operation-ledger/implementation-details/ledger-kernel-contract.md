# Runtime-Live Operation Ledger Kernel Contract Implementation Plan

> **For agentic workers:** REQUIRED: implement from this contract before touching runtime code. This repository's `AGENTS.md` overrides the writing-plans default commit habit: do not run `git add`, `git commit`, `git push`, `git checkout`, `git reset`, `git clean` or `git stash` unless the user explicitly requests it. Use `checkpoint: review diff` instead of commits.

**Goal:** Freeze the kernel contract for the target-scoped runtime-live operation ledger so 175 can be implemented deterministically without moving ordering, watermark or stateAfter truth into carriers or DebugSink.

**Architecture:** The ledger is a lazy, target-scoped bounded ring/window store owned by runtime-live. Operation write points push owner events into the ledger; diagnostics and process events are normalized at capture time from owner-approved DebugSink records so DebugSink remains source material, not a second ledger owner. Carriers transport request and response DTOs only.

**Tech Stack:** TypeScript, Vitest, Effect V4 test environment where existing runtime tests require it, existing `LiveBridge` internal API exports.

---

## Authority

This contract refines, and must not contradict:

- [SSoT 18 Runtime Inspect Evidence Contract](../../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [173 umbrella spec](../../173-runtime-inspect-evidence-end-state/spec.md)
- [175 spec](../spec.md)
- [172 parity matrix](../../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

SSoT 18 remains the owner law. This file freezes implementation-level DTO, lifecycle, retention and proof choices for 175.

## File Responsibilities

- Create `packages/logix-core/src/internal/runtime/core/liveLedger.ts`: ledger DTO helpers, target-scoped ring/window store, ordering, watermark, retention, overflow, stateAfter refs and diagnostics/process normalization entry points.
- Modify `packages/logix-core/src/internal/runtime/core/liveTypes.ts`: shared DTOs that must cross `live-bridge-api` boundaries, especially marker, budget and window request/output types.
- Modify `packages/logix-core/src/internal/live-bridge-api.ts`: export only core-owned ledger DTOs and helpers. Do not add public reflection, runtime inspect or runtime devtools roots.
- Modify `packages/logix-core/src/internal/runtime/core/liveOperations.ts`: route accepted, denied, completed, failed and capture operation events through the ledger when live inspect collection is enabled.
- Modify `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`: create ledger stores lazily, bind cleanup to target/attachment lifecycle, expose disabled allocation counters.
- Modify `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`: keep old facets as projections from ledger events where needed.
- Modify `packages/logix-core/src/internal/runtime/core/liveInspect.ts`: package operation windows as `LiveInspectArtifact(section="events")` and keep timeline/stateAfter gaps owner-coded.
- Modify `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`: expose or route owner-approved source records for capture-time normalization only. Do not push every DebugSink event into a ledger buffer.
- Test under `packages/logix-core/test/internal/LiveBridge/`.
- Carrier files may be touched only after core DTO shape is stable, and only to transport request/response DTOs without owning order, watermark or stateAfter.

## Contract Defaults

These defaults are part of the 175 contract until dogfood evidence reopens them:

```ts
export const defaultLiveLedgerRetentionPolicy = {
  schemaVersion: 'live-ledger-retention.v1',
  maxEvents: 128,
  maxInlineBytes: 64 * 1024,
  maxPayloadSummaryBytes: 2 * 1024,
  maxStateAfterSummaryBytes: 1024,
  maxWindowEvents: 64,
  maxDroppedMarkers: 16,
  maxCarrierQueueEntries: 16,
} as const
```

Request budget handling:

- `LiveOperationRequest.budget.maxEvents` caps the returned window, not the target ledger retention.
- Effective window limit is `min(request.budget.maxEvents, retention.maxWindowEvents)`.
- Effective inline response budget is `min(request.budget.maxInlineBytes, retention.maxInlineBytes)`.
- If a request omits usable values, use `maxWindowEvents=64` and `maxInlineBytes=64 * 1024`.
- `timeoutMs` stays a carrier/request deadline. It must not affect ledger ordering.

Reopen these defaults only if one of these is observed:

- core dogfood needs more than 128 retained target events for a single debugging step
- normal event payload summaries exceed 2 KiB after projection
- stateAfter summaries above 1 KiB are required to avoid useless gaps
- daemon/browser queue pressure needs more than 16 concurrent pending window requests per attachment
- p95 capture or memory evidence shows these defaults are too large for disabled or low-overhead live inspect

## Exact DTO Contract

DTOs are JSON-safe. They may reference existing `LiveTargetCoordinate`, `LiveBindingHeader`, `LiveBudgetProfile`, `LiveRedactionMarker`, `LiveStructuredEvidenceGap` and `VerificationControlPlaneArtifactRef`.

```ts
export type LiveLedgerSchemaVersion = 'live-ledger.v1'
export type LiveLedgerEventSchemaVersion = 'live-ledger-event.v1'
export type LiveLedgerMarkerSchemaVersion = 'live-ledger-marker.v1'
export type LiveLedgerSourceAuthority = 'runtime-live'

export type LiveLedgerEventKind =
  | 'operation.accepted'
  | 'operation.denied'
  | 'operation.completed'
  | 'operation.failed'
  | 'capture.eventWindow'
  | 'diagnostic'
  | 'process'

export interface LiveLedgerRetentionPolicy {
  readonly schemaVersion: 'live-ledger-retention.v1'
  readonly maxEvents: number
  readonly maxInlineBytes: number
  readonly maxPayloadSummaryBytes: number
  readonly maxStateAfterSummaryBytes: number
  readonly maxWindowEvents: number
  readonly maxDroppedMarkers: number
  readonly maxCarrierQueueEntries: number
}

export interface LiveOperationLedger {
  readonly kind: 'live.operation.ledger'
  readonly schemaVersion: LiveLedgerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly retention: LiveLedgerRetentionPolicy
  readonly currentWatermark: LiveLedgerWatermark
  readonly eventCount: number
  readonly inlineBytes: number
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
}

export interface LiveLedgerEventEnvelope {
  readonly kind: 'live.ledger.event'
  readonly schemaVersion: LiveLedgerEventSchemaVersion
  readonly eventId: string
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly attachmentId?: string
  readonly eventKind: LiveLedgerEventKind
  readonly label: string
  readonly sourceAuthority: LiveLedgerSourceAuthority
  readonly order: LiveLedgerOrderKey
  readonly watermark: LiveLedgerWatermark
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly linkId?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly binding?: LiveBindingHeader
  readonly payload?: LiveLedgerPayloadRef
  readonly stateAfter?: LiveStateAfterSourceRef
  readonly budget: LiveLedgerBudgetSnapshot
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
}

export interface LiveLedgerOrderKey {
  readonly kind: 'live.ledger.order'
  readonly schemaVersion: 'live-ledger-order.v1'
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly coordinate:
    | { readonly kind: 'ledger-seq'; readonly ledgerSeq: number }
    | { readonly kind: 'txn-op'; readonly txnSeq: number; readonly opSeq: number }
    | { readonly kind: 'txn-event'; readonly txnSeq: number; readonly eventSeq: number }
    | { readonly kind: 'ingest'; readonly ingestSeq: number; readonly degraded: LiveLedgerDegradedMarker }
}

export interface LiveLedgerWatermark {
  readonly kind: 'live.ledger.watermark'
  readonly schemaVersion: 'live-ledger-watermark.v1'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly eventId?: string
  readonly droppedBeforeSeq?: number
  readonly inlineBytes: number
}

export interface LiveLedgerBudgetSnapshot {
  readonly retention: LiveLedgerRetentionPolicy
  readonly request?: LiveBudgetProfile
  readonly inlineBytes: number
  readonly payloadBytes?: number
  readonly stateAfterBytes?: number
}

export interface LiveLedgerPayloadRef {
  readonly kind: 'bounded-summary' | 'artifact-ref' | 'owner-ref'
  readonly owner: 'runtime-live' | 'reflection' | 'field-runtime' | 'react-host' | 'profile'
  readonly digest?: string
  readonly summary?: JsonValue
  readonly summaryBytes?: number
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly ownerRef?: string
}

export interface LiveStateAfterSourceRef {
  readonly kind: 'live.stateAfter.sourceRef'
  readonly schemaVersion: 'live-state-after-source-ref.v1'
  readonly eventId: string
  readonly sourceKind: 'recorded-post-event-artifact' | 'event-carried-state-artifact' | 'current-head-exact'
  readonly sourceWatermark: LiveLedgerWatermark
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly digest?: string
  readonly boundedSummary?: {
    readonly value: JsonValue
    readonly bytes: number
    readonly truncated: boolean
  }
}

export interface LiveOperationWindowRequest {
  readonly target: LiveTargetCoordinate
  readonly attachmentId?: string
  readonly cursor?: LiveLedgerWatermark
  readonly limit?: number
  readonly eventKinds?: ReadonlyArray<LiveLedgerEventKind>
  readonly budget?: LiveBudgetProfile
}

export interface LiveOperationWindow {
  readonly kind: 'live.operation.window'
  readonly schemaVersion: 'live-operation-window.v1'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly attachmentId?: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly cursor?: LiveLedgerWatermark
  readonly limit: number
  readonly events: ReadonlyArray<LiveLedgerEventEnvelope>
  readonly completeness: 'complete' | 'partial-dropped' | 'degraded'
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly budget: LiveLedgerBudgetSnapshot
}

export interface LiveLedgerDroppedMarker {
  readonly kind: 'live.ledger.dropped'
  readonly schemaVersion: LiveLedgerMarkerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason:
    | 'retention.maxEvents'
    | 'retention.maxInlineBytes'
    | 'projection.maxInlineBytes'
    | 'cleanup.target-terminal'
    | 'carrier.target-closed'
  readonly droppedCount: number
  readonly firstDroppedSeq?: number
  readonly lastDroppedSeq?: number
  readonly observedAt: LiveLedgerWatermark
}

export interface LiveLedgerDegradedMarker {
  readonly kind: 'live.ledger.degraded'
  readonly schemaVersion: LiveLedgerMarkerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason:
    | 'missing-runtime-coordinate'
    | 'payload-over-budget'
    | 'state-after-over-budget'
    | 'state-after-redacted'
    | 'state-after-watermark-mismatch'
    | 'unsupported-debug-event'
    | 'diagnostics-disabled'
    | 'window-partial'
  readonly summary: string
  readonly observedAt: LiveLedgerWatermark
}
```

No DTO may include verification verdict fields such as `verdict`, `repairHints`, `nextRecommendedStage` or `passed`.

## Ordering And Watermark Rules

Target identity:

- `targetKey` is `liveTargetCoordinateKey(makeLiveTargetCoordinate(target))`.
- Order and watermark comparison is defined only when `targetKey` matches.
- Comparing different targets must return `incomparable`, not a boolean ordering.

Ledger sequence:

- Every ingested envelope receives one target-local monotonic `ledgerSeq`.
- `eventId` is `live-ledger:${targetKey}:${ledgerSeq}`.
- `currentWatermark.ledgerSeq` equals the highest retained or observed `ledgerSeq` for the target.
- `droppedBeforeSeq` is the highest sequence fully known to have been dropped before the retained window.

Coordinate selection:

1. Use `coordinate.kind='ledger-seq'` for runtime-live operation events allocated directly by the ledger.
2. Use `coordinate.kind='txn-op'` when `txnSeq` and `opSeq` are both present on owner-approved source records.
3. Use `coordinate.kind='txn-event'` when `txnSeq` and source `eventSeq` are present and `opSeq` is missing.
4. Use `coordinate.kind='ingest'` with degraded reason `missing-runtime-coordinate` when runtime coordinates are unavailable.

Stable event order:

- Primary sort is target-local `ledgerSeq`, because the ledger owns a total target order at ingestion.
- `coordinate` records why the order is trusted or degraded. It does not let DebugSink, process runtime or carriers reorder ledger-owned events after ingestion.
- Ties on `ledgerSeq` are invalid and must fail tests.

Watermark comparison:

- `compareWatermark(a, b)` returns `'before' | 'same' | 'after' | 'incomparable'`.
- Same target: compare `ledgerSeq`.
- Different target: return `incomparable`.
- Missing or malformed watermark in input requests returns structured gap `invalid-ledger-watermark`.

## Retention And Window Store

Store shape:

- Store is `Map<targetKey, TargetLedgerStore>`.
- Each `TargetLedgerStore` has a ring of `LiveLedgerEventEnvelope`, a bounded marker ring and counters.
- Store allocation is lazy. No target store exists until live inspect collection is enabled and the target receives a ledger event or explicit window capture.

Retention behavior:

- On ingest, project payload/stateAfter summaries before inserting.
- If a single event exceeds `maxPayloadSummaryBytes`, keep an artifact or owner ref, add degraded `payload-over-budget`, and do not inline the oversized payload.
- If stateAfter exceeds `maxStateAfterSummaryBytes`, omit `stateAfter`, add gap `state-after-over-budget`, and add degraded `state-after-over-budget`.
- After insertion, evict oldest events until both `eventCount <= maxEvents` and `inlineBytes <= maxInlineBytes`.
- Every eviction emits one `LiveLedgerDroppedMarker` covering the dropped sequence range.
- The dropped marker ring keeps at most `maxDroppedMarkers=16`; if marker retention itself overflows, coalesce oldest markers into one marker with the combined count and sequence span.

Window read behavior:

- With no cursor, return the latest `limit` events in stable order.
- With cursor, return events with `event.order.ledgerSeq > cursor.ledgerSeq`.
- If `cursor.ledgerSeq < droppedBeforeSeq`, return available events plus dropped marker and `completeness='partial-dropped'`.
- If no store exists for an enabled target, return `LiveOperationWindow` with no events and gap `missing-operation-window`.
- If the target or attachment is terminal/cleaned, return no stale events and gap `target-ledger-cleaned`.
- `eventKinds` filters event envelopes after ordering and before applying the output limit. Dropped markers still report incomplete history if the requested range intersects dropped sequences.

## StateAfter Law

Allowed `LiveStateAfterSourceRef.sourceKind` values:

- `recorded-post-event-artifact`: a runtime-live post-event state artifact recorded at the event watermark.
- `event-carried-state-artifact`: an artifact ref carried by the source event itself.
- `current-head-exact`: only when `event.watermark.ledgerSeq === currentWatermark.ledgerSeq` for the same target.

Forbidden:

- copying latest current state into an older event
- retaining unbounded inline state snapshots in the ledger
- carrier-provided stateAfter payloads
- timeline projection inventing stateAfter when the ledger omitted it

Required stateAfter gap codes:

- `missing-state-after-source`
- `state-after-over-budget`
- `state-after-redacted`
- `state-after-watermark-mismatch`

## DebugSink Normalization Choice

175 chooses **capture-time pull normalization** for diagnostics and process events.

Rules:

- DebugSink remains a debug record producer and source material. It does not own ledger envelopes, watermarks, ordering or stateAfter.
- The ledger normalizes owner-approved DebugSink records only when a live operation window or events inspect read is explicitly requested.
- Live operation events still push directly at runtime-live operation write points. The capture-time choice applies to diagnostics/process DebugSink records.
- Diagnostics/process normalization is separately gated by diagnostics availability and live ledger enablement.
- When diagnostics are disabled, do not allocate diagnostics/process ledger payload projections. A read may return gap `diagnostics-disabled` or `unsupported-event-kind`, depending on the requested filter and available source.

Why this choice:

- It preserves disabled-allocation law because DebugSink recording does not allocate ledger buffers.
- It prevents DebugSink from becoming a second runtime inspect truth.
- It keeps carrier reads deterministic because normalized envelopes are produced by runtime-live at capture/read time, with target-scoped watermarks.

## Wire Contract

Core wire export:

- `live-bridge-api.ts` exports DTO types and runtime-live helpers from `liveLedger.ts`.
- Carriers may transport `LiveOperationWindowRequest`, `LiveOperationWindow` and `LiveLedgerEventEnvelope`.
- Carriers must not sort events, compare watermarks, synthesize dropped markers or create stateAfter refs.

Inspect artifact projection:

- `LiveInspectArtifact(section="events")` payload may contain:

```ts
{
  schemaVersion: 'live-inspect.v1'
  generatedBy: string
  operationWindow: LiveOperationWindow
}
```

- `LiveInspectArtifact(section="timeline")` remains a structured gap until a future timeline projection spec is promoted. If a future projection consumes ledger windows, it must use `LiveStateAfterSourceRef` and must not define new stateAfter law.

## Lifecycle And Cleanup

Attachment states that trigger ledger cleanup:

- `revoked`
- `disconnected`
- `target-unavailable`
- `cleaned`

Cleanup algorithm:

- Resolve all targets owned by the attachment.
- For each target, close pending window projections first.
- Remove carrier queue entries for the target or attachment.
- If retained ledger events cannot be drained to evidence refs, emit dropped marker reason `cleanup.target-terminal`.
- Delete the target store from the ledger map.
- Mark attachment cleanup result with drained evidence refs when available, otherwise degraded `no-pending-evidence` or dropped marker reason.
- Any later read for the target returns gap `target-ledger-cleaned` and never returns stale retained events.

Carrier queue lifecycle:

- Queue entries contain request id, target key, attachment id, deadline and small request metadata only. They must not retain `LiveOperationWindow.events`.
- Queue entries are deleted on response delivery, timeout, target terminal state or attachment cleanup.
- Each attachment has at most `maxCarrierQueueEntries=16` pending window requests.
- Overflowing the carrier queue returns dropped marker reason `carrier.target-closed` or a structured carrier gap. It must not retain extra windows.

## Disabled Allocation Proof

Add counters to live bridge diagnostics for proof:

```ts
export interface LiveLedgerDiagnostics {
  readonly ledgerStoreAllocations: number
  readonly ledgerEventAllocations: number
  readonly ledgerWindowProjectionAllocations: number
  readonly diagnosticProjectionAllocations: number
  readonly carrierQueueEntries: number
}
```

Proof assertions:

- `createLiveAttachmentRegistry({ enabled: false })` followed by `requestOperation` and `openCaptureWindow` leaves all ledger counters at `0`.
- Diagnostics disabled path leaves `diagnosticProjectionAllocations=0` after diagnostic/process source events and after a read that returns a gap.
- Live inspect disabled path has no `Map<targetKey, TargetLedgerStore>` allocation.
- Window projection allocation increments only on explicit `capture.eventWindow` or events inspect reads.

## Focused Tests

Create `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`:

- asserts a direct operation event envelope has `kind='live.ledger.event'`, `schemaVersion='live-ledger-event.v1'`, normalized target, event id `live-ledger:<targetKey>:1`, order ledgerSeq `1`, sourceAuthority `runtime-live`
- asserts same-target watermarks compare before/same/after and different-target watermarks compare `incomparable`
- asserts `txnSeq/opSeq/linkId` source records are copied into envelopes without letting `linkId` order events
- asserts diagnostic/process capture-time normalization produces `eventKind='diagnostic' | 'process'`, bounded payload refs and owner `runtime-live` gaps for unsupported records
- asserts DTO JSON does not contain `verdict`, `repairHints`, `nextRecommendedStage` or `passed`

Create `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`:

- records accepted, completed and failed events for one target, captures a window, asserts target key, stable order and start/end watermarks
- requests a cursor older than dropped history and asserts `completeness='partial-dropped'` plus dropped marker
- records two events and a later current state, asserts the first event does not receive `current-head-exact` unless its watermark equals current head
- asserts missing/oversized/redacted/mismatched stateAfter source emits the required gap code

Create `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-retention.guard.test.ts`:

- uses retention `maxEvents=3`, records 5 events, asserts only latest 3 retained and dropped marker covers first 2 sequences
- uses tiny `maxInlineBytes`, asserts payload moves to bounded summary/artifact ref and degraded `payload-over-budget`
- asserts dropped marker ring is bounded and coalesces beyond `maxDroppedMarkers`

Create `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts`:

- disabled live inspect path asserts `ledgerStoreAllocations=0`, `ledgerEventAllocations=0`, `ledgerWindowProjectionAllocations=0`
- diagnostics disabled path asserts `diagnosticProjectionAllocations=0`
- capture/read on disabled path returns structured gap, not an empty successful window

Update `packages/logix-core/test/internal/LiveBridge/live-operations.contract.test.ts`:

- operation facets remain available as projections
- `capture.eventWindow` returns or references `LiveOperationWindow`
- no operation result contains verification verdict fields

Update `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`:

- terminal attachment cleanup deletes target ledger stores
- subsequent operation window read returns `target-ledger-cleaned`
- cleanup returns drained refs or dropped/degraded marker, not stale events

Carrier tests are not part of the first implementation slice. Add or update them only after core DTO shape is stable:

- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

## Implementation Sequence

This sequence is closed. It records the implementation slices that were executed by `specs/175-runtime-live-operation-ledger/tasks.md` and the proof files below; it is not an additional open task list.

Use TDD. Each checkbox is intended as a 2 to 5 minute action for a high-intelligence implementing Agent.

### Chunk 1: DTO And Retention Contract

- [x] Write failing DTO tests in `live-operation-ledger.contract.test.ts` for envelope, order key, watermark and forbidden verdict fields.
- [x] Run `rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger.contract.test.ts` and confirm failures are missing DTO/helpers only.
- [x] Add DTOs and default retention policy in `liveTypes.ts` / `liveLedger.ts`.
- [x] Export DTOs through `live-bridge-api.ts`.
- [x] Rerun the focused test and reach pass.
- [x] checkpoint: review diff.

### Chunk 2: Target Ring Store And Watermark

- [x] Write failing tests for target-local sequence, watermark comparison and cross-target incomparability.
- [x] Implement lazy target store allocation and sequence/watermark helpers in `liveLedger.ts`.
- [x] Rerun `live-operation-ledger.contract.test.ts`.
- [x] checkpoint: review diff.

### Chunk 3: Retention And Overflow

- [x] Write failing retention tests in `live-operation-ledger-retention.guard.test.ts`.
- [x] Implement max event, inline byte and marker retention behavior.
- [x] Rerun retention and ledger contract tests.
- [x] checkpoint: review diff.

### Chunk 4: Operation Ingestion And Window Reads

- [x] Write failing operation window tests for accepted/completed/failed ordering and cursor reads.
- [x] Route `runLiveOperation` and attachment registry operation paths through ledger ingestion when enabled.
- [x] Implement `capture.eventWindow` window read projection.
- [x] Rerun `live-operation-window.contract.test.ts` and `live-operations.contract.test.ts`.
- [x] checkpoint: review diff.

### Chunk 5: StateAfter Refs

- [x] Write failing stateAfter tests for recorded artifact, event-carried artifact, exact current head and forbidden historical backfill.
- [x] Implement `LiveStateAfterSourceRef` validation and required gap codes.
- [x] Rerun `live-operation-window.contract.test.ts`.
- [x] checkpoint: review diff.

### Chunk 6: DebugSink Capture-Time Normalization

- [x] Write failing diagnostic/process normalization tests.
- [x] Add capture-time normalization entry point without making DebugSink own ledger envelopes.
- [x] Add diagnostics-disabled allocation guard.
- [x] Rerun `live-operation-ledger.contract.test.ts` and `live-operation-ledger-disabled.guard.test.ts`.
- [x] checkpoint: review diff.

### Chunk 7: Cleanup And Carrier Queue Proof

- [x] Write failing cleanup tests for terminal attachment states and stale window reads.
- [x] Delete target stores and carrier queue entries during cleanup.
- [x] Rerun cleanup and attachment boundary tests.
- [x] checkpoint: review diff.

### Chunk 8: Carrier Transport After Core Stabilizes

- [x] Update carrier tests to assert transport-only behavior.
- [x] Transport `LiveOperationWindow` without reordering or stateAfter synthesis.
- [x] Rerun carrier tests.
- [x] checkpoint: review diff.

## Required Verification Commands

Focused core checks:

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-retention.guard.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts test/internal/LiveBridge/live-operations.contract.test.ts test/internal/LiveBridge/live-attachment.boundary.test.ts
```

Carrier checks after core DTO stabilization:

```text
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
```

Repository checks before closing implementation:

```text
rtk pnpm typecheck
rtk pnpm lint
```

Text hygiene:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" specs/175-runtime-live-operation-ledger packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "verdict|repairHints|nextRecommendedStage|passed" packages/logix-core/src/internal/runtime/core/liveLedger.ts packages/logix-core/src/internal/runtime/core/liveTypes.ts packages/logix-core/test/internal/LiveBridge
rtk rg -n "LiveOperationLedger|LiveLedgerEventEnvelope|LiveLedgerOrderKey|LiveLedgerWatermark|LiveStateAfterSourceRef|LiveOperationWindow" specs/175-runtime-live-operation-ledger packages/logix-core/src packages/logix-core/test
```

## Exit Gates

175 implementation cannot close until all are true:

- `LiveOperationWindow` is target-scoped and bounded.
- Event envelopes carry target coordinate, order key, watermark and source authority.
- Watermark comparison is target-scoped and rejects cross-target boolean ordering.
- Overflow produces dropped/degraded markers.
- Historical stateAfter is a source ref or a gap, never latest-state backfill.
- Disabled live inspect does not allocate ledger stores, events or window projections.
- Diagnostics disabled does not allocate diagnostic/process ledger projections.
- Attachment cleanup deletes target ledger stores and later reads return terminal gaps.
- Carrier queues do not retain operation windows after response delivery or target cleanup.
- Canonical evidence exports refs/provenance only and does not become ledger owner.
- Text sweep finds no new public roots or verification verdict fields in live output.

## Reopen Rules

Reopen this contract if:

- implementation cannot normalize diagnostics/process records with capture-time pull
- ordering requires a non-target-local sequence or process-global watermark
- stateAfter cannot be represented without copying latest current state into history
- disabled allocation proof requires always-on ledger buffers
- carriers need to sort, synthesize watermarks or retain operation windows to function
- timeline projection must become a foundation owner before 175 and 176 close
- default budgets fail dogfood evidence under the rules in `Contract Defaults`
