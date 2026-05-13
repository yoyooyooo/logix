# Tasks: Agent Debug Closure

**Input**: Design documents from `specs/183-agent-debug-closure/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [implementation-details/diagnosis-evidence-contract.md](./implementation-details/diagnosis-evidence-contract.md)

**Tests**: Required. 183 touches live diagnosis evidence, React host adjunct capture, profile summary, canonical evidence packaging, production bundle safety and disabled-overhead gates.

**Organization**: Tasks are grouped by user story. Stable owner law stays in [spec.md](./spec.md) and SSoT 18; this file defines execution order, proof obligations and writeback points.

## Phase 1: Setup And Baseline

**Purpose**: Establish current behavior and prevent scope drift before implementation.

- [ ] T001 Review 183 authority in `specs/183-agent-debug-closure/spec.md`, `specs/183-agent-debug-closure/plan.md`, `specs/183-agent-debug-closure/implementation-details/diagnosis-evidence-contract.md`, `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`, `docs/ssot/runtime/10-react-host-projection-boundary.md` and `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- [ ] T002 [P] Run current focused core live evidence baseline for `packages/logix-core/test/internal/LiveBridge/`
- [ ] T003 [P] Run current React host live adapter and lifecycle baseline for `packages/logix-react/test/internal/dev/` and `packages/logix-react/test/RuntimeProvider/`
- [ ] T004 [P] Run current CLI live baseline for `packages/logix-cli/test/Integration/`
- [ ] T005 [P] Run current production bundle safety baseline in `examples/logix-react/test/production-bundle-dev-isolation.guard.ts`
- [ ] T006 Classify touched-file size and decomposition risk for likely landing files in `packages/logix-core/src/internal/runtime/core/`, `packages/logix-react/src/internal/dev/`, `packages/logix-cli/src/internal/` and `examples/logix-react/test/`

## Phase 2: Foundational Diagnosis Contracts

**Purpose**: Add shared types, gap helpers and guard rails needed by every user story without adding public artifact kinds or a debug namespace.

- [ ] T007 [P] Add or align diagnosis sidecar and gap DTOs behind existing live evidence exports in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [ ] T008 [P] Add stable diagnosis gap/disagreement helpers for host, interaction and profile lanes in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [ ] T009 [P] Re-export only repo-internal 183 DTOs through `packages/logix-core/src/internal/live-bridge-api.ts`
- [ ] T010 [P] Add CLI/public-surface guard tests proving no `logix debug`, `HostEvidence` or `HostAdjunctEvidence` public artifact kind in `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- [ ] T011 [P] Add disabled-overhead guard scaffolding for host/profile diagnosis capture in `packages/logix-react/test/internal/dev/`
- [ ] T012 Add canonical evidence preservation tests for owner markers, host/profile refs, disagreements and gaps in `packages/logix-core/test/internal/LiveBridge/live-inspect-evidence-bridge.contract.test.ts`

**Checkpoint**: 183 has shared contracts and guard rails; no user story implementation can add a second public surface.

## Phase 3: User Story 1 - Diagnose UI Did Not Update (Priority: P1)

**Goal**: Link Runtime action, field fact, selector subscription and render boundary, or return explicit host gaps.

**Independent Test**: Drive a live demo route, dispatch an admitted action, read timeline / fields / summary plus host adjunct evidence, and verify the evidence package identifies the Runtime operation, field semantic payload, selector subscription ref, render boundary ref or a structured host gap.

### Tests for User Story 1

- [ ] T013 [P] [US1] Add host adjunct evidence contract tests in `packages/logix-react/test/internal/dev/live-host-adjunct-evidence.contract.test.ts`
- [ ] T014 [P] [US1] Add selector subscription evidence tests in `packages/logix-react/test/internal/dev/live-selector-subscription-evidence.contract.test.ts`
- [ ] T015 [P] [US1] Add render boundary linkage tests in `packages/logix-react/test/internal/dev/live-render-boundary-evidence.contract.test.ts`
- [ ] T016 [P] [US1] Add canonical evidence export tests for Runtime fact plus host adjunct refs in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Implement host attachment evidence capture and lifecycle cleanup in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` and `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [ ] T018 [US1] Preserve selector fingerprint / core route identity into adjunct evidence from `packages/logix-react/src/internal/hooks/` and `packages/logix-react/src/internal/store/`
- [ ] T019 [US1] Preserve render boundary refs or structured host gaps through `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [ ] T020 [US1] Package host adjunct refs and disagreement markers through existing live inspect/canonical evidence outputs in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts` and `packages/logix-cli/src/internal/liveDaemonServer.ts`

**Checkpoint**: User Story 1 proves host projection diagnosis without host evidence becoming Runtime truth.

## Phase 4: User Story 2 - Trace User Interaction To Runtime Operation (Priority: P1)

**Goal**: Link host interaction to declared action dispatch and Runtime operation coordinates, or return admission/linkage gaps.

**Independent Test**: Simulate a click or input on a live route, dispatch a declared action, and verify the evidence chain contains interaction ref, dispatch admission, `txnSeq / opSeq / linkId`, operation result and host render linkage or gaps.

### Tests for User Story 2

- [ ] T021 [P] [US2] Add interaction-to-dispatch linkage tests in `packages/logix-react/test/internal/dev/live-interaction-linkage.contract.test.ts`
- [ ] T022 [P] [US2] Add operation-coordinate preservation tests in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- [ ] T023 [P] [US2] Add multi-attachment ambiguity tests for interaction linkage in `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`

### Implementation for User Story 2

- [ ] T024 [US2] Capture host interaction provenance refs behind explicit live diagnosis capture in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [ ] T025 [US2] Join interaction provenance to declared action admission and operation coordinates in `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [ ] T026 [US2] Preserve interaction linkage refs and gaps through daemon responses in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [ ] T027 [US2] Ensure ambiguous attachment cases return structured gaps without merging host chains in `packages/logix-cli/src/internal/liveDaemonServer.ts`

