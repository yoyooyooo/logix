# Tasks: Runtime Playground Terminal Runner

**Input**: Design documents from `/specs/163-runtime-playground-terminal-runner/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: Required. This feature changes runtime public vocabulary, browser execution behavior, docs examples and public-surface guards.

**Organization**: Tasks are grouped by implementation dependency and user story. Runtime naming cutover is scheduled first because browser/docs runner work must not build on the old `Runtime.runProgram` name.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after phase dependencies are satisfied.
- **[Story]**: User-story tasks use `[US1]`, `[US2]`, `[US3]`, `[US4]`.
- Every task names exact file paths.

## Phase 1: Setup

**Purpose**: Establish local evidence files and verify current surfaces before implementation.

- [x] T001 Inspect current `Runtime.runProgram` public and docs-facing hits in `packages/logix-core/src/Runtime.ts`, `packages/logix-core/test/Runtime`, `packages/logix-core/test/Contracts`, `docs/ssot/runtime`, `apps/docs`, and `examples`.
- [x] T002 Inspect current sandbox worker execution shape in `packages/logix-sandbox/src/Client.ts`, `packages/logix-sandbox/src/Service.ts`, `packages/logix-sandbox/src/Types.ts`, `packages/logix-sandbox/src/Protocol.ts`, and `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`.
- [x] T003 [P] Inspect current docs MDX/component extension points in `apps/docs/src/mdx-components.tsx`, `apps/docs/src/components/mdx`, `apps/docs/content/docs/api/core/runtime.md`, and `apps/docs/content/docs/api/core/runtime.cn.md`.
- [x] T004 [P] Capture a pre-change text sweep in `specs/163-runtime-playground-terminal-runner/notes/public-surface-sweep.before.md`.
- [x] T005 Move `specs/163-runtime-playground-terminal-runner/spec.md` status to `Active` with the speckit status script before changing implementation files.

---

## Phase 2: Foundational

**Purpose**: Add shared test support and guard contracts that all user stories depend on.

**CRITICAL**: Complete this phase before changing runtime or docs runner behavior.

- [x] T006 Create shared core runtime fixture helpers for `Runtime.run` tests in `packages/logix-core/test/support/runtimeRunFixtures.ts`.
- [x] T007 Create shared sandbox docs runner fixture helpers in `packages/logix-sandbox/test/browser/support/docsRunnerFixture.ts`.
- [x] T008 Create JSON projection helper tests for app-local Run output in `packages/logix-sandbox/test/browser/sandbox-run-projection.contract.test.ts`.
- [x] T009 Add or update sandbox root export guard in `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`.
- [x] T010 Add public surface grep guard for forbidden playground vocabulary in `packages/logix-core/test/Contracts/RuntimeRun.contract.test.ts`.
- [x] T011 [P] Confirm no touched source file will exceed 1000 LOC after planned helper extraction in `specs/163-runtime-playground-terminal-runner/notes/decomposition-check.md`.

**Checkpoint**: Shared fixtures and public-surface guard tests exist and can fail for the current old shape.

---

## Phase 3: User Story 3 - Runtime Result-Face Naming Cutover (Priority: P1)

**Goal**: `Runtime.run / Runtime.trial / Runtime.check` become the runtime session vocabulary, and `Runtime.runProgram` stops being the docs-facing terminal name.

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: Core public surface, docs examples and package tests use `Runtime.run`; remaining `runProgram` hits are internal-only implementation details or removed.

### Tests for User Story 3

- [x] T012 [P] [US3] Add `Runtime.run` public contract test in `packages/logix-core/test/Contracts/RuntimeRun.contract.test.ts`.
- [x] T013 [P] [US3] Rename existing runtime run behavior tests from `Runtime.runProgram.*.test.ts` to `Runtime.run.*.test.ts` in `packages/logix-core/test/Runtime`.
- [x] T014 [P] [US3] Update assertions and fixture module ids inside `packages/logix-core/test/Runtime/Runtime.run.*.test.ts` to use `Runtime.run` vocabulary.
- [x] T015 [US3] Update kernel boundary contract in `packages/logix-core/test/Contracts/KernelBoundary.test.ts` to expect `Runtime.run` as the public result face.
- [x] T016 [US3] Add text sweep expectations for `Runtime.runProgram` docs-facing removal in `packages/logix-core/test/Contracts/RuntimeRun.contract.test.ts`.

### Implementation for User Story 3

- [x] T017 [US3] Rename exported option type from `RunProgramOptions` to `RunOptions` in `packages/logix-core/src/Runtime.ts`.
- [x] T018 [US3] Expose `run` from `packages/logix-core/src/Runtime.ts` using the existing `ProgramRunner.runProgram` implementation path.
- [x] T019 [US3] Remove or internalize public `runProgram` export from `packages/logix-core/src/Runtime.ts` without adding a compatibility alias.
- [x] T020 [US3] Update comments and public barrel wording in `packages/logix-core/src/index.ts` to say `Runtime.make / Runtime.check / Runtime.trial / Runtime.run`.
- [x] T021 [US3] Update error and guard text in `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts` only if it leaks public `runProgram` vocabulary.
- [x] T022 [US3] Update performance runner script references in `packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts`.
- [x] T023 [US3] Update generated or checked JS siblings for touched TS files where this repository currently tracks them, including `packages/logix-core/src/Runtime.js`, `packages/logix-core/src/index.js`, and corresponding runtime test `.js` files.

**Checkpoint**: `Runtime.run` works independently in core tests and public docs-facing `Runtime.runProgram` usage has been cut.

---

## Phase 4: User Story 1 - Program Run Produces Docs JSON Result (Priority: P1)

**Goal**: A docs reader can run a non-UI Program source in the browser and see a stable, JSON-safe result projection.

**Traceability**: NS-3, NS-4, NS-8, KF-3, KF-4

**Independent Test**: A source exporting `Program` and `main` executes in browser worker through the docs adapter and returns JSON-safe projection with stable supplied `runId`, duration and no report fields.

### Tests for User Story 1

- [x] T024 [P] [US1] Add browser Program Run happy-path test in `packages/logix-sandbox/test/browser/sandbox-program-runner.browser.test.ts`.
- [x] T025 [P] [US1] Add stable `runId` repeatability test in `packages/logix-sandbox/test/browser/sandbox-program-runner.browser.test.ts`.
- [x] T026 [P] [US1] Add serialization failure test in `packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts`.
- [x] T027 [P] [US1] Add result budget overflow test in `packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts`.
- [x] T028 [P] [US1] Add log budget overflow test in `packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts`.

### Implementation for User Story 1

- [x] T029 [US1] Implement app-local docs Program Run wrapper builder in `packages/logix-sandbox/test/browser/support/docsRunnerFixture.ts`.
- [x] T030 [US1] Implement JSON-safe projection helper in `packages/logix-sandbox/test/browser/support/docsRunnerFixture.ts`.
- [x] T031 [US1] Add docs runner app-local source convention support under `apps/docs/src/components/mdx` or the nearest existing MDX component boundary.
- [x] T032 [US1] Add runnable Program example fixture or content entry under `apps/docs/content/docs/guide/recipes/runnable-examples.md`.
- [x] T033 [US1] Ensure current worker `stateSnapshot` remains transport-only by mapping it to app-local projection in docs runner code under `apps/docs/src`.
- [x] T034 [US1] Update generated or checked JS siblings for touched sandbox/docs TS files where this repository currently tracks them.

**Checkpoint**: Browser Run proof works without using Trial report shape.

---

## Phase 5: User Story 2 - On-Demand Check/Trial Diagnostics (Priority: P1)

**Goal**: The same Program source can produce Check/Trial diagnostics on demand, while Run output remains shape-separated.

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8

**Independent Test**: Run projection fails `ControlPlane.isVerificationControlPlaneReport`; Trial output passes it with `stage="trial"` and `mode="startup"`.

### Tests for User Story 2

- [x] T035 [P] [US2] Add same-source Run versus Trial shape separation browser test in `packages/logix-sandbox/test/browser/sandbox-run-trial-shape-separation.browser.test.ts`.
- [x] T036 [P] [US2] Add core shape separation contract test in `packages/logix-core/test/Contracts/RuntimeRun.contract.test.ts`.
- [x] T037 [P] [US2] Add raw Effect smoke cannot trigger Trial test in `packages/logix-sandbox/test/browser/sandbox-run-trial-shape-separation.browser.test.ts`.
- [x] T038 [P] [US2] Add close-timeout diagnostic distinction test in `packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts`.

### Implementation for User Story 2

- [x] T039 [US2] Add app-local Check/Trial wrapper helpers for Program sources in `packages/logix-sandbox/test/browser/support/docsRunnerFixture.ts`.
- [x] T040 [US2] Keep `Client.trial` transport result mapped to core report from `stateSnapshot` without adding sandbox-owned report type in `packages/logix-sandbox/src/Client.ts`.
- [x] T041 [US2] Update docs MDX runner controls in `apps/docs/src` so Check/Trial are on-demand and hidden for raw Effect smoke examples.
- [x] T042 [US2] Update runtime API docs in `apps/docs/content/docs/api/core/runtime.md` and `apps/docs/content/docs/api/core/runtime.cn.md` with `run / trial / check` face relationship.
- [x] T043 [US2] Update verification control-plane SSoT in `docs/ssot/runtime/09-verification-control-plane.md` to mention `Runtime.run` only as result face context, with Trial remaining diagnostic authority.

**Checkpoint**: Same source supports Run result and Trial report without shape confusion.

---

## Phase 6: User Story 4 - Sandbox Public Surface Stays Narrow (Priority: P2)

**Goal**: Browser docs runner remains app-local, and `@logixjs/sandbox` does not grow a public playground contract.

**Traceability**: NS-4, NS-8, KF-4, KF-9

**Independent Test**: Root export guard allows only `SandboxClientTag / SandboxClientLayer`; `@logixjs/sandbox/vite` remains the only public helper subpath; Run projection is not exported as a sandbox public type.

### Tests for User Story 4

- [x] T044 [P] [US4] Strengthen sandbox root export guard in `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`.
- [x] T045 [P] [US4] Add sandbox package manifest export guard in `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`.
- [x] T046 [P] [US4] Add source grep guard for public `PlaygroundRunResult` and worker action family strings in `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`.

### Implementation for User Story 4

- [x] T047 [US4] Keep `packages/logix-sandbox/src/index.ts` exporting only `SandboxClientLayer` and `SandboxClientTag`.
- [x] T048 [US4] Keep `packages/logix-sandbox/package.json` exports limited to root, package.json, `./vite`, and blocked internals.
- [x] T049 [US4] Ensure docs runner projection types live under app-local docs or test support paths and are not exported from `packages/logix-sandbox/src/Types.ts`.
- [x] T050 [US4] Update generated or checked JS siblings for touched sandbox tests where this repository currently tracks them.

**Checkpoint**: Sandbox package remains transport-only from the public consumer perspective.

---

## Phase 7: Polish and Cross-Cutting Guards

**Purpose**: Make the cutover coherent across docs, examples, SSoT and verification commands.

- [x] T051 [P] Update public API spine in `docs/ssot/runtime/01-public-api-spine.md` with `Runtime.run` as the result face and `Runtime.check/trial` as control-plane faces.
- [x] T052 [P] Update guardrails in `docs/standards/logix-api-next-guardrails.md` if text sweep shows old runtime result-face vocabulary in live guardrails.
- [x] T053 [P] Update CLI SSoT in `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if it mentions runtime result-face vocabulary.
- [x] T054 [P] Update examples under `examples/logix` that should show `Runtime.run` or runtime diagnostic vocabulary.
- [x] T055 [P] Update apps/docs generated source artifacts if the docs build emits `.js` siblings for changed `.ts` or `.tsx` files.
- [x] T056 Run forbidden vocabulary sweep and record results in `specs/163-runtime-playground-terminal-runner/notes/public-surface-sweep.after.md`.
- [x] T057 Run targeted core checks from `specs/163-runtime-playground-terminal-runner/quickstart.md` and record pass/fail in `specs/163-runtime-playground-terminal-runner/notes/verification.md`.
- [x] T058 Run targeted sandbox checks from `specs/163-runtime-playground-terminal-runner/quickstart.md` and record pass/fail in `specs/163-runtime-playground-terminal-runner/notes/verification.md`.
- [x] T059 Run docs type/build check for `apps/docs` if docs runner files changed and record pass/fail in `specs/163-runtime-playground-terminal-runner/notes/verification.md`.
- [x] T060 Add perf note in `specs/163-runtime-playground-terminal-runner/notes/perf-evidence.md`, including whether `ProgramRunner` semantics changed and whether benchmark collection was required.

