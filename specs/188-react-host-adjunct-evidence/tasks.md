# Tasks: React Host Adjunct Evidence Closure

**Input**: Design documents from `specs/188-react-host-adjunct-evidence/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 188 touches React host evidence, selector/render boundary, interaction linkage, local profile summary, disabled-overhead, cleanup and active docs routing.

**Organization**: Tasks are grouped by user story. Stable host law stays in [spec.md](./spec.md), `10`, `18` and `15`; this file defines execution order, proof obligations and writeback points.

## Phase 1: Setup And Baseline

**Purpose**: Establish current host/live behavior and prevent standalone 182, host-verdict or public debug scope drift.

- [x] T001 Review authority in `specs/188-react-host-adjunct-evidence/spec.md`, `docs/ssot/runtime/10-react-host-projection-boundary.md`, `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `specs/183-agent-debug-closure/spec.md`, `specs/187-live-diagnosis-evidence/spec.md` and `specs/182-react-host-adjunct-evidence/spec.md`
- [x] T002 [P] Run current React host internal dev baseline for `packages/logix-react/test/internal/dev/`
- [x] T003 [P] Run current RuntimeProvider baseline for `packages/logix-react/test/RuntimeProvider/`
- [x] T004 [P] Run current core host coordinate baseline for `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- [x] T005 [P] Run current transaction-window baseline for `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- [x] T006 [P] Run current CLI evidence handoff and live forbidden-field baseline for `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts` and `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T007 [P] Run production bundle isolation baseline for `examples/logix-react/test/production-bundle-dev-isolation.guard.ts` if host public imports or dev carrier boundaries may be touched
- [x] T008 Classify touched-file size and decomposition risk for `packages/logix-react/src/internal/dev/`, `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`, `packages/logix-core/src/internal/runtime/core/live*` and `packages/logix-cli/src/internal/live*`

## Phase 2: Foundational Host Adjunct Boundary

**Purpose**: Add guard rails that keep host evidence adjunct-only before feature-specific evidence work.

- [x] T009 [P] Add no-verdict/no-repair/no-scheduling host evidence guards in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T010 [P] Add runtime-truth-wins disagreement guard scaffolding in `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- [x] T011 [P] Add disabled capture gate scaffolding in `packages/logix-react/test/internal/dev/`
- [x] T012 [P] Add host evidence gap helper tests in `packages/logix-react/test/internal/dev/`
- [x] T013 Preserve adjunct-only carrier boundaries in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`, `packages/logix-core/src/internal/runtime/core/liveEvidence.ts` and `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: Host evidence cannot become runtime truth, report truth or public debug surface.

## Phase 3: User Story 1 - Explain A React Host Blind Spot (Priority: P1)

**Goal**: Host adjunct evidence supplies selector/render or interaction context linked to runtime refs without overriding runtime truth.

**Independent Test**: Use repo-internal host harness or evidence fixtures to show host context linked to runtime target and operation refs.

### Tests for User Story 1

- [x] T014 [P] [US1] Add selector/render boundary adjunct evidence tests in `packages/logix-react/test/internal/dev/live-host-adjunct-evidence.contract.test.ts`
- [x] T015 [P] [US1] Add interaction linkage tests in `packages/logix-react/test/internal/dev/live-interaction-linkage.contract.test.ts`
- [x] T016 [P] [US1] Add conflict/disagreement tests in `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- [x] T017 [P] [US1] Add canonical evidence packaging tests for host adjunct refs in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Preserve selector fingerprint or core route identity as adjunct refs in `packages/logix-react/src/internal/hooks/` and `packages/logix-react/src/internal/store/`
- [x] T019 [US1] Preserve render boundary refs or structured host gaps in `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T020 [US1] Link host interaction provenance to admitted runtime operation refs in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` and `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [x] T021 [US1] Preserve disagreement markers and runtime-truth-wins resolution through `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`

**Checkpoint**: User Story 1 closes a host blind spot without creating host-owned truth.

## Phase 4: User Story 2 - Bound Local Profile Evidence (Priority: P2)

**Goal**: Provide bounded local profile summary linked to runtime facts as local-only diagnosis evidence.

**Independent Test**: Capture profile summary fixtures under explicit budget and verify redaction, bound and link refs.

### Tests for User Story 2

- [x] T022 [P] [US2] Add local profile summary budget tests in `packages/logix-react/test/internal/dev/live-profile-summary.contract.test.ts`
- [x] T023 [P] [US2] Add profile disabled/denied/over-budget gap tests in `packages/logix-react/test/internal/dev/live-profile-disabled.guard.test.ts`
- [x] T024 [P] [US2] Add profile summary packaging tests in `packages/logix-core/test/internal/LiveBridge/live-host-coordinate.contract.test.ts`
- [x] T025 [P] [US2] Add profile evidence handoff assertions in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

