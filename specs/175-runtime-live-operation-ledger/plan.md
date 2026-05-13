# Implementation Plan: Runtime-Live Operation Ledger

## Goal

Make runtime-live ledger the owner-backed causal record behind operation windows, diagnostics/process event inspect and future timeline projection.

The implementation may replace current live facets where they lack ordering and watermark semantics. It must not turn DebugSink, canonical evidence, CLI, daemon, browser adapter or Workbench into the ledger owner.

## Technical Context

Kernel contract:

- `specs/175-runtime-live-operation-ledger/implementation-details/ledger-kernel-contract.md`

The kernel contract freezes the implementation-level DTO, wire, lifecycle, retention, overflow, ordering, watermark, stateAfter, disabled allocation, cleanup, proof gate, default budget and reopen rules. Implementers must treat it as the first 175 execution input after this plan. If the spec, this plan and the kernel contract conflict, stop and reconcile the contract with SSoT 18 before touching code.

Likely core landing files:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

Likely carrier landing files:

- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/src/internal/liveDaemonRuntime.ts` remains the process launcher and should not own carrier operation semantics.
- existing CLI live command handlers and live daemon carrier tests

Likely tests:

- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-cleanup.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operations.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Authority Boundaries

Runtime-live ledger owns:

- ledger envelope
- target-scoped ordering
- watermark
- operation window refs
- stateAfter source refs
- diagnostics/process envelope normalization
- target lifecycle cleanup for ledger buffers

It does not own:

- reflection schema or binding payloads
- field semantic payloads
- React host evidence payloads
- local profile payloads
- canonical evidence export envelope
- CLI/browser/daemon transport grammar

## Phase 1 - Ledger Model

Add a ledger model that is explicit enough to support future timeline projection without making timeline a 175 owner.

Implementation requirements:

- Follow the exact DTO and default budget contract in `implementation-details/ledger-kernel-contract.md`.
- Define `LiveOperationLedger`, `LiveLedgerEventEnvelope`, `LiveLedgerOrderKey`, `LiveLedgerWatermark`, `LiveStateAfterSourceRef` and `LiveOperationWindow`.
- Keep event envelopes JSON-safe and bounded.
- Make target coordinate and optional attachment id part of every ledger event.
- Keep payloads as bounded summaries, artifact refs or owner refs.
- Preserve binding headers from 174 as refs, not reflection payload ownership.
- Define per-target retention policy with max events, max inline bytes, overflow behavior and dropped-event marker shape from the kernel contract.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

## Phase 2 - Ordering And Watermarks

Implement target-scoped sequencing.

Implementation requirements:

- Use the kernel contract's target-local ordering and `compareWatermark` rules.
- Allocate monotonic ledger sequence per live target.
- Normalize `txnSeq / opSeq / linkId` when source events provide them.
- Derive order keys from runtime coordinates first, ingest sequence only as degraded fallback.
- Emit start and end watermarks for windows.
- Prevent process-global watermark comparison.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`

## Phase 3 - Operation Ingestion

Route accepted, denied, completed, failed and capture events through the ledger.

Implementation requirements:

- `runLiveOperation` and attachment registry operation paths must write ledger events when live inspect is enabled.
- Existing operation facets may remain as projections from ledger events.
- `capture.eventWindow` must read a bounded ledger window for the requested target.
- Unsupported or empty windows must emit structured runtime-live gaps.
- Live output must not include verification verdict fields.
- Ledger ingestion must use the target-scoped ring/window store from the kernel contract.
- Overflow must emit the kernel contract's dropped or degraded markers and never silently claim complete windows.
- Window projection payloads must be allocated only for explicit capture/read requests.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operations.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`

## Phase 4 - StateAfter Source Refs

Add true stateAfter source law without backfilling historical events from latest state.

Implementation requirements:

- Represent recorded post-event state refs, event-carried state refs and exact current-head state refs using the exact `LiveStateAfterSourceRef` shape from the kernel contract.
- Emit `missing-state-after-source`, `state-after-over-budget`, `state-after-redacted` or `state-after-watermark-mismatch` gaps when needed.
- Do not copy current latest state into historical ledger events.
- Keep current state inspect output separate from historical stateAfter refs.
- Keep full state snapshots out of the ledger unless an explicit inline byte budget allows a bounded summary.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`

## Phase 5 - Diagnostics And Process Normalization

