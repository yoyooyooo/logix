# Tasks: Field Runtime Inspect Model

**Input**: `specs/176-field-runtime-inspect-model/spec.md` and `specs/176-field-runtime-inspect-model/plan.md`

## Phase 1 - Field Inspect Projection Model

- [x] T001 Add field inspect DTOs and owner projection helpers in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T002 Wire field inspect artifacts through `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T003 Export repo-internal field inspect bridge APIs in `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T004 [P] Add base projection tests in `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`
- [x] T005 [P] Add disabled field inspect allocation guard for field payloads and projection caches in `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`

## Phase 2 - Field Identity Digest

- [x] T006 Add provenance digest helper in `packages/logix-core/src/internal/runtime/core/ModuleFields.ts`
- [x] T007 Implement field identity digest derivation in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T008 Add missing or unstable identity gap handling in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T009 [P] Add deterministic identity tests in `packages/logix-core/test/internal/LiveBridge/live-field-inspect.contract.test.ts`

## Phase 3 - Final Field List

- [x] T010 Implement target-scoped lazy final field list projection in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T011 Add over-budget list truncation, counts, owner gap codes and artifact refs in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T012 Read owner-approved finalized snapshots from `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T013 Transport field list artifacts in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T014 Transport field list artifacts in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T015 [P] Add carrier field list proof in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

## Phase 4 - Semantic Adjacency

- [x] T016 Implement bounded semantic relation projection in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T017 Add relation digest and source ref projection in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T018 Add over-budget adjacency degraded markers or artifact refs in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T019 Ensure internal graph and plan remain non-exported from `packages/logix-core/src/internal/field-kernel/build.ts`
- [x] T020 Add raw node and raw edge guard tests in `packages/logix-core/test/internal/LiveBridge/live-field-graph.guard.test.ts`
- [x] T021 [P] Add relation kind coverage tests in `packages/logix-core/test/internal/LiveBridge/live-field-graph.guard.test.ts`

## Phase 5 - Field Summary And Convergence

- [x] T022 Implement latest field summary projection in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T023 Implement bounded convergence cause summary in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T024 Add target-scoped missing summary gaps in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T025 Clean field summary projections with target lifecycle in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T026 [P] Add field summary lifecycle cleanup tests in `packages/logix-core/test/internal/LiveBridge/live-field-summary.contract.test.ts`
- [x] T027 [P] Add field summary contract tests in `packages/logix-core/test/internal/LiveBridge/live-field-summary.contract.test.ts`

## Phase 6 - Field Event Ledger Join

- [x] T028 Implement field semantic payload join with ledger envelope in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T029 Add missing ledger envelope and join mismatch gaps in `packages/logix-core/src/internal/runtime/core/liveFieldInspect.ts`
- [x] T030 Wire optional ledger refs from `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T031 [P] Add field ledger join tests in `packages/logix-core/test/internal/LiveBridge/live-field-ledger-join.contract.test.ts`

## Phase 7 - Carrier And Evidence Proof

- [x] T032 Transport field graph and summary artifacts through `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T033 Transport field graph and summary artifacts through `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T034 [P] Update CLI carrier proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T035 [P] Add carrier marker preservation proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T036 [P] Add evidence packaging assertion in existing canonical evidence test files touched by live inspect output

## Phase 8 - Documentation And Status Writeback

- [x] T037 Update `specs/173-runtime-inspect-evidence-end-state/tasks.md` after 176 implementation closes
- [x] T038 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation. No missing owner-law proof obligation was found, so SSoT 18 remains unchanged.
- [x] T039 Keep `docs/ssot/runtime/06-form-field-kernel-boundary.md` unchanged unless field owner boundaries change. No field owner boundary change was made.
- [x] T040 Run 176 text hygiene checks from `specs/176-field-runtime-inspect-model/plan.md`

## Required Verification

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-field-inspect.contract.test.ts test/internal/LiveBridge/live-field-graph.guard.test.ts test/internal/LiveBridge/live-field-summary.contract.test.ts test/internal/LiveBridge/live-field-ledger-join.contract.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
```

## Dependency Notes

T001 through T005 block all later phases.

T006 through T009 block final field list, adjacency and event payload work.

T010 through T015 and T016 through T021 can proceed in parallel after identity digest is stable.

T022 through T027 requires final field projection.

T028 through T031 requires 175 ledger envelope shape.

T032 through T036 requires field artifact shapes to be stable.

T037 through T040 are final writeback tasks and must not start until implementation evidence is available.