### Implementation for User Story 2

- [x] T026 [US2] Implement bounded local profile summary refs and gaps in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T027 [US2] Preserve profile summary budget, redaction and local-only markers in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [x] T028 [US2] Preserve profile summary output through existing live/evidence routes in `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: User Story 2 provides performance diagnosis context without profiler truth.

## Phase 5: User Story 3 - Prove Disabled Safety (Priority: P1)

**Goal**: Host adjunct evidence imposes no disabled cost and cleans up bounded resources.

**Independent Test**: Run disabled-overhead and cleanup proofs over React host and runtime operation windows.

### Tests for User Story 3

- [x] T029 [P] [US3] Add disabled host capture allocation tests in `packages/logix-react/test/internal/dev/live-host-adjunct-disabled.guard.test.ts`
- [x] T030 [P] [US3] Add no extra render subscription fanout tests in `packages/logix-react/test/RuntimeProvider/`
- [x] T031 [P] [US3] Add transaction-window no-IO tests in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- [x] T032 [P] [US3] Add host buffer and linkage cleanup tests in `packages/logix-react/test/internal/dev/live-host-adjunct-cleanup.guard.test.ts`
- [x] T033 [P] [US3] Extend production bundle isolation guard in `examples/logix-react/test/production-bundle-dev-isolation.guard.ts` if public imports or dev carrier boundaries changed

### Implementation for User Story 3

- [x] T034 [US3] Gate host adjunct capture behind explicit dev/live enablement in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` and `packages/logix-react/src/dev/live.ts`
- [x] T035 [US3] Avoid render subscription fanout changes in `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` and `packages/logix-react/src/internal/store/`
- [x] T036 [US3] Keep host evidence IO outside runtime transaction windows in `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [x] T037 [US3] Clean host buffers, linkage indexes and profile summaries with target or host lifecycle in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`

**Checkpoint**: User Story 3 proves 188 does not tax ordinary React runtime.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T038 [P] Update `docs/ssot/runtime/10-react-host-projection-boundary.md` only for final selector/render host law deltas
- [x] T039 [P] Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only for final adjunct admission, cost law or proof obligation deltas
- [x] T040 [P] Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if public live artifact route or schema mirror changed
- [x] T041 [P] Update `specs/183-agent-debug-closure/spec.md` or notes only if final terminal host closure route needs clarification
- [x] T042 Ensure `specs/182-react-host-adjunct-evidence/spec.md` remains stopped/history and is not revived as active owner
- [x] T043 Update 188 quickstart and final status notes in `specs/188-react-host-adjunct-evidence/quickstart.md`, `specs/188-react-host-adjunct-evidence/spec.md` and `specs/README.md`
- [x] T044 Run React host proof listed in `specs/188-react-host-adjunct-evidence/quickstart.md`
- [x] T045 Run core and CLI evidence proof listed in `specs/188-react-host-adjunct-evidence/quickstart.md`
- [x] T046 Run production bundle proof listed in `specs/188-react-host-adjunct-evidence/quickstart.md` if public imports or dev carrier boundaries changed
- [x] T047 Run final text sweeps listed in `specs/188-react-host-adjunct-evidence/quickstart.md`
- [x] T048 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US3 are P1 and can proceed after Phase 2.
- US2 is P2 and depends on Phase 2; its packaging should be rechecked with US1 if both touch canonical evidence.
- Phase 6 depends on selected user stories being implemented and proof facts being stable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2 and should reuse US1 linkage refs when available.
- US3: depends on Phase 2 and must be rerun after US1/US2 because it proves disabled cost and cleanup after capture/profile changes.

## Parallel Opportunities

```text
T002, T003, T004, T005, T006, T007 and T008 can run together.
T009, T010, T011 and T012 can run together before T013.
T014, T015, T016 and T017 can be written together before US1 implementation.
T022, T023, T024 and T025 can be written together before US2 implementation.
T029, T030, T031, T032 and T033 can be written together before US3 implementation.
T038, T039, T040 and T041 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 host blind spot linkage and disagreement proof.
3. Complete US3 disabled safety for the touched host evidence.
4. Run focused React/core/CLI proof and text sweeps.

### Full 188 Closure

1. Complete US2 local profile summary if needed for terminal diagnosis coverage.
2. Re-run US3 disabled/cleanup/bundle gates.
3. Complete SSoT and stopped-182 writebacks.
4. Run all quickstart proof commands and sweeps.

## Notes

- Do not include `trial --mode scenario`.
- Do not make host evidence runtime truth or verification truth.
- Do not add `logix debug` or public host evidence route by default.
- Do not revive standalone 182.
- Do not add a second selector authority.
