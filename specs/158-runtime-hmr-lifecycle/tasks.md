# Tasks: Runtime HMR Lifecycle

**Input**: Design documents from `/specs/158-runtime-hmr-lifecycle/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: Required. This feature touches runtime lifecycle, React host projection, diagnostics, examples, browser behavior, package boundaries, and performance evidence.

**Core Rule**: Implement the terminal lifecycle model through a host dev lifecycle carrier. Do not expose `createExampleRuntimeOwner(...)` in user-facing examples. Do not add per-demo patches, compatibility shells, retention branches, new public `runtime.*` commands, or a second HMR evidence protocol.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after dependencies are complete because it touches distinct files.
- **[Story]**: User-story tasks only. Setup, foundational, polish, and writeback tasks omit story labels.
- Every task lists exact file paths.
- Completed items from the first substrate pass stay checked when the artifact still supports the carrier plan.
- Superseded helper-route items stay visible so implementation can remove the residue.

## Phase 1: Setup and Evidence Baseline

**Purpose**: Capture current behavior, freeze the revised carrier route, and prepare artifact locations before continuing code changes.

- [x] T001 Create HMR baseline capture notes in `specs/158-runtime-hmr-lifecycle/notes/hmr-baseline.md`
- [x] T002 Create runtime owner inventory notes for current examples in `specs/158-runtime-hmr-lifecycle/notes/current-runtime-owners.md`
- [x] T003 Create feature artifact directory guide in `specs/158-runtime-hmr-lifecycle/perf/README.md`
- [x] T004 [P] Record current `Runtime.make` and `ManagedRuntime.make` call sites in `specs/158-runtime-hmr-lifecycle/notes/example-runtime-callsite-inventory.md`
- [x] T005 [P] Record current React host store and provider cleanup paths in `specs/158-runtime-hmr-lifecycle/notes/react-host-cleanup-inventory.md`
- [x] T006 Record the 2026-04-26 carrier decision in `specs/158-runtime-hmr-lifecycle/discussion.md`

---

## Phase 2: Foundational Runtime Lifecycle Substrate

**Purpose**: Keep the shared internal primitives already built for owner decision, cleanup, evidence, and internal contracts. No public `Runtime.ts` HMR route is allowed.

**Critical**: No user story implementation begins until this phase is complete.

- [x] T007 [P] Add public surface guard for no HMR lifecycle route in `packages/logix-core/test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts`
- [x] T008 [P] Add internal lifecycle decision schema test for `reset | dispose` in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-decision.contract.test.ts`
- [x] T009 [P] Add host-neutral evidence shape test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-evidence.contract.test.ts`
- [x] T010 Create internal lifecycle types in `packages/logix-core/src/internal/runtime/core/hotLifecycle/types.ts`
- [x] T011 Create deterministic lifecycle identity helpers in `packages/logix-core/src/internal/runtime/core/hotLifecycle/identity.ts`
- [x] T012 Create runtime owner state machine in `packages/logix-core/src/internal/runtime/core/hotLifecycle/owner.ts`
- [x] T013 Create runtime resource registry in `packages/logix-core/src/internal/runtime/core/hotLifecycle/resourceRegistry.ts`
- [x] T014 Create lifecycle evidence builder in `packages/logix-core/src/internal/runtime/core/hotLifecycle/evidence.ts`
- [x] T015 Create idempotent cleanup coordinator in `packages/logix-core/src/internal/runtime/core/hotLifecycle/cleanup.ts`
- [x] T016 Create internal hot lifecycle barrel in `packages/logix-core/src/internal/runtime/core/hotLifecycle/index.ts`
- [x] T017 Expose repo-internal lifecycle contracts only in `packages/logix-core/src/internal/runtime-contracts.ts`
- [x] T018 Verify foundational guard tests with `pnpm -C packages/logix-core exec vitest run test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts test/Runtime/Lifecycle/hot-lifecycle-decision.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-evidence.contract.test.ts`

**Checkpoint**: Internal lifecycle primitives exist, public surface stays unchanged, and decision/evidence contracts are testable.

---

## Phase 3: Foundational Host Carrier Substrate

**Purpose**: Add the missing user-side carrier point while keeping ordinary runtime authoring unchanged.

- [x] T019 [P] Add internal Effect DI service contract tests for current hot lifecycle owner injection in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-di-context.contract.test.ts`
- [x] T020 [P] Add no public option guard for `Runtime.make({ hmr: true })` and `Runtime.make({ hotLifecycle: ... })` in `packages/logix-core/test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts`
- [x] T021 [P] Add package boundary guard for dev lifecycle entrypoints in `packages/logix-react/test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`
- [x] T022 Harden runtime hot lifecycle context service in `packages/logix-core/src/internal/runtime/core/hotLifecycle/context.ts`
- [x] T023 Ensure `Runtime.make` only consumes lifecycle services through caller-provided layers in `packages/logix-core/src/Runtime.ts`
- [x] T024 Add repo-internal carrier-facing lifecycle layer helpers in `packages/logix-core/src/internal/runtime-contracts.ts`
- [x] T025 Add React dev lifecycle carrier module in `packages/logix-react/src/dev/lifecycle.ts`
- [x] T026 Add React dev lifecycle carrier internal implementation in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T027 Add Vite dev lifecycle integration in `packages/logix-react/src/dev/vite.ts`
- [x] T028 Add Vitest lifecycle setup helper in `packages/logix-react/src/dev/vitest.ts`
- [x] T029 Add dev-only conditional exports for carrier entrypoints in `packages/logix-react/package.json`
- [x] T030 Add production static import boundary guard for carrier modules in `packages/logix-react/test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`
- [x] T031 Run carrier substrate tests with `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-di-context.contract.test.ts test/PublicSurface/RuntimeHmrNoPublicRoute.guard.test.ts && pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`

