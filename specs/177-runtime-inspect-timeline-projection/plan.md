# Implementation Plan: Runtime Inspect Timeline Projection

## Goal

Make `logix live timeline` return owner-backed timeline artifacts by projecting 175 operation windows and optional 176 field semantic joins.

The implementation must preserve SSoT 18 coordination law and keep 177 limited to query/output projection shape.

## Technical Context

Likely core landing files:

- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

Likely carrier landing files:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`

Likely tests:

- `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Authority Boundaries

177 owns:

- timeline query normalization from existing live inspect payloads
- timeline item output shape
- timeline completeness, truncation and projection gaps
- timeline carrier proof requirements

177 does not own:

- 175 ledger envelope, ordering, watermark, retention or stateAfter law
- 176 field identity, semantic payload or adjacency law
- reflection binding
- React host evidence
- local profile payloads
- CLI grammar
- canonical evidence export envelope

## Phase 1 - Timeline Projection Model

Add owner-side timeline DTOs and projection helpers.

Implementation requirements:

- Define `LiveTimelineProjection`, `LiveTimelineItem`, `LiveTimelineQuery`, `LiveTimelineFieldFilter`, `LiveTimelineCompleteness` and `LiveTimelineGap`.
- Use `LiveInspectArtifact(section="timeline")` as the output carrier.
- Keep output JSON-safe and bounded.
- Return structured runtime-live gaps for missing operation window or terminal target.
- Export only repo-internal bridge APIs.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

## Phase 2 - Ledger Window Projection

Project 175 operation windows into timeline items.

Implementation requirements:

- Derive item id, ordering, watermarks, target coordinate, `txnSeq`, `opSeq` and `linkId` from `LiveLedgerEventEnvelope`.
- Preserve dropped, degraded, redaction and structured gap markers from the source window and events.
- Preserve `LiveStateAfterSourceRef` or stateAfter gaps without latest-state backfill.
- Keep current-state inspect separate from timeline projection.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`

## Phase 3 - Field Filter Join

Implement `--field` filtering through 176 semantic payload joins.

Implementation requirements:

- Join through target coordinate plus watermark or `linkId`.
- Include matched field path, field identity digest, semantic event kind and source ref when available.
- Emit field-runtime gaps for missing metadata, mismatched joins or over-budget field payloads.
- Mark completeness degraded when the filter cannot prove that all relevant events were considered.
- Do not inspect raw field graph, raw field program, runtime handles, `SubscriptionRef` or latest field summary as filter truth.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- `packages/logix-core/test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts`

## Phase 4 - Budget, Disabled Allocation And Cleanup

Prove timeline projection stays lazy and bounded.

Implementation requirements:

- Allocate timeline items only for explicit timeline read requests.
- Reuse operation-window budget and requested limit.
- Degrade over-budget timelines with counts, watermarks, dropped markers, owner gap codes and artifact refs.
- Do not allocate projection caches when timeline inspect is disabled.
- Clean any derived caches or retained responses with target lifecycle.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`

## Phase 5 - Carrier And Evidence Proof

Replace `inspect.timeline` carrier gaps with owner-backed timeline artifacts where available.

Implementation requirements:

- Browser adapter must call the owner timeline projection and transport artifacts.
- CLI daemon must continue to route existing `inspect.timeline` operation without owning timeline facts.
- Carrier timeouts and missing projections must preserve runtime-live or field-runtime gap ownership.
- Canonical evidence may package timeline artifact refs and owner gaps only.
- Carrier tests must prove owner markers are preserved and not rewritten by daemon, browser adapter, CLI or Workbench consumers.

Expected landing files:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-cli/src/internal/liveDaemonServer.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 6 - Coverage And Documentation Writeback

Close the promoted timeline row.

Required writebacks:

- Move timeline coverage from structured gap to owner-backed in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`.
- Mark 177 tasks complete when implementation closes.
- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep SSoT 15 command grammar unchanged.
- Keep React host evidence and local profiler owner deferred.

## Planning Granularity

This plan targets a high-intelligence implementation Agent. It freezes owner boundaries, landing zones, required witnesses, proof obligations, performance and memory gates, and writeback targets.

It intentionally does not freeze exact algorithms, data structures or pseudo-code. Add a focused `implementation-details/*contract*.md` only if implementation discovers ambiguity in DTO shape, wire behavior, lifecycle ownership, field join keys, redaction policy or performance measurement.

## Performance And Memory Gates

177 touches live debug output and must treat cost as a closure condition.

Required gates:

- disabled timeline projection allocates no timeline item payload, projection cache or carrier-retained owner data
- projection is target-scoped and explicitly requested
- large timelines degrade with counts, watermarks, dropped markers, owner gap codes, truncation markers or artifact refs
- field filtering does not inspect raw field graph, raw field program, runtime handles, closures or `SubscriptionRef`
- carriers preserve redaction/degraded markers and cannot retain unbounded timeline windows after response delivery or target cleanup

## Verification Matrix

Focused implementation checks:

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-timeline-projection.contract.test.ts test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```

Text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/177-runtime-inspect-timeline-projection packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*timeline|[c]anonical evidence.*owns.*Runtime" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/177-runtime-inspect-timeline-projection
rtk rg -n "latest.*backfill|raw field|raw graph|SubscriptionRef|verification verdict|repairHints|time-travel|replay" specs/177-runtime-inspect-timeline-projection packages/logix-core/src packages/logix-core/test packages/logix-react/test packages/logix-cli/test
```

## Exit Gates

177 exits only when:

- timeline artifacts are projected from 175 operation windows
- stateAfter facts remain 175 source refs or gaps
- field filters use 176 semantic payload joins
- missing inputs emit stable owner-coded gaps
- carrier and export proofs preserve owner markers
- disabled allocation, bounded projection and lifecycle cleanup are covered
- runtime inspect coverage harness records timeline as owner-backed

## Reopen Rules

Reopen the plan if:

- timeline projection needs a new ordering, watermark or stateAfter law
- field filtering needs raw field internals or latest summary backfill
- public CLI grammar must change
- disabled projection requires always-on buffers
- React host evidence or profile payload must become part of timeline truth before their owners are promoted
