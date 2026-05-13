# Tasks: Expert Verification Decouple

**Input**: Design documents from `/specs/131-expert-verification-decouple/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: contract edge audit、route ownership audit、targeted vitest、strict rg gate、`pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`、必要时 `pnpm typecheck`

## Phase 1: Setup

- [x] T001 Create and maintain owner route map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/owner-route-map.md`
- [x] T002 [P] Create and maintain shared primitive ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/shared-primitive-ledger.md`
- [x] T003 [P] Create and maintain dependency edge matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/dependency-edge-matrix.md`
- [x] T004 [P] Create and maintain consumer route ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/consumer-route-ledger.md`
- [x] T005 [P] Create and maintain docs writeback matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/docs-writeback-matrix.md`

---

## Phase 2: Foundational

- [x] T006 Audit current `internal/reflection/** -> internal/observability/**` edges across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection` and write current-state rows into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/dependency-edge-matrix.md`
- [x] T007 [P] Audit current shared primitives such as `trialRun`, `EvidencePackage`, `RunSession`, `JsonValue`, and artifact exporter types across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test`, then record direct consumers and target owners in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/shared-primitive-ledger.md`
- [x] T008 [P] Audit current canonical vs expert route consumers across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix`, then record final route intent in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/consumer-route-ledger.md`
- [x] T009 [P] Audit required SSoT and legacy-cutover docs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}`, then record required sync items in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/docs-writeback-matrix.md`
- [x] T010 [P] Lock the neutral owner structure decision for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/{verification,protocol}` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/{plan.md,contracts/README.md,inventory/owner-route-map.md}`
- [x] T011 [P] Confirm whether any ≥1000 LOC file will be touched for this decouple and record explicit N/A or decomposition follow-up in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/plan.md`
- [x] T012 [P] Lock targeted verification commands and perf-escalation rules in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/{plan.md,quickstart.md}`

**Checkpoint**: current dependency graph, owner census, consumer routes, docs writeback targets, and verification commands are explicit before code changes begin.

---

## Phase 3: User Story 1 - 维护者能看到 expert verification 的唯一 owner (Priority: P1) 🎯 MVP

**Goal**: 为 expert verification 与 shared primitive 建立唯一 owner，清除 `Reflection.verify*` 对 observability 命名层的借用。

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: reviewer 从 `CoreReflection.verifyKernelContract` 或 `CoreReflection.verifyFullCutoverGate` 出发，能在 5 分钟内找到唯一 backing owner，且不会再落入 `internal/observability/**`。

### Tests for User Story 1

- [x] T013 [P] [US1] Tighten public reflection surface contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts`
- [x] T014 [P] [US1] Add internal edge and owner contract coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts`

### Implementation for User Story 1

