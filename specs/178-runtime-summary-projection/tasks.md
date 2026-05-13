# Tasks: Runtime Inspect Summary Projection

**Input**: `specs/178-runtime-summary-projection/spec.md` and `specs/178-runtime-summary-projection/plan.md`

## Phase 1 - Projection Model

- [x] T001 Add summary projection DTOs and helpers in `packages/logix-core/src/internal/runtime/core/liveSummary.ts`
- [x] T002 Wire `LiveInspectArtifact(section="summary")` projection helpers through `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T003 Export repo-internal summary bridge APIs in `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T004 [P] Add base summary projection tests in `packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts`

## Phase 2 - Operation And Field Composition

- [x] T005 Project 175 operation windows into bounded operation/event summary slices
- [x] T006 Join 176 field summary facts into field convergence summary slices
- [x] T007 Preserve owner gaps, redaction, dropped and degraded markers independently per slice
- [x] T008 [P] Add missing operation window and missing field summary tests
- [x] T009 [P] Add raw field/runtime leakage guards

## Phase 3 - Budget And Cleanup

- [x] T010 Bound summary output by request and owner budgets
- [x] T011 Prove disabled summary projection allocates no payloads or caches
- [x] T012 Add lifecycle cleanup proof for any derived summary cache

## Phase 4 - Carrier And Evidence Proof

- [x] T013 Add summary projection source to `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T014 Route `inspect.summary` through owner projection in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T015 Transport summary artifacts through `packages/logix-cli/src/internal/liveDaemonServer.ts` without changing CLI grammar
- [x] T016 [P] Add browser adapter summary proof in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T017 [P] Add daemon carrier summary proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T018 [P] Add canonical evidence export preservation proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 5 - Coverage And Writeback

- [x] T019 Move `operation-summary` and `field-converge` coverage from structured gap to owner-backed in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- [x] T020 Update `specs/178-runtime-summary-projection/spec.md` status after implementation closes
- [x] T021 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation
- [x] T022 Keep `docs/ssot/runtime/15-cli-agent-first-control-plane.md` grammar unchanged unless implementation proves the existing command cannot express the owner-backed summary query
- [x] T023 Run 178 verification and text hygiene checks from `specs/178-runtime-summary-projection/plan.md`

## Required Verification

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-summary-projection.contract.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```
