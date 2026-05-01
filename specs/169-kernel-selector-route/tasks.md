# Tasks: Kernel Selector Route Contract

**Input**: Design documents from `/specs/169-kernel-selector-route/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/selector-route-contract.md](./contracts/selector-route-contract.md), [quickstart.md](./quickstart.md), [discussion.md](./discussion.md)

**Tests**: Required. This feature changes public React host surface, runtime hot paths, selector identity, dirty/read overlap, diagnostics, and verification control-plane boundaries. Tests and performance evidence are part of the implementation contract.

**Organization**: Tasks are grouped by user story after shared setup and foundational gates. The implementation is single-track and forward-only. No compatibility overload, second hook family, public `ReadQuery`, public `select.*`, or React-owned route policy may be added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase after dependencies are met
- **[Story]**: User story label from [spec.md](./spec.md)
- Every task names concrete files or bounded existing directories

## Phase 1: Setup

**Purpose**: Establish execution state, baseline evidence targets, and pre-cutover guards.

- [x] T001 Update `specs/169-kernel-selector-route/spec.md` status to `Active` when implementation starts.
- [x] T002 Create `specs/169-kernel-selector-route/perf/.gitkeep` for selector-route performance evidence output.
- [x] T003 Record the before-change performance command and environment notes in `specs/169-kernel-selector-route/perf/README.md`.
- [ ] T004 Run the before-change selector-route perf baseline and store output under `specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json`.
- [x] T005 [P] Add public no-arg host read negative type witness in `packages/logix-react/test-dts/canonical-hooks.surface.ts`.
- [x] T006 [P] Add public debug/resilience marker export guard in `packages/logix-react/test/PublicSurface/publicReachability.test.ts`.
- [x] T007 [P] Add selector route public vocabulary sweep command notes to `specs/169-kernel-selector-route/quickstart.md`.

**Checkpoint**: Baseline evidence target exists, initial public-surface witnesses are ready, and the feature is Active.

## Phase 2: Foundational

**Purpose**: Land shared internal seams and required no-behavior decomposition before semantic selector and dirty precision changes.

- [x] T008 Add no-behavior `StateTransaction` decomposition proof test coverage in `packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts`.
- [x] T009 Extract dirty path summary helpers from `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` into `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts` with no semantic change.
- [x] T010 Extract patch normalization helpers from `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` into `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts` with no semantic change.
- [x] T011 Extract transaction snapshot assembly helpers from `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` into `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts` with no semantic change.
- [x] T012 Keep `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` as the coordinator and verify one-way imports to `StateTransaction.dirty.ts`, `StateTransaction.patch.ts`, and `StateTransaction.snapshot.ts`.
- [x] T013 Add internal selector route type skeleton in `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`.
- [x] T014 Add internal selector fingerprint utility skeleton in `packages/logix-core/src/internal/runtime/core/selectorRoute.fingerprint.ts`.
- [x] T015 Add internal path authority skeleton in `packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts`.
- [x] T016 Add internal selector precision classifier skeleton in `packages/logix-core/src/internal/runtime/core/selectorRoute.precision.ts`.
- [x] T017 Add internal dirty precision skeleton in `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`.
- [x] T018 Wire internal selector route skeleton exports only through internal imports in `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` and `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`.
- [x] T019 Run focused no-behavior decomposition checks for `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` and record the command result in `specs/169-kernel-selector-route/quickstart.md`.

**Checkpoint**: Shared internal files exist, oversized transaction responsibilities are split without behavior change, and user story work can proceed.

## Phase 3: User Story 1 - App Author Reads React State Through Precise Selector Inputs (Priority: P1)

**Goal**: Public React host reads lead users and Agents to exact selector inputs by default and remove no-arg whole-state reads from success paths.

**Traceability**: NS-3, NS-8, KF-3

**Independent Test**: Type-surface and public material checks prove exact selector inputs are taught and public no-arg host reads fail as success witnesses.

### Tests for User Story 1

- [x] T020 [P] [US1] Add React hook type-surface assertions for `useSelector(handle, selector, equalityFn?)` and no-arg rejection in `packages/logix-react/test-dts/canonical-hooks.surface.ts`.
- [x] T021 [P] [US1] Add public surface contract tests for root exports and removed read shapes in `packages/logix-react/test/Contracts/ReactSelectorPublicSurface.contract.test.ts`.
- [x] T022 [P] [US1] Add Agent recipe text-sweep expectations for selector inputs in `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts`.

### Implementation for User Story 1

- [x] T023 [US1] Remove the public no-arg `useSelector(handle)` overload and implementation success path from `packages/logix-react/src/internal/hooks/useSelector.ts`.
- [x] T024 [US1] Keep repo-internal whole-state debug/test access out of public hook types in `packages/logix-react/src/internal/hooks/useSelector.ts`.
- [x] T025 [US1] Update canonical React host usage examples in `packages/logix-react/README.md` to use selector inputs only.
- [x] T026 [P] [US1] Update public API spine wording in `docs/ssot/runtime/01-public-api-spine.md` for the terminal host read shape.
- [x] T027 [P] [US1] Update canonical authoring wording in `docs/ssot/runtime/03-canonical-authoring.md` for selector input defaults.
- [x] T028 [P] [US1] Update selector type-safety ceiling guidance in `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`.
- [x] T029 [P] [US1] Update frozen API shape guidance in `docs/ssot/capability/03-frozen-api-shape.md`.
- [x] T030 [P] [US1] Update Agent guidance in `skills/logix-best-practices/references/agent-first-api-generation.md`.
- [x] T031 [P] [US1] Update React usage guidance in `skills/logix-best-practices/references/logix-react-notes.md`.
- [x] T032 [P] [US1] Update LLM React basics in `skills/logix-best-practices/references/llms/05-react-usage-basics.md`.
- [x] T033 [US1] Run and fix public read surface text sweep across `docs/ssot`, `docs/standards`, `packages/logix-react/README.md`, `skills/logix-best-practices/references`, `packages/logix-react/test-dts`, and `packages/logix-core/test-dts`.

**Checkpoint**: US1 is complete when public host read success paths no longer include no-arg `useSelector(handle)` and public guidance teaches selector inputs first.

## Phase 4: User Story 2 - React Host Cannot Bypass Core Selector Precision (Priority: P1)

**Goal**: Core owns selector precision and route decisions, while React only consumes the returned route.

**Traceability**: NS-3, NS-10, KF-3, KF-8

**Independent Test**: Exact, broad, dynamic, unknown, and internal debug/resilience cases follow core route decisions, and React has no local broad/dynamic eligibility authority.

### Tests for User Story 2

- [x] T034 [P] [US2] Add core selector precision classification tests in `packages/logix-core/test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts`.
- [x] T035 [P] [US2] Add core route decision tests for exact, reject, and internal resilience in `packages/logix-core/test/Runtime/Runtime.selectorRouteDecision.contract.test.ts`.
- [x] T036 [P] [US2] Add React route consumption tests in `packages/logix-react/test/Hooks/useSelector.coreRoute.contract.test.tsx`.
- [x] T037 [P] [US2] Add source guard test against React-owned selector eligibility logic in `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`.

### Implementation for User Story 2

- [x] T038 [US2] Implement precision classification in `packages/logix-core/src/internal/runtime/core/selectorRoute.precision.ts`.
- [x] T039 [US2] Implement route decision assembly in `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`.
- [x] T040 [US2] Integrate selector precision records into `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`.
- [x] T041 [US2] Expose internal core route consumption entry from `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`.
- [x] T042 [US2] Update `packages/logix-react/src/internal/hooks/useSelector.ts` to request and consume the core route decision for every host-visible read.
- [x] T043 [US2] Update `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` so rejected route decisions cannot subscribe through a broad module topic.
- [x] T044 [US2] Remove local `selectorTopicEligible`-style broad, dynamic, or topic eligibility branches from `packages/logix-react/src/internal/hooks/useSelector.ts`.
- [x] T045 [US2] Keep internal debug/resilience marker generation internal-only in `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`.
- [x] T046 [US2] Update hot-path direction SSoT for core route ownership in `docs/ssot/runtime/02-hot-path-direction.md`.
- [x] T047 [US2] Update React host projection SSoT for route consumption only in `docs/ssot/runtime/10-react-host-projection-boundary.md`.

**Checkpoint**: US2 is complete when React consumes one core route decision and rejected precision cannot reach broad module subscription.

## Phase 5: User Story 3 - Kernel Prevents Selector Identity And Dirty/Read Overlap Ambiguity (Priority: P1)

**Goal**: Selector topic identity uses fingerprint authority, and dirty/read overlap uses one path-id authority with strict fallback policy.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Independent Test**: Label collisions, nested dirty paths, missing path authority, coarse dirty roots, and evaluate-all fallback produce precise routing or strict failure.

### Tests for User Story 3

- [x] T048 [P] [US3] Add selector fingerprint collision tests in `packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts`.
- [x] T049 [P] [US3] Add dirty/read overlap tests in `packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`.
- [x] T050 [P] [US3] Add dirty fallback strict failure tests in `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`.
- [x] T051 [P] [US3] Add React host dirty fallback rejection tests in `packages/logix-react/test/Hooks/useSelector.dirtyFallback.contract.test.tsx`.

### Implementation for User Story 3

- [x] T052 [US3] Implement selector fingerprint digest calculation in `packages/logix-core/src/internal/runtime/core/selectorRoute.fingerprint.ts`.
- [x] T053 [US3] Replace selector-id-only graph entry matching with fingerprint identity in `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`.
- [x] T054 [US3] Include path-authority digest or epoch in selector fingerprints from `packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts`.
- [x] T055 [US3] Implement shared read and dirty path normalization in `packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts`.
- [x] T056 [US3] Implement dirty precision classification in `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`.
- [x] T057 [US3] Feed dirty precision records from `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`.
- [x] T058 [US3] Gate dirty-all, missing path authority, unsafe coarse root, and evaluate-all fallback in `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`.
- [x] T059 [US3] Report structured dirty/read overlap fallback reasons from `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`.
- [x] T060 [US3] Update React external-store publishing to honor dirty/read overlap route outcomes in `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`.
- [x] T061 [US3] Update hot-path direction SSoT for fingerprint and dirty/read overlap policy in `docs/ssot/runtime/02-hot-path-direction.md`.

**Checkpoint**: US3 is complete when fingerprint identity prevents label collision and dirty fallback cannot silently evaluate or publish all host selectors under dev/test policy.

## Phase 6: User Story 4 - Agent Receives Actionable Precision Diagnostics Through The Right Verification Layer (Priority: P2)

**Goal**: Selector-quality diagnostics are structured and verification reports only claim evidence that each stage can legitimately observe.

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8, KF-9

**Independent Test**: Static check, startup trial, scenario evidence, and host harness evidence report only stage-authorized selector-quality facts with repair hints.

### Tests for User Story 4

- [x] T062 [P] [US4] Add verification-control-plane layering tests for selector-quality artifacts in `packages/logix-core/test/Contracts/VerificationSelectorQualityLayering.contract.test.ts`.
- [x] T063 [P] [US4] Add structured precision diagnostic serialization tests in `packages/logix-core/test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts`.
- [x] T064 [P] [US4] Add host harness selector-quality evidence tests in `packages/logix-react/test/Contracts/ReactSelectorQualityEvidence.contract.test.ts`.
- [x] T065 [P] [US4] Add non-Playground form row editing witness in `packages/logix-react/test/Hooks/useSelector.businessFormRow.contract.test.tsx`.
- [x] T066 [P] [US4] Add non-Playground master-detail imported child witness in `packages/logix-react/test/Hooks/useSelector.businessMasterDetail.contract.test.tsx`.
- [x] T067 [P] [US4] Add non-Playground dashboard independent cards witness in `packages/logix-react/test/Hooks/useSelector.businessDashboard.contract.test.tsx`.

### Implementation for User Story 4

- [x] T068 [US4] Add selector-quality artifact shape and serializer in `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`.
- [x] T069 [US4] Emit slim selector precision diagnostics from `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`.
- [x] T070 [US4] Emit dirty fallback diagnostics from `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`.
- [x] T071 [US4] Wire static selector-quality artifacts into `runtime.check` reporting in `packages/logix-core/src/Runtime.ts` without claiming React host evidence.
- [x] T072 [US4] Wire startup selector-policy artifacts into runtime trial reporting in `packages/logix-core/src/internal/observability/trialRunModule.ts` and `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`.
- [x] T073 [US4] Wire explicit React host selector-quality evidence in `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`.
- [x] T074 [US4] Update verification control-plane SSoT in `docs/ssot/runtime/09-verification-control-plane.md`.
- [x] T075 [US4] Update diagnostics and perf gate guidance in `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`.

**Checkpoint**: US4 is complete when reports separate static, startup, scenario, and host evidence and repair hints identify read precision, dirty precision, identity, and path-authority failures.

## Phase 7: Performance, Polish, And Cross-Cutting Checks

**Purpose**: Validate hot-path cost, public surface consistency, and product-level witness alignment after all stories land.

- [x] T076 Run after-change selector-route performance collection and store output under `specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json`.
- [ ] T077 Run performance diff and store output under `specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json`.
- [x] T078 Record performance comparability and any accepted regression notes in `specs/169-kernel-selector-route/perf/README.md`.
- [x] T079 Run focused core selector tests for `packages/logix-core/test/Runtime/Runtime.selector*.contract.test.ts`.
- [x] T080 Run focused React selector tests for `packages/logix-react/test/Hooks/useSelector*.contract.test.tsx`.
- [x] T081 Run React type-surface checks for `packages/logix-react/test-dts/canonical-hooks.surface.ts`.
- [x] T082 Run workspace typecheck and lint gates from `specs/169-kernel-selector-route/quickstart.md`.
- [x] T083 Run public vocabulary text sweep from `specs/169-kernel-selector-route/quickstart.md`.
- [x] T084 Update Playground product witness references in `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`.
- [x] T085 Update T2 proposal implementation follow-through notes in `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`.

## Phase 8: Result Writeback

**Purpose**: Make stable implementation outcomes authoritative and close the spec loop.

- [x] T086 Update `docs/ssot/runtime/01-public-api-spine.md` with the final public host read contract.
- [x] T087 Update `docs/ssot/runtime/02-hot-path-direction.md` with final selector route, fingerprint, path-authority, and fallback policy.
- [x] T088 Update `docs/ssot/runtime/03-canonical-authoring.md` with final selector input guidance.
- [x] T089 Update `docs/ssot/runtime/09-verification-control-plane.md` with final selector-quality evidence layering.
- [x] T090 Update `docs/ssot/runtime/10-react-host-projection-boundary.md` with final React route-consumption boundary.
- [x] T091 Update `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md` with final selector input type-safety guidance.
- [x] T092 Update `docs/ssot/capability/03-frozen-api-shape.md` with final frozen public API shape.
- [x] T093 Update `docs/standards/logix-api-next-guardrails.md` with final guardrails for selector route ownership and broad read rejection.
- [x] T094 Update `packages/logix-react/README.md` with final public examples.
- [x] T095 Update `skills/logix-best-practices/references/agent-first-api-generation.md`, `skills/logix-best-practices/references/logix-react-notes.md`, `skills/logix-best-practices/references/llms/05-react-usage-basics.md`, and `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`.
- [x] T096 Classify or remove stale deferred notes in `specs/169-kernel-selector-route/discussion.md` after implementation results are known.
- [ ] T097 Update `specs/169-kernel-selector-route/spec.md` status to `Done` only after all SC points, performance evidence, text sweep, and writebacks pass.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: Starts immediately.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks semantic user story implementation.
- **Phase 3 US1**: Depends on Phase 2. It can complete independently through public surface and guidance tests.
- **Phase 4 US2**: Depends on Phase 2. It can begin after core selector route skeleton exists.
- **Phase 5 US3**: Depends on Phase 2 and should run after US2 route contracts exist.
- **Phase 6 US4**: Depends on US2 and US3 diagnostic payloads.
- **Phase 7 Performance and Polish**: Depends on all implemented user stories.
- **Phase 8 Result Writeback**: Depends on final behavior and evidence.

### User Story Dependencies

- **US1**: Independent after foundation. Recommended MVP scope because it closes public broad-read generation.
- **US2**: Independent of US1 behavior after foundation, but final docs should align with US1.
- **US3**: Depends on the selector route and precision record shape from US2.
- **US4**: Depends on precision, route, fingerprint, and dirty fallback diagnostics from US2 and US3.

### Parallel Opportunities

- T005, T006, and T007 can run in parallel after T001.
- T013 through T017 can run in parallel after the `StateTransaction` split boundaries are understood.
- US1 docs tasks T026 through T032 can run in parallel after T023 defines the final public read shape.
- US2 test tasks T034 through T037 can run in parallel.
- US3 test tasks T048 through T051 can run in parallel.
- US4 witness tasks T062 through T067 can run in parallel once diagnostic payload contracts are known.
- Result writeback tasks T086 through T095 can be split by document owner after implementation outcomes are stable.

## Parallel Example: User Story 1

```bash
# Public-surface tests and docs can be split once the terminal hook shape is fixed.
Task: "T020 [US1] Add React hook type-surface assertions in packages/logix-react/test-dts/canonical-hooks.surface.ts"
Task: "T026 [US1] Update public API spine wording in docs/ssot/runtime/01-public-api-spine.md"
Task: "T030 [US1] Update Agent guidance in skills/logix-best-practices/references/agent-first-api-generation.md"
```

## Parallel Example: User Story 3

```bash
# Fingerprint tests and dirty overlap tests can be authored separately before integration.
Task: "T048 [US3] Add selector fingerprint collision tests in packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts"
Task: "T049 [US3] Add dirty/read overlap tests in packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts"
Task: "T050 [US3] Add dirty fallback strict failure tests in packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 for US1.
4. Verify public no-arg host read removal and selector input guidance before deeper route work.

### Core Runtime Cutover

1. Complete US2 to centralize precision and route ownership in core.
2. Complete US3 to close fingerprint identity and dirty/read overlap ambiguity.
3. Complete US4 to connect diagnostics and verification layering.

### Final Closure

1. Run performance and focused test evidence.
2. Update all authority pages, README, skills, and proposal cross-links.
3. Keep `discussion.md` only if deferred candidates remain useful after implementation.
4. Mark `spec.md` Done only after all success criteria and writebacks pass.