---

## Phase 8: Result Writeback

**Purpose**: Make stable outcomes authoritative after implementation.

- [x] T061 Update `specs/163-runtime-playground-terminal-runner/spec.md` if implementation discovers any accepted boundary refinement.
- [x] T062 Update `specs/163-runtime-playground-terminal-runner/plan.md` if actual landing files, witness set, or perf evidence differs from plan.
- [x] T063 Confirm no `specs/163-runtime-playground-terminal-runner/discussion.md` exists or trim it if created during implementation.
- [x] T064 Run final workspace gates `pnpm typecheck`, `pnpm lint`, and `pnpm test:turbo` from `specs/163-runtime-playground-terminal-runner/quickstart.md`, then record pass/fail in `specs/163-runtime-playground-terminal-runner/notes/verification.md`.
- [x] T065 Move `specs/163-runtime-playground-terminal-runner/spec.md` status to `Done` only after all required witnesses and writebacks pass.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 Setup**: starts immediately.
- **Phase 2 Foundational**: depends on Phase 1.
- **Phase 3 Runtime naming cutover**: depends on Phase 2 and blocks docs runner implementation.
- **Phase 4 Program Run result**: depends on Phase 3.
- **Phase 5 Check/Trial diagnostics**: depends on Phase 3 and can run after Phase 4 fixtures exist.
- **Phase 6 Sandbox public surface**: depends on Phase 2 and can run alongside Phase 4/5 if it does not touch the same files.
- **Phase 7 Polish**: depends on implemented stories.
- **Phase 8 Result Writeback**: depends on Phase 7 and verification.