- [x] T015 [US1] Introduce neutral shared verification owner under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/**` for shared execution, evidence, and session primitives currently borrowed by expert verification
- [x] T016 [US1] Introduce neutral protocol owner under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/protocol/**` for `JsonValue` and any generic serializable protocol contracts currently imported from observability by reflection code
- [x] T017 [US1] Repoint `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/kernelContract.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/fullCutoverGate.ts` to the new neutral owners without changing expert route semantics
- [x] T018 [US1] Repoint remaining reflection imports in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/{diff.ts,manifest.ts,ports/typeIrProjector.ts,ports/exportPortSpec.ts}` and any directly affected importers to the new neutral owners
- [x] T019 [US1] Record final owner verdicts and moved primitive locations in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/{owner-route-map.md,shared-primitive-ledger.md}`
- [x] T020 [US1] Run `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts` and `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`, then capture results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/owner-route-map.md`

**Checkpoint**: expert verification backing and shared primitives have explicit owners, and the public route still points to the same expert facade.

---

## Phase 4: User Story 2 - reviewer 能阻止 observability 依赖回流 (Priority: P2)

**Goal**: 删除 `internal/reflection/**` 到 `internal/observability/**` 的直接 import 边，并建立可重复执行的 forbidden-edge gate。

**Traceability**: NS-10, KF-8, KF-9

**Independent Test**: 任何新增的 reflection-to-observability direct import 都会被 contract tests 或 strict grep gate 拦下。

### Tests for User Story 2

- [x] T021 [P] [US2] Tighten expert route regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/{Contracts.045.KernelContractVerification.test.ts,Contracts.047.FullCutoverGate.serializable.test.ts,Contracts.047.FullCutoverGate.trial.test.ts}`
- [x] T022 [P] [US2] Add forbidden-edge audit commands and expected zero-hit rules to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/quickstart.md` and any required contract helper under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/**`

### Implementation for User Story 2

- [x] T023 [US2] Remove all remaining direct `../observability/*` and `../../observability/*` imports from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/**` and write the final status into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/dependency-edge-matrix.md`
- [x] T024 [US2] Narrow `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/**` to observability-owned concerns only, deleting or relocating any duplicate helper names that became shared verification primitives
- [x] T025 [US2] Update moved-internal import sites in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/{Contracts,observability,internal}/**` and any directly affected `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/**` files so they point at the new neutral owners or explicit observability-only owners
- [x] T026 [US2] Run `pnpm vitest run packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`, execute the forbidden-edge grep audit, and capture outcomes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/{dependency-edge-matrix.md,shared-primitive-ledger.md}`

**Checkpoint**: `internal/reflection/**` no longer directly imports observability, and the anti-regression gate is executable without manual interpretation.

---

## Phase 5: User Story 3 - Agent 能稳定区分 canonical route 与 expert route (Priority: P3)

**Goal**: 让 docs、legacy cutover ledger、consumer route 和 contract tests 继续对同一条 canonical vs expert 边界说话。

**Traceability**: NS-8, KF-9

**Independent Test**: Agent 查阅 `09`、`130` ledger 与 `131` inventory 后，能明确知道默认入口还是 `runtime.*`，expert route 只是升级层。

### Tests for User Story 3

- [x] T027 [P] [US3] Add or tighten route-ownership assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T028 [P] [US3] Add or tighten direct-consumer audits for intentional expert-only hits in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Reflection*.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/**`

### Implementation for User Story 3

- [x] T029 [US3] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection-api.ts` comments so canonical route, expert route, and shared owner wording stays aligned
- [x] T030 [US3] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}` with the new backing path and final expert-only classification
- [x] T031 [US3] Audit `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Runtime/**` to confirm no default consumer regresses to `Reflection.verify*`, then record proof in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/consumer-route-ledger.md`
- [x] T032 [US3] Run `pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts` and, if canonical backing changed, `pnpm typecheck`, then record results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/docs-writeback-matrix.md`

**Checkpoint**: canonical route、expert route、legacy cutover ledger、direct consumer route 全部对齐到同一条边界。

---

## Phase 6: Polish & Final Gate

- [x] T033 Finalize `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/{contracts/README.md,data-model.md,research.md,inventory/*.md}` so there are no placeholders, no `TBD`, and no unresolved owner rows
- [x] T034 [P] Run every command in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/quickstart.md` and capture pass/fail evidence in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/docs-writeback-matrix.md`
- [x] T035 [P] Run strict final grep `rg -n '../observability/|../../observability/|internal/observability/' /Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection-api.ts /Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection -g '*.ts'` and capture the final zero-hit verdict in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/{dependency-edge-matrix.md,consumer-route-ledger.md}`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup and blocks all story work
- **User Story 1 (Phase 3)**: depends on Foundational
- **User Story 2 (Phase 4)**: depends on User Story 1 defining the neutral owners
- **User Story 3 (Phase 5)**: depends on User Story 1 and User Story 2 settling owner and forbidden-edge facts
- **Polish & Final Gate (Phase 6)**: depends on all previous phases

### User Story Dependencies

- **US1** defines the only valid owner topology
- **US2** depends on US1 to know which imports are genuinely forbidden and where they should move
- **US3** depends on US1/US2 to write final docs and consumer-route facts without drift

### Parallel Opportunities

- Phase 1 inventory files marked `[P]` can run in parallel
- Phase 2 audits marked `[P]` can run in parallel
- Within US1, tests and neutral-owner scaffolding can start in parallel after the owner structure is fixed
- Within US2, regression tests and grep gate setup can run in parallel before import migration closes
- Within US3, docs writeback and consumer route audit can run in parallel after route classification is stable

## Implementation Strategy

### MVP First

1. Finish Setup + Foundational
2. Complete US1 and prove unique owner exists
3. Stop and verify whether `internal/reflection/**` still has any direct observability edge

### Incremental Delivery

1. US1 settles owner topology
2. US2 settles forbidden edges
3. US3 settles route wording, docs, and consumer defaults
4. Phase 6 writes the final gate verdict

### Parallel Team Strategy

With multiple developers:

1. One thread maintains inventory ledgers
2. One thread extracts neutral shared primitives
3. One thread tightens contract tests and grep gates
4. One thread updates docs and legacy cutover ledgers after owner decisions are stable
