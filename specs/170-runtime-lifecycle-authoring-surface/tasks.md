# Tasks: Runtime Lifecycle Authoring Surface

**Input**: Design documents from `/specs/170-runtime-lifecycle-authoring-surface/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md), [discussion.md](./discussion.md)

**Tests**: Required. This feature changes public Logic authoring, runtime startup behavior, diagnostics wording, React Provider observation boundaries, and active docs / skills. Tests, text sweeps, and performance evidence are part of the implementation contract.

**Organization**: Tasks are grouped by user story after shared setup and foundational gates. The implementation is single-track and forward-only. No compatibility alias, deprecation period, replacement namespace, public lifecycle facade, or second public phase object may be added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase after dependencies are met
- **[Story]**: User story label from [spec.md](./spec.md)
- Every task names concrete files or bounded existing directories

## Phase 1: Setup

**Purpose**: Establish execution state, baseline evidence targets, and pre-cutover guardrails.

- [x] T001 Update `specs/170-runtime-lifecycle-authoring-surface/spec.md` status to `Active` when implementation starts.
- [x] T002 Create `specs/170-runtime-lifecycle-authoring-surface/perf/README.md` for runtime lifecycle performance evidence notes.
- [x] T003 Record before-change environment notes and perf commands in `specs/170-runtime-lifecycle-authoring-surface/perf/README.md`.
- [x] T004 Record that before-change runtime lifecycle perf collection is deferred by user decision because the current dirty branch is not performance-comparable.
- [x] T005 [P] Run the initial lifecycle public-family text sweep from `specs/170-runtime-lifecycle-authoring-surface/quickstart.md` and capture classifications for implementation planning.
- [x] T006 [P] Audit `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`, `packages/logix-core/src/internal/runtime/core/module.ts`, and `packages/logix-core/src/internal/authoring/logicDeclarationCapture.ts` for public lifecycle authoring entrypoints.
- [x] T007 [P] Audit `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`, `packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts`, and `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts` for readiness, run, and diagnostics wording.

**Checkpoint**: Baseline target exists, lifecycle text hits have an initial classification map, and the feature is Active.

## Phase 2: Foundational

**Purpose**: Land shared public-surface witnesses and large-file guardrails before semantic API cutover.

- [x] T008 Add public authoring type-surface witness for `$.readyAfter(effect, { id?: string })` in `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`.
- [x] T009 Add public authoring negative witness for `$.lifecycle.*`, `$.startup.*`, `$.ready.*`, `$.resources.*`, and `$.signals.*` in `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`.
- [x] T010 Add runtime diagnostic wording guard for forbidden lifecycle handler hints in `packages/logix-core/test/Contracts/LogicLifecycleDiagnosticsWording.contract.test.ts`.
- [x] T011 Add no-behavior split proof for `BoundApiRuntime.ts` in `packages/logix-core/test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts`.
- [x] T012 Extract readiness registration helper from `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` into `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.readiness.ts` with no semantic change.
- [x] T013 Keep `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` as API assembly coordinator and verify one-way import from `BoundApiRuntime.ts` to `BoundApiRuntime.readiness.ts`.
- [x] T014 No `ModuleRuntime.impl.ts` semantic edit was required for this cutover; existing internal lifecycle adapter remains internal-only.
- [x] T015 Run focused decomposition and public authoring contract tests from `specs/170-runtime-lifecycle-authoring-surface/quickstart.md`.

**Checkpoint**: Public surface witnesses exist and the large bound API file is prepared for semantic cutover.

## Phase 3: User Story 1 - Author Declares Readiness Without Lifecycle Noun (Priority: P1)

**Goal**: Authors and Agents use `$.readyAfter(...)` as the only public readiness declaration route.

**Traceability**: NS-3, NS-8, KF-3

**Independent Test**: A module with two readiness requirements can be authored with `$.readyAfter(...)`, blocks instance readiness until both finish, and exposes structured failure evidence if either fails.

### Tests for User Story 1

- [x] T016 [P] [US1] Add readiness order tests using `$.readyAfter(...)` in `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessRequirement.contract.test.ts`.
- [x] T017 [P] [US1] Add readiness failure diagnostic tests in `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessFailureDiagnostics.contract.test.ts`.
- [x] T018 [P] [US1] Add declaration-root phase guard tests for `$.readyAfter(...)` in `packages/logix-core/test/internal/Runtime/Lifecycle/Lifecycle.PhaseGuard.test.ts` and `packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`.

### Implementation for User Story 1

- [x] T019 [US1] Add `readyAfter` to `BoundApi` in `packages/logix-core/src/internal/runtime/core/module.ts` and remove public `lifecycle` from the public bound authoring type.
- [x] T020 [US1] Implement `$.readyAfter(effect, { id?: string })` registration in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.readiness.ts`.
- [x] T021 [US1] Wire `BoundApiRuntime.ts` to expose root-level `readyAfter` and stop exposing the public `lifecycle` family.
- [x] T022 [US1] `logicDeclarationCapture.ts` required no public lifecycle compatibility path; readiness registration is safely no-op for declaration capture and fields remain captured.
- [x] T023 [US1] Ensure `packages/logix-core/src/internal/runtime/core/Lifecycle.ts` or its successor keeps readiness registration internal-only and records deterministic readiness ids.
- [x] T024 [US1] Update readiness failure diagnostics in `packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts` and `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts` to reference `$.readyAfter(...)`.
- [x] T025 [US1] Rewrite readiness success-path tests that use `$.lifecycle.onInitRequired` to `$.readyAfter(...)` under `packages/logix-core/test/Runtime/ModuleRuntime/` and `packages/logix-core/test/Logic/`.