Normalize owner-approved diagnostics and process source events into ledger envelopes.

Implementation requirements:

- Use capture-time pull normalization as frozen in the kernel contract. Do not add an always-on DebugSink push path into ledger buffers.
- Import `txnSeq / opSeq / linkId` from source events when available.
- Project diagnostic code, severity and bounded metadata.
- Project process event label and bounded metadata.
- Preserve degraded and redaction markers.
- Unsupported source events emit runtime-live gaps.
- Gate normalization separately from DebugSink recording.
- When diagnostics are disabled or live ledger is disabled, do not allocate diagnostics/process ledger payload projections.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`

## Phase 6 - Lifecycle Cleanup And Disabled Overhead

Bind ledger lifecycle to live target lifecycle.

Implementation requirements:

- Clean ledger buffers on attachment cleanup, revoke, disconnect and target unavailable using the cleanup algorithm in the kernel contract.
- Return drained evidence refs or dropped/degraded markers.
- When live inspect is disabled, do not allocate ledger buffers.
- When diagnostics are disabled, do not allocate diagnostic/process payload projections for ledger.
- Cleanup must release per-target ring buffers, pending window projections and carrier references.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-cleanup.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`

## Phase 7 - Carrier And Evidence Export

Expose owner-backed operation windows through existing carriers.

This phase starts only after the core DTO and operation window tests pass. Carrier work may transport the kernel contract DTOs, but it must not own ordering, watermark, dropped marker or stateAfter truth.

Implementation requirements:

- Browser adapter must transport ledger windows without owning ordering or watermark truth.
- CLI/daemon must return operation window artifact refs or structured gaps.
- Canonical evidence may package ledger refs and provenance only.
- Timeline command output may remain a gap until timeline projection is promoted; if it consumes ledger windows, it must not define new owner law.
- Browser adapter, daemon and CLI must not retain unbounded operation windows after response delivery or target cleanup.

Expected landing files:

- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- existing canonical evidence packaging tests touched by live inspect output

## Phase 8 - Documentation Writeback

Update only owner facts that changed during implementation.

Required writebacks:

- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep 173 as umbrella; mark 175 implementation tasks complete there when implementation closes.
- Keep 172 as route closure and handoff only.
- Do not promote timeline, React host evidence or profile until gates pass.

## Verification Matrix

Focused implementation checks:

```text
rtk rg -n "LiveOperationLedger|LiveLedgerEventEnvelope|LiveLedgerOrderKey|LiveLedgerWatermark|LiveStateAfterSourceRef|LiveOperationWindow|defaultLiveLedgerRetentionPolicy|capture-time pull" specs/175-runtime-live-operation-ledger/implementation-details/ledger-kernel-contract.md specs/175-runtime-live-operation-ledger/plan.md specs/175-runtime-live-operation-ledger/tasks.md
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-cleanup.guard.test.ts test/internal/LiveBridge/live-operations.contract.test.ts test/internal/LiveBridge/live-attachment.boundary.test.ts
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger-retention.guard.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm typecheck
```

Text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/175-runtime-live-operation-ledger packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*Runtime" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/175-runtime-live-operation-ledger
rtk rg -n "stateAfter|watermark|txnSeq|opSeq|linkId|LiveOperationLedger|capture.eventWindow" specs/175-runtime-live-operation-ledger packages/logix-core/src packages/logix-core/test packages/logix-cli/test packages/logix-react/test
```

## Exit Gates

175 exits only when:

- implementation follows `implementation-details/ledger-kernel-contract.md` or records an explicit contract reopen
- event window is target-scoped
- diagnostics and process envelopes are owner-backed
- current state is not used as historical stateAfter
- ledger cleanup follows runtime target lifecycle
- disabled overhead is proven
- per-target retention and overflow behavior is proven
- diagnostics-disabled mode does not allocate diagnostics/process ledger projections
- carrier pending windows are lease-bound and lifecycle-cleaned
- canonical evidence export derives from ledger refs and owner facts only
- text sweep catches forbidden public roots and second-truth language

## Reopen Rules

Reopen the plan if:

- the ledger cannot normalize source events without a new runtime coordinate law
- stateAfter source refs require copying latest state into history
- disabled overhead cannot stay bounded without always-on buffers
- timeline projection must become a foundation owner before 175 and 176 close
