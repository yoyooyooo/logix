# Tasks: Runtime Timeline Continuation And Evidence Segment

**Input**: Design documents from `specs/180-runtime-timeline-continuation-and-evidence-segment/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [contracts/timeline-continuation.schema.json](./contracts/timeline-continuation.schema.json), [implementation-details/timeline-continuation-wire-contract.md](./implementation-details/timeline-continuation-wire-contract.md)

**Tests**: Required. 180 touches core live inspect contracts, daemon carrier retention and public CLI grammar, so each user story starts with focused contract or guard tests.

**Organization**: Tasks are grouped by user story. Stable owner law stays in [spec.md](./spec.md); this file defines execution order, proof obligations and writeback points.

## Phase 1: Setup And Baseline

**Purpose**: Establish executable baseline and prevent scope bleed before touching implementation.

- [x] T001 Review 180 owner/wire constraints in `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md`, `specs/180-runtime-timeline-continuation-and-evidence-segment/plan.md` and `specs/180-runtime-timeline-continuation-and-evidence-segment/implementation-details/timeline-continuation-wire-contract.md`
- [x] T002 [P] Run current focused baseline for core live bridge tests in `packages/logix-core/test/internal/LiveBridge/`
- [x] T003 [P] Run current focused baseline for CLI live tests in `packages/logix-cli/test/Integration/`
- [x] T004 [P] Run current focused baseline for React live browser adapter tests in `packages/logix-react/test/internal/dev/`
- [x] T005 [P] Classify touched-file size and decomposition risk for `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`, `packages/logix-core/src/internal/runtime/core/liveLedger.ts`, `packages/logix-cli/src/internal/liveDaemonServer.ts` and `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

## Phase 2: Foundational Wire Types And Guard Rails

**Purpose**: Add shared contracts that all user stories depend on without adding public grammar beyond `--cursor`.

- [x] T006 [P] Add cursor, fingerprint, source segment and safe resume DTO exports in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts` matching `contracts/timeline-continuation.schema.json`
- [x] T007 [P] Add evidence lease and retained owner segment DTO exports in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts` matching `data-model.md`
- [x] T008 [P] Re-export new 180 DTOs through `packages/logix-core/src/internal/live-bridge-api.ts`
- [x] T009 [P] Tighten live wire request/response payload typing for timeline cursor and retained source segment propagation in `packages/logix-core/src/internal/runtime/core/liveWireTypes.ts`
- [x] T010 Add structured gap helpers for cursor mismatch, expiry, retention gap and incomparable watermark in `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- [x] T011 Add public grammar guard coverage proving 180 adds only `--cursor` for live timeline in `packages/logix-cli/test/Integration/live-namespace.contract.test.ts`

**Checkpoint**: Shared types and guard rails exist; user story implementation can start.

## Phase 3: User Story 1 - Continue A Live Timeline (Priority: P1)

**Goal**: `logix live timeline --cursor <token>` continues the same query after Runtime-owned watermark without duplicate complete events.

**Independent Test**: Read latest timeline, keep `cursor.next`, append events, read with the same query and verify the second output starts after the cursor watermark or returns a stable owner-coded gap.

### Tests for User Story 1

- [x] T012 [P] [US1] Add cursor continuation contract tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-continuation.contract.test.ts`
- [x] T013 [P] [US1] Add CLI parser and output route tests for `--cursor <token>` in `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts`
- [x] T014 [P] [US1] Add browser adapter cursor pass-through tests in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

### Implementation for User Story 1

