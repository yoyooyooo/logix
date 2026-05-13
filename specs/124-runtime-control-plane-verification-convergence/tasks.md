# Tasks: Runtime Control Plane Verification Convergence

**Input**: Design documents from `/specs/124-runtime-control-plane-verification-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: stage matrix audit、input contract audit、machine report audit、package ownership audit

## Phase 1: Setup

- [x] T001 Create stage matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/124-runtime-control-plane-verification-convergence/inventory/stage-matrix.md`
- [x] T002 [P] Create input contract ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/124-runtime-control-plane-verification-convergence/inventory/input-contract.md`
- [x] T003 [P] Create machine report ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/124-runtime-control-plane-verification-convergence/inventory/machine-report.md`
- [x] T004 [P] Create package ownership ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/124-runtime-control-plane-verification-convergence/inventory/package-ownership.md`

## Phase 2: User Story 1 - stage routing clear (Priority: P1)

- [x] T005 [US1] Reconcile stage/mode matrix and upgrade rules
- [x] T006 [US1] Reconcile `04` and `09` docs pages with the stage matrix

## Phase 3: User Story 2 - one protocol across packages (Priority: P2)

- [x] T007 [US2] Align input contract and machine report ledgers
- [x] T008 [US2] Map CLI/test/sandbox/core ownership and route boundaries

## Phase 4: User Story 3 - no second verification plane (Priority: P3)

- [x] T009 [US3] Record deep verification and raw evidence as upgrade-only surfaces
- [x] T010 [US3] Reconcile docs and ownership ledgers with related specs
- [x] T011 [US2] Move shared verification report contract to `@logixjs/core/ControlPlane` and align CLI output
