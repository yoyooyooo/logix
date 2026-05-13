# Tasks: Live Diagnosis Evidence Closure

**Input**: Design documents from `specs/187-live-diagnosis-evidence/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 187 touches live CLI route surface, LiveCommandResult schema, Runtime inspect evidence, canonical evidence export, disabled-overhead and cleanup gates.

**Organization**: Tasks are grouped by user story. Stable live owner law stays in [spec.md](./spec.md), `15` and `18`; this file defines execution order, proof obligations and writeback points.

## Phase 1: Setup And Baseline

**Purpose**: Establish current live behavior and prevent verdict/repair/debug scope drift.

- [x] T001 Review authority in `specs/187-live-diagnosis-evidence/spec.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `specs/171-agent-live-runtime-bridge/spec.md`, `specs/172-agent-first-runtime-inspect-data-plane/spec.md` and `specs/185-repair-intent-contract/spec.md`
- [x] T002 [P] Run current CLI live route baseline for `packages/logix-cli/test/Integration/live-namespace.contract.test.ts` and `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T003 [P] Run current CLI live inspect baseline for `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- [x] T004 [P] Run current daemon carrier baseline for `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts` and `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`
- [x] T005 [P] Run current evidence handoff baseline for `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [x] T006 [P] Run current core LiveBridge coverage baseline for `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- [x] T007 [P] Run current disabled-overhead baseline for `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts`
- [x] T008 Classify touched-file size and decomposition risk for `packages/logix-core/src/internal/runtime/core/live*`, `packages/logix-cli/src/internal/live*`, `packages/logix-cli/src/internal/commands/live.ts` and optional `packages/logix-react/src/internal/dev/`

## Phase 2: Foundational Live Result Boundary

**Purpose**: Keep live route and result envelope separate from verification report authority.

- [x] T009 [P] Add or align forbidden verification field guards in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T010 [P] Add flat live root and `logix debug` rejection guards in `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`
- [x] T011 [P] Align `LiveCommandResult` output selection through `primaryLiveOutputKey` in `packages/logix-cli/src/internal/liveResult.ts`
- [x] T012 [P] Add live schema mirror guards for command roots and result envelope fields in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T013 Preserve live result boundary in `packages/logix-cli/src/internal/commands/live.ts` and `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: Live output cannot be consumed as a verification report.

## Phase 3: User Story 1 - Inspect A Live Target (Priority: P1)

**Goal**: Agents discover live targets and inspect owner-backed state, actions, events, timeline, fields and summary artifacts or structured gaps.

**Independent Test**: Run daemon-backed live route tests and inspect only `LiveCommandResult` artifacts.

### Tests for User Story 1

- [x] T014 [P] [US1] Add target coordinate stability assertions in `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- [x] T015 [P] [US1] Add state/actions/events/timeline inspect artifact assertions in `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`
- [x] T016 [P] [US1] Add fields/field graph/field summary inspect assertions in `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`
- [x] T017 [P] [US1] Add summary inspect artifact assertions in `packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts`
- [x] T018 [P] [US1] Add structured gap assertions for missing/disappeared targets in `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`

### Implementation for User Story 1

- [x] T019 [US1] Preserve target coordinate discovery in `packages/logix-core/src/internal/runtime/core/liveInspect.ts` and `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T020 [US1] Preserve owner-backed inspect artifacts and gaps in `packages/logix-core/src/internal/runtime/core/liveTypes.ts`, `packages/logix-core/src/internal/runtime/core/liveInspect.ts` and `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T021 [US1] Preserve timeline cursor and safe resume gaps in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T022 [US1] Preserve live inspect output selection in `packages/logix-cli/src/internal/commands/live.ts`

**Checkpoint**: User Story 1 proves runtime context is available without carrier-owned facts.

## Phase 4: User Story 2 - Export Evidence To Verification (Priority: P1)

**Goal**: Live capture or snapshot exports canonical evidence, and trial or compare consumes it before repair hints appear.

**Independent Test**: Run live capture/snapshot export and feed the package to trial startup.

### Tests for User Story 2

- [x] T023 [P] [US2] Add capture and snapshot evidence ref assertions in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [x] T024 [P] [US2] Add trial consumption and repair backlink assertions in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [x] T025 [P] [US2] Add evidence export owner marker and gap preservation assertions in `packages/logix-core/test/internal/LiveBridge/live-evidence-facets.contract.test.ts`
- [x] T026 [P] [US2] Add dispatch denial no-mutation assertions in `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] Preserve canonical evidence export refs in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [x] T028 [US2] Preserve capture/snapshot/wait/dispatch/profile live artifact families in `packages/logix-core/src/internal/runtime/core/liveOperations.ts` and `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T029 [US2] Preserve evidence handoff through CLI live export in `packages/logix-cli/src/internal/commands/live.ts`
- [x] T030 [US2] Ensure verification report repair backlinks consume evidence only after trial/compare in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

