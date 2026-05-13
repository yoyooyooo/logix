# Tasks: Runtime Reflection Manifest vNext

**Input**: Design documents from `/specs/167-runtime-reflection-manifest/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

## Phase 1: Setup

- [x] T001 Create `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T002 Create `packages/logix-core/src/internal/reflection/payloadSummary.ts`
- [x] T003 Create `packages/logix-core/src/internal/reflection/payloadValidation.ts`
- [x] T004 Create `packages/logix-core/src/internal/reflection/runtimeOperationEvents.ts`
- [x] T005 Create `packages/logix-core/src/internal/reflection/workbenchBridge.ts`
- [x] T006 Create `specs/167-runtime-reflection-manifest/notes/verification.md`
- [x] T007 Create `specs/167-runtime-reflection-manifest/notes/perf-evidence.md`
- [x] T045 Create `packages/logix-core/src/internal/reflection/consumptionContract.ts`

## Phase 2: 167A Minimum Manifest For 166 (P1)

- [x] T008 Add `MinimumProgramActionManifest` types to `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T009 Implement `extractMinimumProgramActionManifest` in `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T010 Export minimum manifest helper from `packages/logix-core/src/internal/reflection-api.ts`
- [x] T011 Add digest tests for minimum manifest in `packages/logix-core/test/internal/Reflection/ProgramManifest.Minimum.test.ts`
- [x] T012 Define 166-facing action manifest consumption adapter types in `packages/logix-core/src/internal/reflection/consumptionContract.ts`
- [x] T013 Add contract tests proving `fallback-source-regex` is outside manifest authority in `packages/logix-core/test/internal/Reflection/ProgramManifest.Minimum.test.ts`
- [x] T014 Update `specs/166-playground-driver-scenario-surface/tasks.md` only if the 166 consumption contract path changes
- [x] T048 Define Cross-tool Consumption Law classes `authority`, `contextRef`, `debugEvidence`, `hostViewState` and `evidenceGap` in `packages/logix-core/src/internal/reflection/consumptionContract.ts`
- [x] T049 Add tests proving Driver/Scenario declarations, Scenario `expect` and UI layout state cannot be classified as `authority`
- [x] T050 Add public negative sweep for no `Logix.Reflection`, `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Program.capabilities.mocks`
- [x] T051 Record 167A closure proof in `specs/167-runtime-reflection-manifest/notes/verification.md`
- [x] T052 Update 166 discussion/plan dependency wording if the 167A consumer path changes. No dependency wording change required because the consumer path remains `@logixjs/core/repo-internal/reflection-api`.

## Phase 3: 167B Payload Summary And Validation (P2)

- [x] T015 Implement bounded schema summary in `packages/logix-core/src/internal/reflection/payloadSummary.ts`
- [x] T016 Implement JSON-decoded unknown payload validation in `packages/logix-core/src/internal/reflection/payloadValidation.ts`
- [x] T017 Add stable issue projection tests in `packages/logix-core/src/internal/reflection/payloadValidation.test.ts`
- [x] T018 Integrate payload summary into minimum manifest and full manifest
- [x] T019 Update Playground payload UI to consume summary when available in `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- [x] T019a Add tests proving JSON text parse errors stay consumer-local and stable `PayloadValidationIssue` codes come only from 167

## Phase 4: 167B Full Program Manifest (P2)

- [x] T020 Define `RuntimeReflectionManifest` in `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T021 Implement Program-level manifest extraction in `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T022 Include root module, module manifest, initial state summary and capability availability
- [x] T023 Include imports/services/logics/effects/process summaries where available
- [x] T024 Add budget/truncation markers and digest tests

## Phase 5: 167B Runtime Event Collection (P2)

- [x] T025 Define event law DTOs in `packages/logix-core/src/internal/reflection/runtimeOperationEvents.ts` with only `operation.accepted`, `operation.completed`, `operation.failed` and `evidence.gap`
- [x] T026 Add dispatch accepted/completed/failed projection from existing runtime debug/dispatch facts
- [x] T027 Add `operationKind` support for dispatch/run/check/trial where existing hooks are available
- [x] T028 Add bounded state/log/trace attachment ref helpers without new event families
- [x] T029 Add disabled-diagnostics overhead note in `specs/167-runtime-reflection-manifest/notes/perf-evidence.md`
- [x] T046 Add tests proving event DTOs do not depend on Playground `ProgramSessionState` or `ProjectSnapshot` types in `packages/logix-core/src/internal/reflection/runtimeOperationEvents.test.ts`

## Phase 6: CLI And 165 Bridge (P2)

- [x] T030 Implement manifest diff reuse or adapter in `packages/logix-core/src/internal/reflection/programManifest.ts`
- [x] T031 Implement `workbenchBridge` classification matrix for authority/contextRef/debugEvidence/hostViewState/evidenceGap
- [x] T032 Wire CLI/trial export path to include manifest digest where appropriate
- [x] T033 Add tests for evidence gaps: missing manifest, missing source coordinate, unknown schema
- [x] T047 Add shared-consumption tests for Playground/Devtools-compatible action and operation DTOs in `packages/logix-core/src/internal/reflection/consumptionContract.test.ts`

## Phase 7: Writeback And Verification

- [x] T034 Update `docs/ssot/runtime/17-playground-product-workbench.md` if reflection contract wording changes
- [x] T035 Update `specs/166-playground-driver-scenario-surface/spec.md`, `plan.md` and `tasks.md` if 166 dependency changes. No 166 file change required because the 166 dependency path and minimum slice contract remain stable; 167B only adds optional shared reflection artifacts.
- [x] T036 Run `rtk pnpm -C packages/logix-core typecheck`
- [x] T037 Run `rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot`
- [x] T038 Run `rtk pnpm -C packages/logix-playground typecheck`
- [x] T039 Run `rtk pnpm typecheck`
- [x] T040 Run `rtk pnpm lint`
- [x] T041 Run `rtk pnpm test:turbo`
- [x] T042 Run negative sweep from `quickstart.md`
- [x] T043 Record outcomes in `specs/167-runtime-reflection-manifest/notes/verification.md`
- [x] T044 Move `specs/167-runtime-reflection-manifest/spec.md` status to `Done` only after success criteria pass

## Dependencies

- Phase 2 is 167A and is required by 166 Action Workbench MVP.
- T045 is required before T012 and T047.
- T048 through T052 are required for 167A closure.
- Phase 3 improves 166 non-void action UX and CLI dispatch validation, but is 167B unless needed by a specific 166 payload demo.
- Phase 4 and Phase 5 can proceed in parallel after Phase 2 as 167B work.
- Phase 6 depends on Phase 4 and Phase 5.

## MVP Scope

167A MVP for unblocking 166:

- T008 through T014 and T045 and T048 through T052.

167B terminal closure:

- Phase 3 through Phase 7 after 167A.