**Checkpoint**: US1 is complete when readiness can be authored only through `$.readyAfter(...)` in public success paths.

## Phase 4: User Story 2 - Author Runs Long-Lived Behavior Through Returned Run Effect (Priority: P1)

**Goal**: Long-lived startup-adjacent work uses the returned run effect and no public start hook.

**Traceability**: NS-3, NS-4, KF-3, KF-4

**Independent Test**: A module that previously used `$.lifecycle.onStart(...)` is rewritten to returned run effect behavior with the same observable action handling or background task outcome.

### Tests for User Story 2

- [x] T026 [P] [US2] Add returned run effect after-readiness tests in `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.RunAfterReadiness.contract.test.ts`.
- [x] T027 [P] [US2] Add non-blocking ready status test for long-lived returned run effect in `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.RunDoesNotBlockReady.contract.test.ts`.
- [x] T028 [P] [US2] Add negative public `onStart` authoring witness in `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`.

### Implementation for User Story 2

- [x] T029 [US2] Verify `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` starts returned run effects after readiness succeeds.
- [x] T030 [US2] Remove public `onStart` registration from bound authoring in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` and `packages/logix-core/src/internal/runtime/core/module.ts`.
- [x] T031 [US2] Keep any internal start task substrate classified as internal-only or remove it if it no longer has an internal owner in `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`.
- [x] T032 [US2] Rewrite public success-path `onStart` tests to returned run effect tests under `packages/logix-core/test/Logic/` and `packages/logix-core/test/Runtime/Lifecycle/`.
- [x] T033 [US2] Update runtime error observation route for returned run effect failures in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`.

**Checkpoint**: US2 is complete when returned run effect is the only public long-lived behavior path.

## Phase 5: User Story 3 - Author Releases Dynamic Resources Through Scope (Priority: P2)

**Goal**: Dynamic cleanup follows Effect Scope ownership and public destroy registration is removed.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Independent Test**: A run effect using `Effect.acquireRelease` releases its resource on runtime scope close and no public destroy registration is needed.

### Tests for User Story 3

- [x] T034 [P] [US3] Add Scope finalizer cleanup witness in `packages/logix-core/test/Runtime/Lifecycle/Lifecycle.ScopeFinalizerCleanup.contract.test.ts`.
- [x] T035 [P] [US3] Add public destroy hook negative witness in `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`.
- [x] T036 [P] [US3] Internal destroy ordering classification is covered by `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.DestroyLifo.test.ts` using the internal lifecycle substrate directly.

### Implementation for User Story 3

