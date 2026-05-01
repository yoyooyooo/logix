# Tasks: Runtime Kernel Hotpath Convergence

**Input**: Design documents from `/specs/123-runtime-kernel-hotpath-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: kernel boundary audit、steady-state exclusion audit、evidence routing audit

## Phase 1: Setup

- [x] T001 Create kernel zone map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/123-runtime-kernel-hotpath-convergence/inventory/kernel-zone-map.md`
- [x] T002 [P] Create steady-state exclusions ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/123-runtime-kernel-hotpath-convergence/inventory/steady-state-exclusions.md`
- [x] T003 [P] Create evidence routing ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/123-runtime-kernel-hotpath-convergence/inventory/evidence-routing.md`
- [x] T004 [P] Create reopen trigger ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/123-runtime-kernel-hotpath-convergence/inventory/reopen-triggers.md`

## Phase 2: User Story 1 - kernel backlog clear (Priority: P1)

- [x] T005 [US1] Reconcile kernel/shell/control-plane code roots
- [x] T006 [US1] Reconcile `docs/ssot/runtime/02-hot-path-direction.md` with the zone map

## Phase 3: User Story 2 - evidence first (Priority: P2)

- [x] T007 [US2] Define baseline/diff/reopen requirements in the evidence routing ledger
- [x] T008 [US2] Link archive perf evidence entry points and no-go conditions

## Phase 4: User Story 3 - old branches stay out (Priority: P3)

- [x] T009 [US3] Record disallowed old surfaces and second-kernel fallout
- [x] T010 [US3] Reconcile docs, ledgers and related spec references
- [x] T011 [US1][US2] Encode zone/evidence/reopen policy as executable audit helper and tests