### User Story Dependencies

- **US3 Runtime result-face naming**: first implementation story because all docs runner code should use `Runtime.run`.
- **US1 Program Run result**: depends on US3 and shared sandbox docs runner fixtures.
- **US2 On-demand Check/Trial diagnostics**: depends on US3 and shares docs runner fixtures with US1.
- **US4 Sandbox public surface**: depends on foundational guards; independent of runtime naming except text vocabulary.

### Parallel Opportunities

- T003 and T004 can run after T001/T002 inspection starts.
- T006, T007, T008, T009, T010 and T011 touch mostly separate files and can be parallelized with coordination.
- T012, T013, T014 and T015 can be prepared in parallel before the core implementation lands.
- T024 through T028 can be prepared in parallel after sandbox fixture path is chosen.
- T035 through T038 can be prepared in parallel after same-source fixture exists.
- T044 through T046 can run independently of browser worker behavior.
- T051 through T055 can be parallelized after implementation vocabulary is final.

## Parallel Example: Browser Program Run

```text
Task: "T024 Add browser Program Run happy-path test in packages/logix-sandbox/test/browser/sandbox-program-runner.browser.test.ts"
Task: "T026 Add serialization failure test in packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts"
Task: "T027 Add result budget overflow test in packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts"
Task: "T028 Add log budget overflow test in packages/logix-sandbox/test/browser/sandbox-run-budget-guards.browser.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 so the runtime result face is `Runtime.run`.
3. Complete Phase 4 so docs can run a non-UI Program and display JSON result.
4. Validate with core `Runtime.run` tests and sandbox browser Program Run test.

### Full Closure

1. Add Phase 5 Check/Trial shape separation.
2. Add Phase 6 sandbox public surface guards.
3. Complete Phase 7 docs/SSoT writeback and sweeps.
4. Complete Phase 8 final verification and spec status update.

### Single-Track Rule

Do not introduce a compatibility alias, dual public name, public playground result type, worker action family, or second report schema at any phase.