- [x] T015 [US1] Implement opaque cursor issue, parse and same-query fingerprint comparison in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T016 [US1] Implement cursor-aware Runtime operation window reads and owner-coded cursor gaps in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T017 [US1] Add `cursor.next`, watermark range, coverage and safe resume boundary to timeline projection output in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T018 [US1] Add `--cursor` parsing to live timeline invocation in `packages/logix-cli/src/internal/args.ts`
- [x] T019 [US1] Forward cursor payload through CLI live client in `packages/logix-cli/src/internal/liveClient.ts`
- [x] T020 [US1] Preserve cursor in live command result input coordinate without exposing raw watermark JSON in `packages/logix-cli/src/internal/commands/live.ts`
- [x] T021 [US1] Update CLI command schema for live timeline `--cursor` in `packages/logix-cli/src/schema/commands.v1.json`
- [x] T022 [US1] Forward cursor from daemon request to browser adapter operation window request in `packages/logix-cli/src/internal/liveDaemonServer.ts` and `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

**Checkpoint**: User Story 1 works independently with no duplicate complete continuation events.

## Phase 4: User Story 2 - Preserve Runtime Hot Path Isolation (Priority: P1)

**Goal**: Cursor continuation and retained-segment support do not make disabled live inspect allocate new payloads or make transaction windows wait on daemon IO.

**Independent Test**: Run cursor and no-cursor timeline reads while asserting disabled live inspect allocates no cursor, retained segment or drain payload and transaction windows contain no daemon wait.

### Tests for User Story 2

- [x] T023 [P] [US2] Add transaction-window no-daemon-wait tests in `packages/logix-core/test/internal/LiveBridge/live-operation-window.contract.test.ts`
- [x] T024 [P] [US2] Add disabled live inspect allocation guard tests in `packages/logix-core/test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts`
- [x] T025 [P] [US2] Add daemon carrier bounded failure tests in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

### Implementation for User Story 2

- [x] T026 [US2] Keep cursor and retained segment allocation behind enabled live inspect gates in `packages/logix-core/src/internal/runtime/core/liveLedger.ts`
- [x] T027 [US2] Keep cursor reads synchronous to Runtime-owned window state and free of daemon waits in `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- [x] T028 [US2] Add bounded daemon carrier queue/degrade behavior for retained segment drain in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T029 [US2] Preserve lifecycle cleanup for pending cursor and retained segment responses in `packages/logix-react/src/internal/dev/lifecycleCarrier.ts` and `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

**Checkpoint**: User Story 2 proves 180 has no always-on hot-path or transaction-window daemon dependency.

## Phase 5: User Story 3 - Retain Evidence Through Explicit Lease (Priority: P2)

**Goal**: Consumers can open explicit evidence leases that retain bounded Runtime-owned facts in daemon retained owner segments without turning ordinary reads into background retention.

**Independent Test**: Open an allowed lease, drain owner events into a retained segment and verify TTL, size cap, redaction markers, gaps and lease provenance; ordinary timeline reads create no lease.

### Tests for User Story 3

- [x] T030 [P] [US3] Add explicit evidence lease and retained segment contract tests in `packages/logix-core/test/internal/LiveBridge/live-evidence-segment.contract.test.ts`
- [x] T031 [P] [US3] Add daemon retained segment carrier tests in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T032 [P] [US3] Add canonical evidence export retained-segment-ref tests in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

### Implementation for User Story 3

- [x] T033 [US3] Implement evidence lease validation, purpose allow-list and bounded retained segment projection in `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`
- [x] T034 [US3] Add daemon retained owner segment in-memory store, TTL, size cap, workspace partition and lease provenance in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T035 [US3] Ensure ordinary timeline and cursor reads do not create leases in `packages/logix-cli/src/internal/liveClient.ts` and `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T036 [US3] Add retained segment refs to canonical evidence export without verification verdicts or synthesized Runtime facts in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T037 [US3] Preserve redaction, degraded and structured gap markers while exporting retained segment refs in `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: User Story 3 proves explicit retention works and ordinary timeline reads stay lease-free.

## Phase 6: User Story 4 - Merge Only Comparable Segments (Priority: P2)

**Goal**: Timeline output exposes source segments and projection merges only comparable, continuous chains.

**Independent Test**: A continuous `runtime-head` plus `daemon-retained-segment` chain projects; a discontinuous chain returns partial output with structured gaps and safe resume boundary.

### Tests for User Story 4

- [x] T038 [P] [US4] Add source segment chain projection tests in `packages/logix-core/test/internal/LiveBridge/live-timeline-continuation.contract.test.ts`
- [x] T039 [P] [US4] Add daemon retained segment cannot-own-completeness tests in `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T040 [P] [US4] Add browser adapter source segment preservation tests in `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

### Implementation for User Story 4

- [x] T041 [US4] Implement `runtime-head` and `daemon-retained-segment` source segment projection in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T042 [US4] Implement comparable continuous segment-chain validation and partial output gaps in `packages/logix-core/src/internal/runtime/core/liveTimeline.ts`
- [x] T043 [US4] Preserve source segments, completeness, gaps and safe resume boundary through daemon responses in `packages/logix-cli/src/internal/liveDaemonServer.ts`
- [x] T044 [US4] Preserve source segments, completeness, gaps and safe resume boundary through browser adapter responses in `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