**Checkpoint**: Users have one dev host integration point, while core public runtime options stay clean.

---

## Phase 4: User Story 1 - Active Demo Survives Development Edits (Priority: P1)

**Goal**: A running timer/task demo recovers after development hot-update owner replacement without manual page refresh.

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: Enable the host dev lifecycle carrier once, simulate or trigger HMR owner replacement while active work is pending, and prove the successor runtime becomes interactive while the previous owner has no disallowed active resources.

### Tests for User Story 1

- [x] T032 [P] [US1] Add reset/dispose idempotency test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-owner-handoff.contract.test.ts`
- [x] T033 [P] [US1] Add runtime-owned resource cleanup test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts`
- [x] T034 [P] [US1] Add interrupted work no-writeback test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts`
- [x] T035 [P] [US1] Add React runtime replacement no-tearing test in `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx`
- [x] T036 [P] [US1] Add external-store listener cleanup test in `packages/logix-react/test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`
- [x] T037 [P] [US1] Supersede helper-route test in `examples/logix-react/test/hmr-lifecycle-owner.contract.test.ts`
- [x] T038 [P] [US1] Replace helper-route browser reset contract with host-carrier contract in `examples/logix-react/test/browser/hmr-active-demo-reset.contract.test.tsx`
- [x] T039 [P] [US1] Add module-only invalidation carrier contract in `examples/logix-react/test/browser/hmr-module-invalidation-carrier.contract.test.tsx`
- [x] T040 [P] [US1] Add host carrier setup contract in `examples/logix-react/test/hmr-host-carrier.contract.test.ts`

### Implementation for User Story 1

- [x] T041 [US1] Implement reset and dispose handoff behavior in `packages/logix-core/src/internal/runtime/core/hotLifecycle/owner.ts`
- [x] T042 [US1] Implement idempotent cleanup execution in `packages/logix-core/src/internal/runtime/core/hotLifecycle/cleanup.ts`
- [x] T043 [US1] Attach task and timer resources to lifecycle registry in `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- [x] T044 [US1] Attach module runtime and imports-scope resources to lifecycle registry in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T045 [US1] Attach runtime store topic cleanup to lifecycle registry in `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- [x] T046 [US1] Attach debug sink cleanup to lifecycle registry in `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T047 [US1] Add runtime owner accessors to internal contracts in `packages/logix-core/src/internal/InternalContracts.ts`
- [x] T048 [US1] Extract React hot lifecycle binding helper in `packages/logix-react/src/internal/provider/runtimeHotLifecycle.ts`
- [x] T049 [US1] Keep `RuntimeProvider` projection-only while consuming hot lifecycle binding in `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- [x] T050 [US1] Extract runtime external-store disposal helpers in `packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts`
- [x] T051 [US1] Wire host binding cleanup summaries into `packages/logix-react/src/internal/provider/runtimeBindings.ts`
- [x] T052 [US1] Remove or relocate repo-local example lifecycle owner helper from `examples/logix-react/src/runtime/lifecycleOwner.ts`
- [x] T053 [US1] Remove or relocate repo-local module HMR boundary adapter from `examples/logix-react/src/runtime/moduleHotBoundary.ts`
- [x] T054 [US1] Remove `createExampleRuntimeOwner(...)` authoring call from `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- [x] T055 [US1] Remove `createExampleRuntimeOwner(...)` authoring call from `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- [x] T056 [US1] Remove `createExampleRuntimeOwner(...)` authoring call from `examples/logix-react/src/demos/AppDemoLayout.tsx`
- [x] T057 [US1] Remove `createExampleRuntimeOwner(...)` authoring call from `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- [x] T058 [US1] Configure example dev lifecycle carrier once in `examples/logix-react/vite.config.ts`
- [x] T059 [US1] Configure example test lifecycle carrier once in `examples/logix-react/vitest.config.ts`
- [x] T060 [US1] Add browser test project for host-carrier HMR evidence in `examples/logix-react/vitest.config.ts`
- [x] T061 [US1] Run US1 focused core tests with `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-owner-handoff.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-resource-cleanup.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-interrupted-work.guard.test.ts`
- [x] T062 [US1] Run US1 React tests with `pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`
- [x] T063 [US1] Run US1 example carrier tests with `pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx`