- [x] T037 [US3] Remove public `onDestroy` registration from bound authoring in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` and `packages/logix-core/src/internal/runtime/core/module.ts`.
- [x] T038 [US3] Keep runtime-owned destroy / close finalizers internal-only in `packages/logix-core/src/internal/runtime/core/Lifecycle.ts` and the runtime close path.
- [x] T039 [US3] Rewrite dynamic resource cleanup examples and tests to `Effect.acquireRelease` under `packages/logix-core/test/Runtime/Lifecycle/`.
- [x] T040 [US3] Ensure cleanup failure diagnostics do not instruct authors to add public lifecycle handlers.

**Checkpoint**: US3 is complete when dynamic cleanup examples use Scope and old destroy hooks are only internal, negative, or archived.

## Phase 6: User Story 4 - Host Signals Stay With Host Owners (Priority: P2)

**Goal**: Suspend, resume, reset, and hot update stay with Platform / host carrier / dev lifecycle internals.

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Independent Test**: React dev lifecycle and Platform signal docs route through host carrier or Platform owner, while ordinary Logic examples contain no public suspend, resume, or reset hooks.

### Tests for User Story 4

- [x] T041 [P] [US4] Add negative public signal hook witness in `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`.
- [x] T042 [P] [US4] Add Platform / host carrier ownership guard in `packages/logix-core/test/Contracts/HostSignalOwnership.contract.test.ts`.
- [x] T043 [P] [US4] Add React hot lifecycle carrier ownership guard in `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`.

### Implementation for User Story 4

- [x] T044 [US4] Remove public `onSuspend`, `onResume`, and `onReset` from bound authoring in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` and `packages/logix-core/src/internal/runtime/core/module.ts`.
- [x] T045 [US4] Keep Platform signal substrate internal-only in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`.
- [x] T046 [US4] Rewrite ordinary Logic platform-signal tests under `packages/logix-core/test/Platform.test.ts` and `packages/logix-core/test/PlatformSignals.test.ts` into host-owner or negative-public witnesses.
- [x] T047 [US4] Verify React dev lifecycle files under `packages/logix-react/src/internal/provider/` and `packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts` retain host-carrier ownership without teaching ordinary Logic hooks.

**Checkpoint**: US4 is complete when host signals have no ordinary public Logic authoring route.

## Phase 7: User Story 5 - Reviewer Can Reject Lifecycle Surface Drift (Priority: P3)

**Goal**: Reviewers can classify and reject lifecycle authoring drift within five minutes.

**Traceability**: NS-4, KF-4, KF-9

**Independent Test**: A proposed API or doc patch containing old lifecycle names or new startup/signal/resource namespaces can be classified as allowed internal, negative, archived, or rejected public drift.

### Tests for User Story 5

- [x] T048 [P] [US5] Add text-sweep classification test or script fixture for old lifecycle names in `packages/logix-core/test/Contracts/LogicLifecycleTextSweep.contract.test.ts`.
- [x] T049 [P] [US5] Add Agent guidance drift guard for forbidden replacement families in `packages/logix-core/test/Contracts/AgentLifecycleGuidance.contract.test.ts`.

### Implementation for User Story 5

- [x] T050 [US5] Run the old lifecycle public-family sweep from `specs/170-runtime-lifecycle-authoring-surface/quickstart.md`.
- [x] T051 [US5] Rewrite active docs under `docs/ssot/runtime/` so public success paths use `$.readyAfter(...)` only.
- [x] T052 [US5] Rewrite guardrails in `docs/standards/logix-api-next-guardrails.md` if implementation evidence refines old-name classification.
- [x] T053 [US5] Rewrite Agent generation guidance in `skills/logix-best-practices/references/agent-first-api-generation.md` and related skill references.
- [x] T054 [US5] Update package README files and examples under `packages/` and `examples/` that contain public lifecycle success-path snippets.
- [x] T055 [US5] Keep remaining internal runtime lifecycle hits classified as `internal-only`.
- [x] T056 [US5] Keep archived or superseded specs classified as `archived` or `removed-public` with explicit supersession notes.

**Checkpoint**: US5 is complete when all old lifecycle hits are classified and no public success-path lifecycle noun remains.

## Phase 8: Performance, Polish, And Cross-Cutting Checks

**Purpose**: Validate runtime cost, public surface consistency, and docs / skills agreement after all stories land.

- [x] T057 After-change runtime lifecycle performance collection intentionally deferred by user decision on 2026-05-01 because the current dirty branch is not performance-comparable.
- [x] T058 Performance diff intentionally deferred by user decision on 2026-05-01 because no accepted before / after artifacts exist.
- [x] T059 Record performance comparability and no-performance-claim notes in `specs/170-runtime-lifecycle-authoring-surface/perf/README.md`.
- [x] T060 Run focused core readiness and lifecycle tests from `specs/170-runtime-lifecycle-authoring-surface/quickstart.md`.
- [x] T061 Run focused React Provider observation tests from `specs/170-runtime-lifecycle-authoring-surface/quickstart.md`.
- [x] T062 Run public authoring contract and type-surface tests for `$.readyAfter(...)` and forbidden families.
- [x] T063 Run feasible package-level typechecks: `packages/logix-core`, `packages/logix-form`, and `packages/logix-react`. Workspace `pnpm typecheck`, `pnpm lint`, and `pnpm test:turbo` were not run on this dirty mixed-feature branch.
- [x] T064 Run `pnpm check:effect-v4-matrix` if Effect-facing signatures or tests changed.
- [x] T065 Run final text sweep across `docs`, `specs`, `packages`, `examples`, and skills.

## Phase 9: Result Writeback

**Purpose**: Make stable implementation outcomes authoritative and close the spec loop.

- [x] T066 Update `docs/ssot/runtime/01-public-api-spine.md` with the final public readiness method and removed lifecycle surface.
- [x] T067 Update `docs/ssot/runtime/03-canonical-authoring.md` with final readiness, returned run effect, Scope cleanup, and owner routing.
- [x] T068 Update `docs/ssot/runtime/05-logic-composition-and-override.md` with final Logic contribution boundary.
- [x] T069 Update `docs/ssot/runtime/09-verification-control-plane.md` with final readiness / lifecycle evidence layering.
- [x] T070 Update `docs/ssot/runtime/10-react-host-projection-boundary.md` if Provider observation or host carrier wording changed.
- [x] T071 Update `docs/ssot/runtime/README.md` and `docs/standards/logix-api-next-guardrails.md` with final links and guardrails.
- [x] T072 Update `specs/011-upgrade-lifecycle/spec.md` and `specs/136-declare-run-phase-contract/spec.md` supersession notes if implementation changes wording.
- [x] T073 Update `skills/logix-best-practices/references/agent-first-api-generation.md` and related skill references after examples are final.
- [x] T074 Keep `specs/170-runtime-lifecycle-authoring-surface/discussion.md` as useful reopen memory; no Must Close item remains.
- [x] T075 Update `specs/README.md` status and notes for `170-runtime-lifecycle-authoring-surface`.
- [x] T076 Update `specs/170-runtime-lifecycle-authoring-surface/spec.md` status to `Implemented`; performance evidence is deferred by explicit user decision, so this spec does not claim `Done` performance closure.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: Starts immediately.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks semantic public API cutover.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP scope.
- **Phase 4 US2**: Depends on US1 because returned run effect ordering must be checked against readiness.
- **Phase 5 US3**: Depends on US1 and can run in parallel with US4 after public lifecycle facade removal starts.
- **Phase 6 US4**: Depends on US1 and host carrier ownership from `158`.
- **Phase 7 US5**: Can begin after US1 public shape is final, then repeats after all stories land.
- **Phase 8 Performance and Polish**: Depends on all implemented user stories.
- **Phase 9 Result Writeback**: Depends on final behavior and evidence.

### User Story Dependencies

- **US1**: Required MVP. It closes the only public readiness route.
- **US2**: Depends on readiness ordering from US1.
- **US3**: Independent after public lifecycle facade removal, but final text sweep depends on US5.
- **US4**: Independent after public lifecycle facade removal, but final host docs depend on US5.
- **US5**: Cross-cutting drift gate, repeated after each public surface change.

### Parallel Opportunities

- T005, T006, and T007 can run in parallel.
- T008, T009, and T010 can run in parallel after the target contract file is agreed.
- US1 test tasks T016 through T018 can run in parallel.
- US3 test tasks T034 through T036 can run in parallel.
- US4 test tasks T041 through T043 can run in parallel.
- Result writeback tasks T066 through T073 can be split by document owner after implementation behavior is stable.

## Parallel Example: User Story 1

```bash
Task: "T016 [US1] Add readiness order tests in packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessRequirement.contract.test.ts"
Task: "T018 [US1] Add declaration-root phase guard tests in packages/logix-core/test/Logic/LogicReadinessAuthoringContract.test.ts"
Task: "T024 [US1] Update diagnostics wording in packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts"
```

## Parallel Example: User Story 5

```bash
Task: "T051 [US5] Rewrite active docs under docs/ssot/runtime/"
Task: "T053 [US5] Rewrite Agent generation guidance in skills/logix-best-practices/references/agent-first-api-generation.md"
Task: "T054 [US5] Update package README files and examples under packages/ and examples/"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 for US1.
4. Verify `$.readyAfter(...)` and forbidden public families before deeper run / cleanup / host signal work.

### Runtime Cutover

1. Complete US2 so returned run effect replaces public `onStart`.
2. Complete US3 so dynamic cleanup routes through Scope.
3. Complete US4 so host signals stay with Platform / host carrier.
4. Repeat US5 text sweep after each surface removal.

### Final Closure

1. Run focused test evidence and record the current performance deferral.
2. Update all authority pages, specs, examples, skills, and index entries.
3. Keep `discussion.md` only if deferred reopen candidates remain useful after implementation.
4. Keep `spec.md` at Implemented until a future comparable performance pass exists.
