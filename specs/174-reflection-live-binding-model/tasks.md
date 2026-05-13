# Tasks: Reflection Live Binding Model

**Input**: `specs/174-reflection-live-binding-model/spec.md` and `specs/174-reflection-live-binding-model/plan.md`

## Phase 1 - Binding Authority

- [x] T001 Add schema digest comparison and stable denial mapping in `packages/logix-core/src/internal/reflection/staticLiveBinding.ts`
- [x] T002 Update binding DTO exports in `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T003 Align binding-related operation types in `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- [x] T004 Add manifest-scoped action lookup index or equivalent bounded lookup in `packages/logix-core/src/internal/reflection/staticLiveBinding.ts`
- [x] T005 [P] Extend binding outcome tests in `packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts`
- [x] T006 [P] Add large-manifest bounded lookup guard in `packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts`

## Phase 2 - Producer Path Unification

- [x] T007 Update React lifecycle carrier binding shape in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T008 Update runtime lifecycle bridge registration in `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
- [x] T009 Update module hook binding registration in `packages/logix-react/src/internal/hooks/useModule.ts`
- [x] T010 Update browser adapter binding resolution in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T011 Add binding index cleanup on target or manifest lifecycle in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T012 [P] Add lifecycle binding proof in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T013 [P] Add binding cleanup proof in `packages/logix-core/test/internal/LiveBridge/live-binding-cleanup.guard.test.ts`

## Phase 3 - Inspect Actions Projection

- [x] T014 Require owner-derived binding or explicit gap in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T015 Remove matched-proof reliance on `manifest:unknown` defaults in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T016 Make action projection on-demand and budgeted in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T017 Update action projection mapping in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T018 [P] Add canonical matched binding test in `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`
- [x] T019 [P] Add missing binding transient gap test in `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`

## Phase 4 - Dispatch Admission

- [x] T020 Route reflected dispatch admission through owner binding in `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- [x] T021 Add no-mutation denial for schema mismatch in `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- [x] T022 Remove terminal declared-action fallback proof from `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- [x] T023 Keep dispatch admission allocation to minimal binding header and denial metadata in `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- [x] T024 Attach admitted binding headers in `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [x] T025 Update browser dispatch request binding in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T026 [P] Add no-mutation denial tests in `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`

## Phase 5 - Cost And Memory Proof

- [x] T027 Add disabled-allocation guard for action projections in `packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts`
- [x] T028 Add no background binding collection guard when live inspect is disabled in `packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts`
- [x] T029 Add carrier no-full-manifest-retention assertion in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T030 Record chosen cost measurement method in `specs/174-reflection-live-binding-model/plan.md`

## Phase 6 - Carrier And Evidence Proof

- [x] T031 Update CLI live carrier assertions in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T032 Update inspect coverage harness in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- [x] T033 [P] Add adapter no-private-schema assertion in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T034 [P] Add evidence packaging assertion in existing canonical evidence test files touched by live inspect output

## Phase 7 - Documentation And Status Writeback

- [x] T035 Update `specs/173-runtime-inspect-evidence-end-state/tasks.md` after 174 implementation closes
- [x] T036 Update `specs/167-runtime-reflection-manifest/spec.md` only if the static-live binding DTO changes
- [x] T037 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation
- [x] T038 Run 174 text hygiene checks from `specs/174-reflection-live-binding-model/plan.md`

## Required Verification

```text
rtk pnpm --filter @logixjs/core test -- --run packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts
rtk pnpm --filter @logixjs/core test -- --run packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts packages/logix-core/test/internal/LiveBridge/live-binding-cleanup.guard.test.ts
rtk pnpm --filter @logixjs/react test -- --run packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
```

## Dependency Notes

T001 through T006 block all later phases.

T007 through T013 block browser adapter proof but can run after core binding DTOs are stable.

T014 through T019 and T020 through T026 can proceed in parallel after Phase 1.

T027 through T030 require inspect and dispatch projections to be stable enough to measure.

T031 through T034 require inspect, dispatch and cost proofs to be stable.

T035 through T038 are final writeback tasks and must not start until implementation evidence is available.