**Checkpoint**: Active example recovery works through the host dev lifecycle carrier and no covered demo calls `createExampleRuntimeOwner(...)`.

---

## Phase 5: User Story 2 - Runtime Lifecycle Is Explainable (Priority: P2)

**Goal**: Hot lifecycle transitions produce slim, serializable evidence through the existing evidence envelope.

**Traceability**: NS-5, NS-10, KF-6, KF-8

**Independent Test**: Trigger reset and dispose transitions and assert lifecycle evidence includes runtime identity, decision, cleanup outcome, residual summary, and host cleanup summary when present.

### Tests for User Story 2

- [x] T064 [P] [US2] Add lifecycle evidence serialization test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts`
- [x] T065 [P] [US2] Add diagnostics-disabled correctness guard in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts`
- [x] T066 [P] [US2] Add host cleanup summary evidence test in `packages/logix-react/test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`
- [x] T067 [P] [US2] Add evidence envelope contract test in `packages/logix-core/test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts`
- [x] T068 [P] [US2] Add host-carrier evidence export test in `packages/logix-core/test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts`

### Implementation for User Story 2

- [x] T069 [US2] Implement lifecycle evidence event assembly in `packages/logix-core/src/internal/runtime/core/hotLifecycle/evidence.ts`
- [x] T070 [US2] Add lifecycle event serialization into debug adapter in `packages/logix-core/src/internal/debug-api.ts`
- [x] T071 [US2] Connect lifecycle evidence to existing evidence envelope in `packages/logix-core/src/internal/verification/evidence.ts`
- [x] T072 [US2] Add lifecycle evidence export support in `packages/logix-core/src/internal/verification/evidenceExportPipeline.ts`
- [x] T073 [US2] Add host cleanup summary ingestion to React lifecycle binding in `packages/logix-react/src/internal/provider/runtimeHotLifecycle.ts`
- [x] T074 [US2] Add feature evidence artifact writer in `examples/logix-react/test/support/hmrWitnessArtifacts.ts`
- [x] T075 [US2] Verify diagnostics-disabled path avoids correctness dependency in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts`
- [x] T076 [US2] Run US2 focused tests with `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-evidence-serialization.contract.test.ts test/Runtime/Lifecycle/hot-lifecycle-diagnostics-disabled.guard.test.ts test/Contracts/HotLifecycleEvidenceEnvelope.contract.test.ts test/Contracts/HotLifecycleEvidenceExportPipeline.contract.test.ts`
- [x] T077 [US2] Run US2 React evidence tests with `pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx`

**Checkpoint**: Evidence explains reset, dispose, cleanup failure, and host cleanup without adding a second report protocol.

---

## Phase 6: User Story 3 - Authors Get One Lifecycle Model (Priority: P3)

**Goal**: Docs and examples present one owner model that agents and humans can follow.

**Traceability**: NS-8, NS-10

**Independent Test**: A new example keeps normal `Runtime.make` / `ManagedRuntime.make` / `RuntimeProvider` code, enables one host dev lifecycle carrier, and passes HMR lifecycle checks without bespoke cleanup.

### Tests for User Story 3

- [x] T078 [P] [US3] Update example static sweep to reject `createExampleRuntimeOwner(...)` authoring calls in `examples/logix-react/test/hmr-lifecycle-dogfood-sweep.contract.test.ts`
- [x] T079 [P] [US3] Update docs closure snapshot test for host carrier wording in `packages/logix-core/test/Contracts/HotLifecycleDocsWriteback.contract.test.ts`
- [x] T080 [P] [US3] Keep control-plane negative writeback test in `packages/logix-core/test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts`
- [x] T081 [P] [US3] Add public docs import boundary snapshot for dev lifecycle carrier in `packages/logix-react/test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`

### Implementation for User Story 3

- [x] T082 [US3] Sweep `examples/logix-react/src/demos/FractalRuntimeLayout.tsx` to normal authoring plus host carrier support
- [x] T083 [US3] Sweep `examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T084 [US3] Sweep `examples/logix-react/src/demos/CounterWithProfileDemo.tsx` to normal authoring plus host carrier support
- [x] T085 [US3] Sweep `examples/logix-react/src/demos/SuspenseModuleLayout.tsx` to normal authoring plus host carrier support
- [x] T086 [US3] Sweep `examples/logix-react/src/demos/LocalModuleLayout.tsx` to normal authoring plus host carrier support
- [x] T087 [US3] Sweep `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx` to normal authoring plus host carrier support
- [x] T088 [US3] Sweep `examples/logix-react/src/demos/DiShowcaseLayout.tsx` to normal authoring plus host carrier support
- [x] T089 [US3] Sweep `examples/logix-react/src/demos/I18nDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T090 [US3] Sweep `examples/logix-react/src/demos/SessionModuleLayout.tsx` to normal authoring plus host carrier support
- [x] T091 [US3] Sweep `examples/logix-react/src/demos/form/FormFieldArraysDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T092 [US3] Sweep `examples/logix-react/src/demos/form/FormFieldSourceDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T093 [US3] Sweep `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T094 [US3] Sweep `examples/logix-react/src/demos/form/FormCompanionDemoLayout.tsx` to normal authoring plus host carrier support
- [x] T095 [US3] Sweep `examples/logix-react/src/modules/querySearchDemo.ts` to normal authoring plus host carrier support
- [x] T096 [US3] Remove long-term bespoke `import.meta.hot.dispose` snippets from `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- [x] T097 [US3] Remove long-term bespoke `import.meta.hot.dispose` snippets from `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- [x] T098 [US3] Remove long-term bespoke `import.meta.hot.dispose` snippets from `examples/logix-react/src/demos/AppDemoLayout.tsx`
- [x] T099 [US3] Remove long-term bespoke `import.meta.hot.dispose` snippets from `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- [x] T100 [US3] Update React host owner law in `docs/ssot/runtime/10-react-host-projection-boundary.md`
- [x] T101 [US3] Update lifecycle evidence artifact law in `docs/ssot/runtime/09-verification-control-plane.md`
- [x] T102 [US3] Add no-new-root-command negative statement in `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- [x] T103 [US3] Update lifecycle user guide in `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md`
- [x] T104 [US3] Update lifecycle user guide in `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
- [x] T105 [US3] Update React integration guide in `apps/docs/content/docs/guide/essentials/react-integration.md`
- [x] T106 [US3] Update React integration guide in `apps/docs/content/docs/guide/essentials/react-integration.cn.md`
- [x] T107 [US3] Update React recipe guide in `apps/docs/content/docs/guide/recipes/react-integration.md`
- [x] T108 [US3] Update React recipe guide in `apps/docs/content/docs/guide/recipes/react-integration.cn.md`
- [x] T109 [US3] Update troubleshooting guide in `apps/docs/content/docs/guide/advanced/troubleshooting.md`
- [x] T110 [US3] Update troubleshooting guide in `apps/docs/content/docs/guide/advanced/troubleshooting.cn.md`
- [x] T111 [US3] Run US3 docs and dogfood tests with `pnpm -C examples/logix-react exec vitest run test/hmr-lifecycle-dogfood-sweep.contract.test.ts && pnpm -C packages/logix-core exec vitest run test/Contracts/HotLifecycleDocsWriteback.contract.test.ts test/Contracts/HotLifecycleControlPlaneNegativeWriteback.contract.test.ts && pnpm -C packages/logix-react exec vitest run test/PublicSurface/react-dev-lifecycle-entrypoint.guard.test.ts`

**Checkpoint**: Author docs, examples, and SSoT all describe host carrier activation, normal runtime authoring, reset, cleanup, and evidence model.

---

## Phase 7: Performance, Regression, and Cross-Cutting Closure

**Purpose**: Prove the implementation does not add production hot-path cost and remains diagnosable.

- [x] T112 [P] Add lifecycle bookkeeping perf test in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-bookkeeping.perf.test.ts`
- [x] T113 [P] Add browser repeated-reset contract in `examples/logix-react/test/browser/hmr-repeated-reset.contract.test.tsx`
- [x] T114 [P] Add no duplicate active resource evidence in `packages/logix-core/test/Runtime/Lifecycle/hot-lifecycle-no-duplicate-resources.guard.test.ts`
- [x] T115 Write before/after perf artifact in `specs/158-runtime-hmr-lifecycle/perf/hmr-lifecycle-baseline.md`
- [x] T116 Update repeated-reset browser contract to use the host dev lifecycle carrier in `examples/logix-react/test/browser/hmr-repeated-reset.contract.test.tsx`
- [x] T117 Run package type checks with `pnpm --filter @logixjs/core typecheck && pnpm --filter @logixjs/react typecheck && pnpm --filter @examples/logix-react typecheck`
- [x] T118 Run package tests with `pnpm --filter @logixjs/core test && pnpm --filter @logixjs/react test && pnpm --filter @examples/logix-react test`
- [x] T119 Run repo quality gates with `pnpm typecheck && pnpm lint && pnpm test:turbo`
- [x] T120 Record withheld perf conclusion in `specs/158-runtime-hmr-lifecycle/perf/hmr-lifecycle-baseline.md`
- [x] T121 Replace withheld perf conclusion with comparable carrier evidence or keep an explicit blocker note in `specs/158-runtime-hmr-lifecycle/perf/hmr-lifecycle-baseline.md`

