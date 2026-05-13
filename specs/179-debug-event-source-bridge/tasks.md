# Tasks: Runtime-Live Debug Event Source Bridge

**Input**: `specs/179-debug-event-source-bridge/spec.md` and `specs/179-debug-event-source-bridge/plan.md`

## Phase 1 - Source Bridge Contract

- [x] T001 Confirm existing `LiveDebugSourceRecord` and `RuntimeDebugEventRef` shape can represent diagnostic/process source bridge inputs
- [x] T002 Add focused source bridge contract tests in `packages/logix-core/test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts`
- [x] T003 Export any missing repo-internal bridge APIs through `packages/logix-core/src/internal/live-bridge-api.ts`

## Phase 2 - Runtime And React Lifecycle Plumbing

- [x] T004 Connect owner-approved debug source records to the target-scoped live ledger store in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- [x] T005 Ensure target lifecycle cleanup clears source bridge state
- [x] T006 Prove disabled diagnostics and disabled live inspect allocate no diagnostic/process projection payloads

## Phase 3 - Event Window Projection

- [x] T007 Return diagnostic events as 175 `LiveOperationWindow` events when source records exist
- [x] T008 Return process events as 175 `LiveOperationWindow` events when source records exist
- [x] T009 Preserve `txnSeq / opSeq / linkId`, redaction, degraded and owner gaps
- [x] T010 Preserve missing, disabled and unsupported source gaps

## Phase 4 - Carrier And Evidence Proof

- [x] T011 Route `inspect.events(kind="diagnostic")` and `inspect.events(kind="process")` through owner windows in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T012 Transport diagnostic/process event artifacts through `packages/logix-cli/src/internal/liveDaemonServer.ts` without changing CLI grammar
- [x] T013 [P] Add browser adapter diagnostic/process proof in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T014 [P] Add daemon carrier diagnostic/process proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T015 [P] Add canonical evidence export preservation proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 5 - Coverage And Writeback

- [x] T016 Move `diagnostics` and `process-events` coverage from structured gap to owner-backed in `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- [x] T017 Update `specs/179-debug-event-source-bridge/spec.md` status after implementation closes
- [x] T018 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation
- [x] T019 Keep `docs/ssot/runtime/15-cli-agent-first-control-plane.md` grammar unchanged unless implementation proves the existing command cannot express diagnostic/process event reads
- [x] T020 Run 179 verification and text hygiene checks from `specs/179-debug-event-source-bridge/plan.md`

## Required Verification

```text
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
rtk pnpm lint
```