**Checkpoint**: User Story 2 proves UI interaction chains without fabricating Runtime operations.

## Phase 5: User Story 3 - Export A Diagnosis Package (Priority: P1)

**Goal**: Export one bounded canonical evidence package containing Runtime owner facts plus adjunct/profile refs and structured gaps.

**Independent Test**: Capture a bounded live session, export evidence, and verify the package includes owner facts, adjunct refs, profile summary refs, source/route refs when available, redaction markers and explicit gaps with owner codes.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add diagnosis package shape tests in `packages/logix-core/test/internal/LiveBridge/live-diagnosis-package.contract.test.ts`
- [ ] T029 [P] [US3] Add CLI evidence handoff tests for diagnosis refs and gaps in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [ ] T030 [P] [US3] Add no-public-host-artifact-kind tests in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`

### Implementation for User Story 3

- [ ] T031 [US3] Assemble diagnosis package refs through canonical evidence packaging in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [ ] T032 [US3] Preserve owner, adjunct, profile, disagreement, redaction and degraded markers in `packages/logix-cli/src/internal/liveResult.ts`
- [ ] T033 [US3] Ensure source/module/route absence returns source-link gaps rather than guessed paths in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [ ] T034 [US3] Preserve diagnosis evidence through `logix live export evidence` in `packages/logix-cli/src/internal/commands/live.ts`

**Checkpoint**: User Story 3 provides a portable Agent diagnosis package without adding a second evidence envelope.

## Phase 6: User Story 4 - Inspect Local Cost Symptoms (Priority: P2)

**Goal**: Provide bounded local profile summary linked to Runtime coordinates without creating profiler truth.

**Independent Test**: Start and stop a local profile summary around an admitted operation, then verify the output contains bounded summary, target/time/link refs, budget/redaction markers and no timeline facts or raw samples as Runtime truth.

### Tests for User Story 4

- [ ] T035 [P] [US4] Add local profile authorization and gap tests in `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- [ ] T036 [P] [US4] Add disabled profile allocation tests in `packages/logix-react/test/internal/dev/live-profile-disabled.guard.test.ts`
- [ ] T037 [P] [US4] Add profile summary artifact tests in `packages/logix-core/test/internal/LiveBridge/live-profile-summary.contract.test.ts`

### Implementation for User Story 4

- [ ] T038 [US4] Implement bounded local profile summary refs and gaps in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [ ] T039 [US4] Implement profile start/stop/summary carrier preservation in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [ ] T040 [US4] Gate profile capture authorization, budget and cleanup in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [ ] T041 [US4] Preserve profile summary output inside existing `LiveProfileSummary` route in `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: User Story 4 proves local performance symptoms remain bounded diagnosis evidence.

## Phase 7: User Story 5 - Preserve Production And Disabled Cost (Priority: P1)

**Goal**: Prove 183 adds no production bundle reachability and no disabled-path allocation.

**Independent Test**: Run bundle reachability and disabled-overhead proofs over `examples/logix-react` and targeted runtime tests, then verify dev/live/debug carriers are absent from production builds and disabled closure allocates no capture buffers or fanout.

### Tests for User Story 5

- [ ] T042 [P] [US5] Extend production bundle safety guard in `examples/logix-react/test/production-bundle-dev-isolation.guard.ts`
- [ ] T043 [P] [US5] Add disabled host capture allocation tests in `packages/logix-react/test/internal/dev/live-host-adjunct-disabled.guard.test.ts`
- [ ] T044 [P] [US5] Add transaction-window no-IO tests for diagnosis closure in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`