**Checkpoint**: User Story 4 proves daemon retained segments remain retention material, not ordering or completeness truth.

## Phase 7: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T045 [P] Update SSoT 18 with evidence lease, retained owner segment, cursor and segmented source boundary in `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
- [x] T046 [P] Update SSoT 15 with `logix live timeline --cursor <token>` grammar and same-query continuation semantics in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- [x] T047 [P] Update 177 no-new-grammar supersession note in `specs/177-runtime-inspect-timeline-projection/spec.md`
- [x] T048 [P] Update 180 quickstart examples and final proof notes in `specs/180-runtime-timeline-continuation-and-evidence-segment/quickstart.md` and `specs/180-runtime-timeline-continuation-and-evidence-segment/notes/verification.md`
- [x] T049 Run focused core verification from plan.md for `packages/logix-core/test/internal/LiveBridge/`
- [x] T050 Run focused React verification from plan.md for `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- [x] T051 Run focused CLI verification from plan.md for `packages/logix-cli/test/Integration/live-inspect-routes.contract.test.ts` and `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- [x] T052 Run `pnpm typecheck` and `pnpm lint` from repository root
- [x] T053 Run 180 text sweeps from `specs/180-runtime-timeline-continuation-and-evidence-segment/plan.md`
- [x] T054 Update 180 status and routing after implementation in `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md` and `specs/README.md`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are both P1; they can proceed after Phase 2, but US2 must be re-run after US3 and US4 because it proves overhead and daemon-wait boundaries.
- US3 and US4 are P2; US4 depends on the retained segment DTO and carrier behavior from US3, but its core projection tests can start earlier after Phase 2.
- Phase 7 depends on selected user stories being implemented and all required writeback facts being known.

### User Story Dependencies

- US1: depends on Phase 2 only.
- US2: depends on Phase 2 and must be repeated after US3/US4.
- US3: depends on Phase 2, with CLI export tests depending on daemon carrier setup.
- US4: depends on Phase 2 and uses retained segment behavior from US3 for daemon-carrier proof.

## Parallel Opportunities

```text
T002, T003, T004 and T005 can run together.
T006, T007, T008, T009 and T011 can run together after T001.
T012, T013 and T014 can be written together before US1 implementation.
T023, T024 and T025 can be written together before US2 implementation.
T030, T031 and T032 can be written together before US3 implementation.
T038, T039 and T040 can be written together before US4 implementation.
T045, T046, T047 and T048 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1.
3. Run US1 focused tests and CLI route proof.
4. Complete US2 and prove disabled allocation plus no-daemon-wait.

### Full 180 Closure

1. Add explicit lease and retained owner segment through US3.
2. Add segmented source projection through US4.
3. Re-run US2 overhead proofs.
4. Complete SSoT 18, SSoT 15, 177 and 180 writebacks.
5. Run the verification matrix and text sweeps in [plan.md](./plan.md).

## Notes

- Do not add wall-clock timeline query flags.
- Do not expose raw watermark JSON as public CLI grammar.
- Do not add daemon-owned ordering, merge or completeness.
- Do not make ordinary timeline reads create retention leases.
- Do not implement QA recorder, source-chain index, local semantic memory, replay engine or final SQLite schema in 180.
