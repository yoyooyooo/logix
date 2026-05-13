# Tasks: Runtime Inspect Timeline Projection

**Input**: `specs/177-runtime-inspect-timeline-projection/spec.md` and `specs/177-runtime-inspect-timeline-projection/plan.md`

## Phase 1 - Projection Model

- [x] T001 Add owner-side timeline projection DTOs and helpers in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T002 Wire `LiveInspectArtifact(section="timeline")` projection helpers through `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T003 Export repo-internal timeline bridge APIs in `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T004 [P] Add base projection tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`
- [x] T005 [P] Add missing operation window and terminal target gap tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`

## Phase 2 - Ledger Window Projection

- [x] T006 Project `LiveOperationWindow` events into ordered timeline items in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T007 Preserve 175 watermarks, order keys, `txnSeq`, `opSeq` and `linkId` in timeline output in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T008 Preserve 175 `LiveStateAfterSourceRef` and stateAfter gaps without latest-state backfill in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T009 Preserve dropped, degraded, redaction and structured gap markers in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T010 [P] Add stateAfter source-ref and no-latest-backfill tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`
- [x] T011 [P] Add dropped/degraded/redaction marker preservation tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`

## Phase 3 - Field Filter Join

- [x] T012 Implement 176-backed field filter join in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T013 Ensure field filtering uses target plus watermark or `linkId` joins from `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T014 Emit field-runtime gaps for missing, mismatched or over-budget field semantic metadata in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T015 Mark field-filtered timeline completeness degraded when completeness cannot be proven in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T016 [P] Add field-filter match tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts`
- [x] T017 [P] Add raw field graph, raw field program, runtime handle and `SubscriptionRef` leakage guards in `packages/logix-core/test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts`

## Phase 4 - Budget, Disabled Allocation And Cleanup

- [x] T018 Bound timeline projection by request limit and operation-window budget in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T019 Add over-budget truncation, degraded marker and artifact-ref behavior in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T020 Prove disabled timeline inspect allocates no timeline payloads or projection caches in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`
- [x] T021 Clean any timeline projection cache or retained response with target lifecycle in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T022 [P] Add lifecycle cleanup tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-projection.contract.test.ts`

## Phase 5 - Carrier And Evidence Proof

- [x] T023 Add timeline projection source to `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T024 Route `inspect.timeline` through owner projection in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T025 Transport timeline artifacts through `packages/logix-cli/src/internal/liveDaemonServer.ts` without changing CLI grammar
- [x] T026 [P] Add browser adapter timeline proof in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T027 [P] Add daemon carrier timeline proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T028 [P] Add canonical evidence export preservation proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 6 - Coverage And Writeback

- [x] T029 Move timeline coverage from structured gap to owner-backed in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- [x] T030 Update `specs/177-runtime-inspect-timeline-projection/spec.md` status after implementation closes
- [x] T031 Update `specs/177-runtime-inspect-timeline-projection/tasks.md` after implementation closes
- [x] T032 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation
- [x] T033 Keep `docs/ssot/runtime/15-cli-agent-first-control-plane.md` grammar unchanged unless implementation proves the existing command cannot express the owner-backed timeline query
- [x] T034 Run 177 verification and text hygiene checks from `specs/177-runtime-inspect-timeline-projection/plan.md`

## Required Verification

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-timeline-projection.contract.test.ts test/internal/LiveBridge/live-timeline-field-filter.contract.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```

## Dependencies

T001 through T005 establish the projection model.

T006 through T011 require 175 operation-window projection to remain stable.

T012 through T017 require 176 field semantic payload joins.

T018 through T022 require timeline projection DTOs and source owner joins.

T023 through T028 require core timeline artifact shape to be stable.

T029 through T034 require core and carrier proofs to pass.