---

## Phase 8: Result Writeback and Spec Closure

**Purpose**: Promote stable implementation outcomes back to authoritative docs and close planning artifacts.

- [x] T122 Update implementation outcome notes in `specs/158-runtime-hmr-lifecycle/quickstart.md`
- [x] T123 Trim completed working discussion residue in `specs/158-runtime-hmr-lifecycle/discussion.md`
- [x] T124 Update acceptance evidence with superseded helper route in `specs/158-runtime-hmr-lifecycle/notes/acceptance.md`
- [x] T125 Run SpecKit prerequisite check with `.codex/skills/speckit/scripts/bash/check-prerequisites.sh --feature 158 --json --require-tasks`
- [x] T126 Run SpecKit story extraction with `.codex/skills/speckit/scripts/bash/extract-user-stories.sh --feature 158 --json`
- [x] T127 Run SpecKit coded-point extraction with `.codex/skills/speckit/scripts/bash/extract-coded-points.sh --feature 158 --json`
- [x] T128 Run SpecKit task extraction with `.codex/skills/speckit/scripts/bash/extract-tasks.sh --feature 158 --json`
- [x] T129 Update feature status to Done after acceptance with `.codex/skills/speckit/scripts/bash/update-spec-status.sh --feature 158 --ensure --status Done`

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- Phase 3 depends on Phase 2 and blocks final US1 closure because it supplies the user-facing carrier point.
- Phase 4 is MVP and must land before Phase 5/6 are considered complete.
- Phase 5 depends on Phase 2 and can parallelize evidence tests with late Phase 4 implementation.
- Phase 6 depends on Phase 3 and Phase 4 because docs and examples must describe the final carrier model.
- Phase 7 depends on Phases 4 and 5.
- Phase 8 depends on all selected implementation and verification tasks.

