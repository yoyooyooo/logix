# Tasks: Logix Playground

**Input**: Design documents from `/specs/164-logix-playground/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: Required. This feature adds a public package, React preview behavior, browser worker execution, runtime control-plane integration, example routes and public-surface guards.

**Organization**: Tasks are grouped by setup/foundation and user story. Acceptance authority is the AM-01 through AM-14 matrix in [plan.md](./plan.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after phase dependencies are satisfied.
- **[Story]**: User-story tasks use `[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`.
- Every task names exact file paths.

## Phase 1: Setup

**Purpose**: Create the package shell and wire workspace-level package metadata without implementing behavior.

- [x] T001 Create `packages/logix-playground/package.json` with shell-first exports for `.`, `./Playground`, `./Project`, `./package.json`, blocked `./internal/*`, and dependencies on `@logixjs/core`, `@logixjs/react`, `@logixjs/sandbox`, `effect`, `react`, `react-dom`, and `@codesandbox/sandpack-react`.
- [x] T002 Create `packages/logix-playground/tsconfig.json`, `packages/logix-playground/tsconfig.test.json`, `packages/logix-playground/tsup.config.ts`, and `packages/logix-playground/vitest.config.ts` following existing package patterns.
- [x] T003 Create initial source skeleton files `packages/logix-playground/src/index.ts`, `packages/logix-playground/src/Playground.tsx`, `packages/logix-playground/src/Project.ts`, and `packages/logix-playground/src/global.d.ts` if needed.
- [x] T004 [P] Create internal source directories `packages/logix-playground/src/internal/adapters`, `packages/logix-playground/src/internal/components`, `packages/logix-playground/src/internal/project`, `packages/logix-playground/src/internal/runner`, `packages/logix-playground/src/internal/session`, `packages/logix-playground/src/internal/snapshot`, and `packages/logix-playground/src/internal/summary`.
- [x] T005 [P] Create initial test directories and empty fixture support files under `packages/logix-playground/test` and `packages/logix-playground/test/support`.
- [x] T006 [P] Add `@logixjs/playground` Vite alias and optimizeDeps exclusion to `examples/logix-react/vite.config.ts`.
- [x] T007 [P] Add `@logixjs/playground` dependency to `examples/logix-react/package.json`.

---

## Phase 2: Foundational

**Purpose**: Implement package contracts and guards that every user story depends on.

**CRITICAL**: No user story work should begin until this phase is complete.

### Tests

- [x] T008 [P] Add public package export guard for AM-01 in `packages/logix-playground/test/public-surface.contract.test.ts`.
- [x] T009 [P] Add project declaration contract tests for AM-02 in `packages/logix-playground/test/project.contract.test.ts`.
- [x] T010 [P] Add snapshot law contract tests for AM-03 in `packages/logix-playground/test/project-snapshot.contract.test.ts`.
- [x] T011 [P] Add derived summary contract tests for AM-09 in `packages/logix-playground/test/derived-summary.contract.test.ts`.

### Implementation

- [x] T012 Implement public project declaration types and helpers in `packages/logix-playground/src/Project.ts`.
- [x] T013 Implement internal project normalization and validation in `packages/logix-playground/src/internal/project/project.ts`.
- [x] T014 Implement internal workspace state and revision handling in `packages/logix-playground/src/internal/session/workspace.ts`.
- [x] T015 Implement internal `ProjectSnapshot` builder in `packages/logix-playground/src/internal/snapshot/projectSnapshot.ts`.
- [x] T016 Implement internal snapshot hashing and deterministic env seed helpers in `packages/logix-playground/src/internal/snapshot/identity.ts`.
- [x] T017 Implement internal derived summary projection in `packages/logix-playground/src/internal/summary/derivedSummary.ts`.
- [x] T018 Wire public exports in `packages/logix-playground/src/index.ts`, `packages/logix-playground/src/Playground.tsx`, and `packages/logix-playground/src/Project.ts` so no internal runner/file/adapter/evidence API is exported.

**Checkpoint**: AM-01, AM-02, AM-03 and derived-summary foundations have failing or passing tests in place and public surface is shell-first.

---

## Phase 3: User Story 1 - Open React Example Playground (Priority: P1)

**Goal**: A reader can open a registered React example in Playground, see source, and interact with a real React preview.

**Traceability**: NS-4, NS-7, KF-9, KF-10

**Independent Test**: Browser test opens `logix-react.local-counter`, sees source and non-empty preview, clicks a counter control, and observes visible state change.

### Tests for User Story 1

- [x] T019 [P] [US1] Add package default UI hierarchy contract for AM-13 in `packages/logix-playground/test/default-ui-hierarchy.contract.test.tsx`.
- [x] T020 [P] [US1] Add example browser preview contract for AM-04 in `examples/logix-react/test/browser/playground-preview.contract.test.tsx`.
- [x] T021 [P] [US1] Add example registry contract for the first curated project in `examples/logix-react/test/playground-registry.contract.test.ts`.

### Implementation for User Story 1

- [x] T022 [US1] Implement internal shell layout components for source, preview, run panel, diagnostics panel, logs panel and controls in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`.
- [x] T023 [US1] Implement public `PlaygroundPage` shell in `packages/logix-playground/src/Playground.tsx`.
- [x] T024 [US1] Implement internal Sandpack preview adapter in `packages/logix-playground/src/internal/adapters/sandpack.tsx`.
- [x] T025 [US1] Implement preview session lifecycle state in `packages/logix-playground/src/internal/session/previewSession.ts`.
- [x] T026 [US1] Implement source tree and source tab rendering in `packages/logix-playground/src/internal/components/SourcePanel.tsx`.
- [x] T027 [US1] Implement preview controls for reset, reload, theme, viewport and strict mode in `packages/logix-playground/src/internal/components/PreviewControls.tsx`.
- [x] T028 [US1] Extract shared local counter logic for the first curated example in `examples/logix-react/src/playground/projects/local-counter.ts`.
- [x] T029 [US1] Add `examples/logix-react/src/playground/registry.ts` with `logixReactPlaygroundRegistry` using the first curated project authority.
- [x] T030 [US1] Add `examples/logix-react/src/playground/routes.tsx` with a route component that renders `PlaygroundPage`.
- [x] T031 [US1] Add `/playground/:id` route wiring and Open in Playground link from the example gallery in `examples/logix-react/src/App.tsx`.

**Checkpoint**: US1 proves a real React preview with source view and interaction while Check/Trial remain on-demand.

---

## Phase 4: User Story 2 - Run Logix Program From Same Source (Priority: P1)

**Goal**: A reader or Agent can run Program Run, Check and startup Trial from the same `ProjectSnapshot`.

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Independent Test**: The same project snapshot returns bounded Run output, core Check/startup-Trial reports, and shape separation holds.

### Tests for User Story 2

- [x] T032 [P] [US2] Add Program Run contract for AM-05 in `packages/logix-playground/test/program-runner.contract.test.ts`.
- [x] T033 [P] [US2] Add startup Trial boundary contract for AM-06 in `packages/logix-playground/test/trial-startup.boundary.test.ts`.
- [x] T034 [P] [US2] Add Run/Trial shape separation contract for AM-07 in `packages/logix-playground/test/shape-separation.contract.test.ts`.
- [x] T035 [P] [US2] Extend `examples/logix-react/test/browser/playground-preview.contract.test.tsx` for AM-08 edit propagation from shared source to preview and Run output.

### Implementation for User Story 2

- [x] T036 [US2] Implement internal sandbox-backed runner wrapper in `packages/logix-playground/src/internal/runner/sandboxRunner.ts`.
- [x] T037 [US2] Implement internal Program wrapper code generation for fixed `Program` and `main` exports in `packages/logix-playground/src/internal/runner/programWrapper.ts`.
- [x] T038 [US2] Implement bounded JSON-safe Run projection helper in `packages/logix-playground/src/internal/runner/runProjection.ts`.
- [x] T039 [US2] Implement startup Check/Trial invocation and report handling in `packages/logix-playground/src/internal/runner/controlPlaneRunner.ts`.
- [x] T040 [US2] Implement Program panel actions and state wiring in `packages/logix-playground/src/internal/components/ProgramPanel.tsx`.
- [x] T041 [US2] Implement default Source/Preview/Run primary path and on-demand Check/Trial expansion in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`.
- [x] T042 [US2] Add fixed `Program` and `main` source file to `examples/logix-react/src/playground/projects/local-counter.ts`.
- [x] T043 [US2] Ensure `ProjectSnapshot` bypass to original files is guarded in `packages/logix-playground/src/internal/runner/sandboxRunner.ts`.

**Checkpoint**: US2 proves Run/Check/startup-Trial over the same snapshot, no generic Trial surface, and no public runner contract.

---

## Phase 5: User Story 3 - Inspect Errors and Logs (Priority: P1)

**Goal**: Playground captures preview errors, console logs, compile errors, runtime errors and bounded failure states without crashing the shell.

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: A failing project shows bounded preview, compile, Run and Trial failure states separately, then reset recovers.

### Tests for User Story 3

- [x] T044 [P] [US3] Extend `packages/logix-playground/test/derived-summary.contract.test.ts` with preview crash, compile failure, Run failure and Trial failure classification for AM-09.
- [x] T045 [P] [US3] Extend `packages/logix-playground/test/default-ui-hierarchy.contract.test.tsx` to assert Check/Trial do not auto-run or auto-expand on initial render for AM-13.
- [x] T046 [P] [US3] Add browser reset recovery assertions to `examples/logix-react/test/browser/playground-preview.contract.test.tsx`.

### Implementation for User Story 3

- [x] T047 [US3] Implement bounded log capture and truncation in `packages/logix-playground/src/internal/session/logs.ts`.
- [x] T048 [US3] Implement error classification helpers in `packages/logix-playground/src/internal/session/errors.ts`.
- [x] T049 [US3] Implement shell error boundary in `packages/logix-playground/src/internal/components/PlaygroundErrorBoundary.tsx`.
- [x] T050 [US3] Wire preview and runner failures into derived summary in `packages/logix-playground/src/internal/summary/derivedSummary.ts`.
- [x] T051 [US3] Wire reset and reload cleanup through workspace, preview session and Program session state in `packages/logix-playground/src/internal/session/workspace.ts`.

**Checkpoint**: US3 gives distinct bounded states for preview, compile, Run and startup-Trial failures and reset recovery.

---

## Phase 6: User Story 4 - Reuse Playground In Docs (Priority: P2)

**Goal**: Docs-style consumers can reuse the shell through the same curated project authority or generated index without copying panels or project metadata.

**Traceability**: NS-4, KF-9

**Independent Test**: A docs-style consumer renders `PlaygroundPage` with registry/projectId and no duplicated shell or parallel project definition.

### Tests for User Story 4

- [x] T052 [P] [US4] Add docs consumer contract for AM-10 in `packages/logix-playground/test/docs-consumer.contract.test.ts`.
- [x] T053 [P] [US4] Extend `examples/logix-react/test/playground-registry.contract.test.ts` for AM-11 single project authority and generated index readiness.

### Implementation for User Story 4

- [x] T054 [US4] Implement registry lookup and not-found handling in `packages/logix-playground/src/internal/project/registry.ts`.
- [x] T055 [US4] Expose public registry helper from `packages/logix-playground/src/Project.ts` without exposing internal metadata channels.
- [x] T056 [US4] Add generated-index helper or documented export shape in `examples/logix-react/src/playground/registry.ts` for future `apps/docs` consumption.
- [x] T057 [US4] Add docs-style test fixture in `packages/logix-playground/test/support/docsConsumerFixture.tsx`.

**Checkpoint**: US4 proves docs readiness as a consumer contract, with no second registry truth.

---

## Phase 7: User Story 5 - Keep Sandbox Narrow (Priority: P2)

**Goal**: `@logixjs/sandbox` remains worker transport and exports no Playground product API.

**Traceability**: NS-7, NS-8, KF-10

**Independent Test**: Sandbox public root and package exports contain no Playground shell, project, adapter, runner or result contracts.

### Tests for User Story 5

- [x] T058 [P] [US5] Add sandbox public surface contract for AM-12 in `packages/logix-sandbox/test/SandboxPublicSurface.contract.test.ts`.
- [x] T059 [P] [US5] Add forbidden product vocabulary sweep assertions in `packages/logix-sandbox/test/SandboxPublicSurface.contract.test.ts`.

### Implementation for User Story 5

- [x] T060 [US5] Verify `packages/logix-sandbox/src/index.ts` remains limited to `SandboxClientLayer` and `SandboxClientTag` without Playground exports.
- [x] T061 [US5] Verify `packages/logix-sandbox/package.json` exports remain root, package metadata, `./vite`, and blocked internals only.
- [x] T062 [US5] Ensure any Playground runner projection types remain in `packages/logix-playground/src/internal/runner` or tests and are not added to `packages/logix-sandbox/src/Types.ts`.

**Checkpoint**: US5 proves sandbox stays transport-only.

---

## Phase 8: Polish and Cross-Cutting Verification

**Purpose**: Run AM witnesses, workspace quality gates, sweeps and docs/spec consistency checks.

- [x] T063 [P] Run package typecheck for `packages/logix-playground` and fix issues in `packages/logix-playground/src` and `packages/logix-playground/test`.
- [x] T064 [P] Run package tests for `packages/logix-playground` and ensure AM-01, AM-02, AM-03, AM-05, AM-06, AM-07, AM-09, AM-10 and AM-13 pass.
- [x] T065 [P] Run example typecheck for `examples/logix-react` and fix issues in `examples/logix-react/src/playground` and related route wiring.
- [x] T066 [P] Run browser test `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser` and ensure AM-04 and AM-08 pass.
- [x] T067 [P] Run sandbox public surface test `rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts` and ensure AM-12 passes.
- [x] T068 Run text sweep for AM-14 with `rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground` and classify remaining spec-only forbidden-shape mentions in `specs/164-logix-playground/notes/verification.md`.
- [x] T069 [P] Run `rtk pnpm typecheck` from repo root and fix failures in touched files.
- [x] T070 [P] Run `rtk pnpm lint` from repo root and fix failures in touched files.
- [x] T071 [P] Run `rtk pnpm test:turbo` from repo root and fix failures in touched files.
- [x] T072 Add verification notes for AM-01 through AM-14 in `specs/164-logix-playground/notes/verification.md`.
- [x] T073 Add performance note in `specs/164-logix-playground/notes/perf-evidence.md` stating whether runtime core, sandbox protocol or React host lifecycle changed and whether perf collection was required.

---

## Phase 9: Result Writeback

**Purpose**: Make implementation outcome authoritative after all witnesses pass.

- [x] T074 Update `specs/164-logix-playground/spec.md` if implementation discovers accepted boundary refinements.
- [x] T075 Update `specs/164-logix-playground/plan.md` if actual landing files, witness set or perf evidence differs from the plan.
- [x] T076 Update `specs/164-logix-playground/contracts/README.md` and `specs/164-logix-playground/data-model.md` if final public contract or internal snapshot semantics changed.
- [x] T077 Update runtime SSoT pages `docs/ssot/runtime/01-public-api-spine.md`, `docs/ssot/runtime/09-verification-control-plane.md`, and `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if implementation changes runtime vocabulary or control-plane semantics.
- [x] T078 Update `docs/standards/logix-api-next-guardrails.md` only if public surface guard vocabulary expands.
- [x] T079 Confirm no `specs/164-logix-playground/discussion.md` exists or trim it if created during implementation.
- [x] T080 Move `specs/164-logix-playground/spec.md` status to `Done` only after every AM witness passes and required writebacks are complete.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 Setup**: starts immediately.
- **Phase 2 Foundational**: depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: depends on Phase 2.
- **Phase 4 US2**: depends on Phase 2 and the curated project shape from US1; runner internals can start after T015/T016.
- **Phase 5 US3**: depends on Phase 2 and can run alongside US1/US2 after shell/session files exist.
- **Phase 6 US4**: depends on Phase 2 and can run after public project helper shape is stable.
- **Phase 7 US5**: depends on Phase 1 and can run alongside other stories because it mostly touches sandbox tests and guards.
- **Phase 8 Polish**: depends on implemented user stories.
- **Phase 9 Result Writeback**: depends on Phase 8 verification.

### User Story Dependencies

- **US1 Open React Example Playground**: MVP story after Foundation.
- **US2 Run Logix Program From Same Source**: depends on `ProjectSnapshot` and curated project source from US1, but internal runner tasks can be developed in parallel with preview shell.
- **US3 Inspect Errors and Logs**: depends on shell/session primitives from Foundation and US1.
- **US4 Reuse Playground In Docs**: depends on public project helper and registry shape from Foundation.
- **US5 Keep Sandbox Narrow**: independent after Setup and can run early.

### Parallel Opportunities

- T004, T005, T006 and T007 can run in parallel after T001/T002.
- T008 through T011 can be written in parallel because they target separate test files.
- T012 through T017 touch separate internal modules and can be split by module after test contracts exist.
- T019, T020 and T021 can be written in parallel.
- T032 through T035 can be written in parallel once snapshot fixtures exist.
- T044 through T046 can be written in parallel.
- T052 and T053 can be written in parallel.
- T058 and T059 can be written in parallel.
- T063 through T067 can run in parallel when implementation is complete.

## Parallel Example: Foundation Contracts

```text
Task: "T008 Add public package export guard for AM-01 in packages/logix-playground/test/public-surface.contract.test.ts"
Task: "T009 Add project declaration contract tests for AM-02 in packages/logix-playground/test/project.contract.test.ts"
Task: "T010 Add snapshot law contract tests for AM-03 in packages/logix-playground/test/project-snapshot.contract.test.ts"
Task: "T011 Add derived summary contract tests for AM-09 in packages/logix-playground/test/derived-summary.contract.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 with one curated React preview route.
3. Complete the AM-04 browser preview proof.
4. Keep Check/Trial hidden until US2 is implemented.

### Full Closure

1. Complete US2 for Run/Check/startup-Trial over `ProjectSnapshot`.
2. Complete US3 failure and reset behavior.
3. Complete US4 docs consumer proof.
4. Complete US5 sandbox guard.
5. Run Phase 8 verification and Phase 9 writeback.

### Single-Track Rule

Do not introduce public `FileModel`, public `ProgramEngine`, public `PreviewAdapter`, public `Evidence`, custom `programExport/mainExport`, generic Trial, parallel docs registry truth, public sandbox action families, compatibility layers or a second diagnostic report schema at any phase.