### Implementation for User Story 5

- [ ] T045 [US5] Keep host/profile capture modules behind dev-only entrypoints in `packages/logix-react/src/dev/live.ts` and package export boundaries in `packages/logix-react/package.json`
- [ ] T046 [US5] Ensure normal React imports do not reach 183 capture/profile carriers in `packages/logix-react/src/index.ts` and related public entrypoints
- [ ] T047 [US5] Preserve cleanup on target, attachment and provider lifecycle in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [ ] T048 [US5] Record production safety proof commands in `specs/183-agent-debug-closure/quickstart.md`

**Checkpoint**: User Story 5 proves 183 does not tax ordinary business runtime.

## Phase 8: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [ ] T049 [P] Update Runtime Inspect Coverage Harness and verification notes for React host adjunct and local profile rows in `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md` and `specs/172-agent-first-runtime-inspect-data-plane/notes/verification.md`
- [ ] T050 [P] Update SSoT 18 only for final 183 closure deltas in `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
- [ ] T051 [P] Update SSoT 10 only for selector/render host-law deltas in `docs/ssot/runtime/10-react-host-projection-boundary.md`
- [ ] T052 [P] Update SSoT 15 only for CLI schema or live profile route deltas in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- [ ] T053 [P] Update harness standard only if proof placement or live evidence safety gate changes in `docs/standards/harness-and-proof-assets-standard.md`
- [ ] T054 Update 183 final verification notes, quickstart and status in `specs/183-agent-debug-closure/quickstart.md`, `specs/183-agent-debug-closure/spec.md` and `specs/README.md`
- [ ] T055 Run focused core verification from `specs/183-agent-debug-closure/plan.md`
- [ ] T056 Run focused React verification from `specs/183-agent-debug-closure/plan.md`
- [ ] T057 Run focused CLI verification from `specs/183-agent-debug-closure/plan.md`
- [ ] T058 Run dogfood and production safety verification from `specs/183-agent-debug-closure/plan.md`
- [ ] T059 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`
- [ ] T060 Run final text sweeps from `specs/183-agent-debug-closure/plan.md`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1, US2, US3 and US5 are P1 and can proceed after Phase 2, but US3 depends on at least one available sidecar/ref producer from US1 or US2.
- US4 is P2 and can proceed after Phase 2, but its output packaging should be verified with US3.
- US5 must be rerun after US1, US2 and US4 because it proves disabled and production boundaries after capture/profile changes.
- Phase 8 depends on selected user stories being implemented and proof facts being stable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2 and shares operation coordinate proof with US1.
- US3: depends on Phase 2 and consumes available owner/adjunct/profile refs.
- US4: depends on Phase 2 and should feed US3 package proof.
- US5: depends on Phase 2 and must be repeated after any capture/profile implementation.

## Parallel Opportunities

```text
T002, T003, T004, T005 and T006 can run together.
T007, T008, T009, T010 and T011 can run together after T001.
T013, T014, T015 and T016 can be written together before US1 implementation.
T021, T022 and T023 can be written together before US2 implementation.
T028, T029 and T030 can be written together before US3 implementation.
T035, T036 and T037 can be written together before US4 implementation.
T042, T043 and T044 can be written together before US5 implementation.
T049, T050, T051, T052 and T053 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 and US2 enough to link action, field, selector/render and interaction chains or emit gaps.
3. Complete US3 package export over those chains.
4. Re-run US5 disabled and production safety proof.

### Full 183 Closure

1. Complete US4 profile summary.
2. Re-run US3 package export with profile refs.
3. Re-run US5 disabled and production gates.
4. Complete SSoT and coverage harness writebacks.
5. Run the verification matrix and text sweeps in [plan.md](./plan.md).

## Notes

- Do not add `logix debug`.
- Do not add public `HostEvidence` or `HostAdjunctEvidence` artifact kinds.
- Do not make host/profile sidecars Runtime truth.
- Do not add SourceMap/AST index, QA recorder, replay engine, deep profiler, heap snapshot, remote/cloud mutation or final SQLite schema in 183.
- Do not let production bundle proof move out of the repo-wide live evidence safety gate.

