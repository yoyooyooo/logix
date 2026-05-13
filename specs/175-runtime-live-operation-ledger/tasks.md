# Tasks: Runtime-Live Operation Ledger

**Input**:

- `specs/175-runtime-live-operation-ledger/spec.md`
- `specs/175-runtime-live-operation-ledger/plan.md`
- `specs/175-runtime-live-operation-ledger/implementation-details/ledger-kernel-contract.md`

Implementation order rule: read and follow `implementation-details/ledger-kernel-contract.md` before touching runtime code. Carrier work starts only after core DTO, retention, operation window and disabled allocation tests pass.

## Phase 0 - Contract Freeze Gate

- [x] T000 Read `specs/175-runtime-live-operation-ledger/implementation-details/ledger-kernel-contract.md` and confirm DTO, wire, lifecycle, retention, overflow, ordering, watermark, stateAfter, disabled allocation, cleanup, proof gates, default budgets and reopen rules are internally consistent with SSoT 18.
- [x] T000a If the kernel contract conflicts with `spec.md`, `plan.md` or SSoT 18, stop and update the contract or SSoT before implementation. Do not patch runtime code while the conflict is unresolved. No conflict was found during implementation closure.

## Phase 1 - Ledger Model

- [x] T001 Add exact ledger DTOs from `implementation-details/ledger-kernel-contract.md` in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T002 Export ledger DTOs through `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T003 Align ledger-related shared types in `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- [x] T004 Add `defaultLiveLedgerRetentionPolicy`, per-target retention policy and dropped/degraded marker types from the kernel contract in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T005 [P] Add basic ledger envelope tests in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`

## Phase 2 - Ordering And Watermarks

- [x] T006 Implement target-scoped ledger sequence in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T007 Implement order key derivation from `txnSeq / opSeq / linkId` in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T008 Implement start and end watermarks plus same-target-only comparison rules in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T009 [P] Add deterministic ordering and watermark tests in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`

## Phase 3 - Operation Ingestion And Windows

- [x] T010 Route `runLiveOperation` output through ledger ingestion in `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [x] T011 Route attachment registry operation requests through ledger ingestion in `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- [x] T012 Implement bounded `capture.eventWindow` window reads through runtime-live ledger windows in `packages/logix-core/src/internal/runtime/core/liveLedger.ts` and `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T013 Implement ring/window retention overflow with dropped/degraded markers from the kernel contract in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T014 Confirm operation facet projection helpers in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts` remain projection-only and verdict-free; ledger ownership stays in `liveLedger.ts`.
- [x] T015 [P] Add operation window contract tests in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- [x] T016 [P] Add retention and overflow guard tests in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-retention.guard.test.ts`
- [x] T017 [P] Update existing operation tests in `packages/logix-core/test/internal/LiveBridge/live-operations.contract.test.ts`

## Phase 4 - StateAfter Source Refs

- [x] T018 Add exact `LiveStateAfterSourceRef` handling from the kernel contract in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T019 Add stateAfter gap codes in `packages/logix-core/src/internal/runtime/core/liveLedger.ts` and package them through `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T020 Prevent latest-state historical backfill in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T021 Keep stateAfter full snapshots behind refs or bounded summaries in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T022 [P] Add historical stateAfter guard tests in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`

## Phase 5 - Diagnostics And Process Normalization

- [x] T023 Add capture-time pull diagnostics/process normalization adapter in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T024 Expose or route owner-approved debug event refs from `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` without making DebugSink push into ledger buffers
- [x] T025 Preserve degraded and redaction markers during normalization in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T026 Gate diagnostics/process normalization separately from DebugSink recording in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T027 [P] Add diagnostics/process ledger tests in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger.contract.test.ts`
- [x] T028 [P] Add diagnostics-disabled allocation guard in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts`

## Phase 6 - Cleanup And Disabled Overhead

- [x] T029 Clean ledger buffers on terminal attachment states using the kernel contract cleanup algorithm in `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- [x] T030 Add drained or dropped evidence refs to cleanup output in `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- [x] T031 Release pending window projections on cleanup in `packages/logix-core/src/internal/runtime/core/liveAttachment.ts`
- [x] T032 Prove disabled live inspect does not allocate ledger buffers in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-cleanup.guard.test.ts`
- [x] T033 [P] Update attachment lifecycle tests in `packages/logix-core/test/internal/LiveBridge/live-attachment.boundary.test.ts`

## Phase 7 - Carrier And Evidence Proof

Start this phase only after T001 through T033 pass focused core tests.

- [x] T034 Transport operation window artifacts through `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- [x] T035 Transport operation window artifacts through `packages/logix-cli/src/internal/liveDaemonServer.ts`; `liveDaemonRuntime.ts` remains the process launcher only.
- [x] T036 Ensure browser adapter and daemon do not retain unbounded windows after response delivery in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` and `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T037 [P] Update CLI carrier proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T038 [P] Add evidence packaging assertion in the live daemon canonical evidence export proof in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Phase 8 - Documentation And Status Writeback

- [x] T039 Update `specs/173-runtime-inspect-evidence-end-state/tasks.md` after 175 implementation closes
- [x] T040 Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if implementation exposes a missing owner-law proof obligation. No missing owner-law proof obligation was found, so SSoT 18 remains unchanged.
- [x] T041 Keep `specs/172-agent-first-runtime-inspect-data-plane/` as route closure only; add no new owner work there
- [x] T042 Run 175 text hygiene checks from `specs/175-runtime-live-operation-ledger/plan.md`

## Required Verification

```text
rtk rg -n "LiveOperationLedger|LiveLedgerEventEnvelope|LiveLedgerOrderKey|LiveLedgerWatermark|LiveStateAfterSourceRef|LiveOperationWindow|defaultLiveLedgerRetentionPolicy|capture-time pull" specs/175-runtime-live-operation-ledger/implementation-details/ledger-kernel-contract.md specs/175-runtime-live-operation-ledger/plan.md specs/175-runtime-live-operation-ledger/tasks.md
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-cleanup.guard.test.ts test/internal/LiveBridge/live-operations.contract.test.ts test/internal/LiveBridge/live-attachment.boundary.test.ts
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-operation-ledger-retention.guard.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm typecheck
```

## Dependency Notes

T000 through T000a block all implementation phases.

T001 through T005 block all later phases.

T006 through T009 block event window and stateAfter work.

T010 through T017 and T023 through T028 can proceed in parallel after Phase 2.

T018 through T022 requires operation windows and watermarks.

T029 through T033 requires ledger store shape to be stable.

T034 through T038 require operation window output shape and all focused core ledger tests from T001 through T033.

T039 through T042 are final writeback tasks and must not start until implementation evidence is available.
