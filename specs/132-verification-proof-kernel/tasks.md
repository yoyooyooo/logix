# Tasks: Verification Proof Kernel Second Wave

**Input**: Design documents from `/specs/132-verification-proof-kernel/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: proof-kernel contract、route contract、canonical trial regression、`pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`、必要时 `pnpm typecheck`

## Phase 1: Setup

- [x] T001 Create and maintain route layer map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/route-layer-map.md`
- [x] T002 [P] Create and maintain canonical adapter split map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/canonical-adapter-split.md`
- [x] T003 [P] Create and maintain docs writeback matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/docs-writeback-matrix.md`

---

## Phase 2: Foundational

- [x] T004 Audit current `proofKernel / canonical adapter / expert adapter` boundaries across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/{verification,observability,reflection}` and write current facts into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/route-layer-map.md`
- [x] T005 [P] Audit current `trialRunModule.ts` responsibilities and pre-decide which slices may need extraction in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/canonical-adapter-split.md`
- [x] T006 [P] Audit required docs and legacy ledgers in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/*.md`, then record required sync items in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/docs-writeback-matrix.md`
- [x] T007 [P] Lock targeted verification and grep commands in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/{plan.md,quickstart.md}`

**Checkpoint**: route layers、adapter split candidates、writeback targets 和 verification commands 都已固定。

---

## Phase 3: User Story 1 - 维护者看到唯一证明内核和极薄 canonical adapter (Priority: P1) 🎯 MVP

**Goal**: 继续压薄 canonical adapter，让 `Runtime.trial` 背后只剩最小 route/report 适配。

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: reviewer 能在 5 分钟内解释 `proofKernel -> trialRunModule -> Runtime.trial` 的边界。

### Tests for User Story 1

- [x] T008 [P] [US1] Tighten route layer contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`
- [x] T009 [P] [US1] Tighten proof-kernel contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Refactor `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts` so it no longer owns shared execution wiring and only orchestrates canonical adapter responsibilities
- [x] T011 [US1] If needed, extract the first canonical adapter slice from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts` into a focused file under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/`
- [x] T012 [US1] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/{route-layer-map.md,canonical-adapter-split.md}` with the new canonical adapter boundary
- [x] T013 [US1] Run `pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts` plus `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`, then record results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/route-layer-map.md`

---

## Phase 4: User Story 2 - reviewer 能拒绝 canonical adapter 再次膨胀成第二子系统 (Priority: P2)

**Goal**: 用结构 contract 和拆分规则，封死 `trialRunModule.ts` 再次长回共享执行内核的路径。

**Traceability**: NS-10, KF-8, KF-9

**Independent Test**: route contract tests 和 grep gate 能直接指出 canonical adapter 是否重新持有 shared execution 事实。

### Tests for User Story 2

- [x] T014 [P] [US2] Tighten route-ownership assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T015 [P] [US2] Add or tighten structure grep helper expectations in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`

### Implementation for User Story 2

- [x] T016 [US2] Split any remaining oversized canonical adapter slice from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts` into a mutually exclusive file if the file still mixes multiple responsibilities
- [x] T017 [US2] Re-run and update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/canonical-adapter-split.md` with final slice ownership
- [x] T018 [US2] Run `pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`, then capture results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/route-layer-map.md`

---

## Phase 5: User Story 3 - Agent 能预测 verification 能力该落在哪一层 (Priority: P3)

**Goal**: 把 proof-kernel / canonical adapter / expert adapter 的分层解释固化到 docs 和 legacy ledger。

**Traceability**: NS-8, KF-9

**Independent Test**: Agent 只看 spec、SSoT、ledger 就能解释三层边界。

### Tests for User Story 3

- [x] T019 [P] [US3] Tighten direct-consumer and route explanation assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/{KernelReflectionExpertConsumers.test.ts,VerificationControlPlaneContract.test.ts}`

### Implementation for User Story 3

- [x] T020 [US3] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md` with proof-kernel second-wave wording
- [x] T021 [US3] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}` and any touched `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/131-expert-verification-decouple/inventory/*.md` rows to reflect the new canonical adapter boundary
- [x] T022 [US3] Run `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` and record outcomes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/docs-writeback-matrix.md`

---

## Phase 6: Polish & Final Gate

- [x] T023 Finalize `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/{research.md,data-model.md,contracts/README.md,quickstart.md,inventory/*.md}` so there are no placeholders and no `TBD`
- [x] T024 [P] Run every command in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/quickstart.md` and capture pass/fail evidence in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/docs-writeback-matrix.md`
- [x] T025 [P] If canonical behavior path changed, run `pnpm typecheck` and capture the final verdict alongside the targeted contract and runtime suites in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/132-verification-proof-kernel/inventory/route-layer-map.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup and blocks story work
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 locking the first round of canonical adapter boundaries
- **US3 (Phase 5)**: depends on US1 / US2 settling layer boundaries
- **Polish (Phase 6)**: depends on all previous phases

### Parallel Opportunities

- Phase 1 inventory files marked `[P]` can run in parallel
- Phase 2 audit items marked `[P]` can run in parallel
- Within US1, proof-kernel contract tightening and route-layer tightening can run in parallel
- Within US2, structure contract tightening and split-map maintenance can run in parallel
- Within US3, docs writeback and consumer explanation tests can run in parallel after route boundaries stabilize
