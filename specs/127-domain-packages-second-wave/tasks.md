# Tasks: Domain Packages Second Wave

**Input**: Design documents from `/specs/127-domain-packages-second-wave/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: package role audit、helper boundary audit、admission rule audit

## Phase 1: Setup

- [x] T001 Create package role ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/127-domain-packages-second-wave/inventory/package-role-ledger.md`
- [x] T002 [P] Create helper boundary ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/127-domain-packages-second-wave/inventory/helper-boundary.md`
- [x] T003 [P] Create admission matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/127-domain-packages-second-wave/inventory/admission-matrix.md`
- [x] T004 [P] Create future package template in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/127-domain-packages-second-wave/inventory/future-package-template.md`

## Phase 2: User Story 1 - package admission clear (Priority: P1)

- [x] T005 [US1] Audit future package admission rules against `08`
- [x] T006 [US1] Record role classification criteria in the admission matrix

## Phase 3: User Story 2 - retained abilities clear (Priority: P2)

- [x] T007 [US2] Reconcile Query/I18n/Domain retained capabilities and output shapes
- [x] T008 [US2] Reconcile helper boundary with package role ledger

## Phase 4: User Story 3 - no second runtime semantics (Priority: P3)

- [x] T009 [US3] Record rejection rules for second runtime / DI / txn / debug truth
- [x] T010 [US3] Reconcile docs and inventories with the final domain package line
- [x] T011 [US2] Remove Query root-barrel `source` short name and keep fields helper on submodule entry only
- [x] T012 [US2][US3] Rename domain root type/message drift from `CrudModule` to `CrudProgram` and align package metadata