### User Story Dependencies

- **US1**: starts after Foundational and Host Carrier Substrate. It is the MVP.
- **US2**: starts after Foundational and can parallelize evidence tests with US1 implementation.
- **US3**: starts after carrier behavior and evidence contract are stable.

### Parallel Opportunities

- T001 to T005 can run in parallel.
- T007 to T009 can run in parallel before T010 to T017.
- T019 to T021 can run in parallel before T022 to T030.
- T032 to T040 can run in parallel after T019 to T030.
- T064 to T068 can run in parallel after T014 and T017.
- T078 to T081 can run in parallel after docs targets are agreed.
- T112 to T116 can run in parallel after US1 and US2 pass.

## Parallel Example: Host Carrier Substrate

```text
Task: T019 Add core DI context contract test.
Task: T021 Add React dev lifecycle entrypoint guard.
Task: T025 Add React carrier module.
Task: T027 Add Vite integration.
```

## Implementation Strategy

### MVP First

1. Keep completed Phase 1 and Phase 2 substrate.
2. Complete Phase 3 carrier substrate.
3. Complete Phase 4 for task runner and one counter-like demo through the carrier.
4. Validate US1 independently with core, React, and example carrier tests.
5. Extend to US2 evidence and US3 docs only after carrier recovery works.

### Terminal Architecture Guard

- Keep HMR lifecycle implementation internal to runtime and dev host carriers.
- Keep `RuntimeProvider` projection-only.
- Keep examples as user-facing references with normal runtime creation code.
- Keep current wave at `reset | dispose`.
- Keep state survival behind a future spec.
- Keep all evidence artifacts inside the existing evidence envelope and feature artifact law.
- Keep production imports free of dev lifecycle carrier code through static module boundaries.