**Checkpoint**: User Story 2 proves live diagnosis becomes repairable only through verification.

## Phase 5: User Story 3 - Preserve No-Second-Truth Boundaries (Priority: P2)

**Goal**: Live artifacts stay useful but non-authoritative for verification verdicts, repair and stage scheduling.

**Independent Test**: Sweep live result schemas and artifacts for forbidden fields and prove daemon-retained evidence does not synthesize missing facts.

### Tests for User Story 3

- [x] T031 [P] [US3] Add no-verdict/no-repair/no-next-stage assertions for all live artifact families in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T032 [P] [US3] Add daemon retained segment owner-marker assertions in `packages/logix-core/test/internal/LiveBridge/live-evidence-segment.contract.test.ts`
- [x] T033 [P] [US3] Add disabled allocation and cleanup assertions in `packages/logix-core/test/internal/LiveBridge/live-disabled-overhead.guard.test.ts` and `packages/logix-core/test/internal/LiveBridge/live-binding-cleanup.guard.test.ts`
- [x] T034 [P] [US3] Add coverage inventory assertions in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`

### Implementation for User Story 3

- [x] T035 [US3] Preserve no-second-truth live output constraints in `packages/logix-cli/src/internal/liveResult.ts`
- [x] T036 [US3] Preserve daemon retained owner segment markers and leases in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T037 [US3] Preserve disabled-overhead and lifecycle cleanup in `packages/logix-core/src/internal/runtime/core/liveBindingRegistry.ts` and related live owner modules
- [x] T038 [US3] Update runtime inspect coverage inventory only for real owner-backed/gap closure changes in `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md`

**Checkpoint**: User Story 3 proves live remains evidence, not a second verification plane.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T039 [P] Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only for final public live grammar or schema deltas
- [x] T040 [P] Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only for final owner law, cost law or proof obligation deltas
- [x] T041 [P] Update `docs/ssot/runtime/09-verification-control-plane.md` only for final evidence handoff into verification deltas
- [x] T042 [P] Update `skills/logix-cli/SKILL.md` and `skills/logix-cli/references/commands.v1.json` only if Agent live recipe or schema mirror changed
- [x] T043 [P] Update runtime inspect coverage notes in `specs/172-agent-first-runtime-inspect-data-plane/notes/verification.md` if inventory or proof refs changed
- [x] T044 Update 187 quickstart and final status notes in `specs/187-live-diagnosis-evidence/quickstart.md`, `specs/187-live-diagnosis-evidence/spec.md` and `specs/README.md`
- [x] T045 Run CLI live route and forbidden-field verification listed in `specs/187-live-diagnosis-evidence/quickstart.md`
- [x] T046 Run daemon carrier and evidence handoff verification listed in `specs/187-live-diagnosis-evidence/quickstart.md`
- [x] T047 Run core LiveBridge coverage and disabled-overhead verification listed in `specs/187-live-diagnosis-evidence/quickstart.md`
- [x] T048 Run final text sweeps listed in `specs/187-live-diagnosis-evidence/quickstart.md`
- [x] T049 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and can proceed after Phase 2.
- US3 depends on Phase 2 and must be rerun after US1/US2 because it proves no-second-truth boundaries across all live artifact families.
- Phase 6 depends on selected user stories being implemented and proof facts being stable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2 and consumes target/capture behavior from US1 when available.
- US3: depends on Phase 2 and should be repeated after any live artifact family changes.

## Parallel Opportunities

```text
T002, T003, T004, T005, T006, T007 and T008 can run together.
T009, T010, T011 and T012 can run together before T013.
T014, T015, T016, T017 and T018 can be written together before US1 implementation.
T023, T024, T025 and T026 can be written together before US2 implementation.
T031, T032, T033 and T034 can be written together before US3 implementation.
T039, T040, T041, T042 and T043 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 inspect target and owner-backed/gap proof.
3. Complete US2 export evidence and verification handoff proof.
4. Run US3 forbidden-field proof across touched live outputs.

### Full 187 Closure

1. Complete cost, retention and cleanup evidence.
2. Update coverage inventory and SSoT writebacks.
3. Run all quickstart proof commands and text sweeps.

## Notes

- Do not include `trial --mode scenario`.
- Do not add `logix debug` or flat live roots.
- Do not put verification report fields in `LiveCommandResult`.
- Do not let daemon/browser/CLI/Workbench own runtime facts.
- Do not make host adjunct evidence a 187-owned terminal feature.
