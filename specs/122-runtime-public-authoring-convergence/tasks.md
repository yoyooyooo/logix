# Tasks: Runtime Public Authoring Convergence

**Input**: Design documents from `/specs/122-runtime-public-authoring-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: public surface audit、canonical examples/exports/generator route audit、deferred docs scope audit

## Phase 1: Setup

- [x] T001 Create public surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/122-runtime-public-authoring-convergence/inventory/public-surface-ledger.md`
- [x] T002 [P] Create expert surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/122-runtime-public-authoring-convergence/inventory/expert-surface-ledger.md`
- [x] T003 [P] Create legacy exit ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/122-runtime-public-authoring-convergence/inventory/legacy-exit-ledger.md`
- [x] T004 [P] Create docs/examples/exports matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/122-runtime-public-authoring-convergence/inventory/docs-examples-exports-matrix.md`

## Phase 2: User Story 1 - 唯一公开主链 (Priority: P1)

- [x] T005 [US1] Audit surviving public surface across runtime/docs/packages/canonical examples
- [x] T006 [US1] Reconcile `01 / 03 / 05` with the surface ledgers

## Phase 3: User Story 2 - expert 边界稳定 (Priority: P2)

- [x] T007 [US2] Record expert surface and reject new parallel phase objects
- [x] T008 [US2] Define legacy exit paths and migration note expectations

## Phase 4: User Story 3 - 对外叙事一致 (Priority: P3)

- [x] T009 [US3] Reconcile SSoT/canonical examples/exports/generators matrix
- [x] T010 [US3] Update related docs and ledgers for a single public narrative while marking `apps/docs/**` as deferred
- [x] T011 [US3] Fold workflow expert assembly back into `Program.make(..., { workflows })` and align examples/tests
- [x] T012 [US3] Remove `Module.withWorkflow(s)` from the public surface and align active docs/spec wording
