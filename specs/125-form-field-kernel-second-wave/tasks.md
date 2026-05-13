# Tasks: Form Field-Kernel Second Wave

**Input**: Design documents from `/specs/125-form-field-kernel-second-wave/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: form boundary audit、authoring surface audit、naming fallout audit

## Phase 1: Setup

- [x] T001 Create boundary map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/125-form-field-kernel-second-wave/inventory/boundary-map.md`
- [x] T002 [P] Create authoring surface matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/125-form-field-kernel-second-wave/inventory/authoring-surface-matrix.md`
- [x] T003 [P] Create package entry ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/125-form-field-kernel-second-wave/inventory/package-entry-ledger.md`
- [x] T004 [P] Create naming fallout ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/125-form-field-kernel-second-wave/inventory/naming-fallout.md`

## Phase 2: User Story 1 - DSL / kernel clear (Priority: P1)

- [x] T005 [US1] Audit Form capabilities into DSL vs field-kernel
- [x] T006 [US1] Reconcile `docs/ssot/runtime/06-form-field-kernel-boundary.md` with the boundary map

## Phase 3: User Story 2 - authoring tiers clear (Priority: P2)

- [x] T007 [US2] Record top-level entries, commands and direct APIs
- [x] T008 [US2] Reconcile package entries, hooks and examples with the authoring surface matrix

## Phase 4: User Story 3 - old top-level minds stay out (Priority: P3)

- [x] T009 [US3] Record `derived / rules / fields` fallout and rejection criteria
- [x] T010 [US3] Reconcile docs, tests and ledgers with the final boundary
- [x] T011 [US3] Remove root-barrel `Form.computed / link / source` and align examples/tests to `Form.Field.*`
