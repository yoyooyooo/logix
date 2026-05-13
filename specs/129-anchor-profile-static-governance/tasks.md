# Tasks: Anchor Profile Static Governance

**Input**: Design documents from `/specs/129-anchor-profile-static-governance/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: static role audit、instantiation boundary audit、naming bucket audit

## Phase 1: Setup

- [x] T001 Create static role ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/129-anchor-profile-static-governance/inventory/static-role-ledger.md`
- [x] T002 [P] Create instantiation boundary ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/129-anchor-profile-static-governance/inventory/instantiation-boundary.md`
- [x] T003 [P] Create naming bucket map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/129-anchor-profile-static-governance/inventory/naming-bucket-map.md`
- [x] T004 [P] Create reopen criteria ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/129-anchor-profile-static-governance/inventory/reopen-criteria.md`

## Phase 2: User Story 1 - static role keep/drop clear (Priority: P1)

- [x] T005 [US1] Audit static roles and their retained benefits
- [x] T006 [US1] Reconcile `docs/ssot/platform/02-anchor-profile-and-instantiation.md` with the static role ledger

## Phase 3: User Story 2 - structure vs naming clear (Priority: P2)

- [x] T007 [US2] Map structure owner vs naming bucket ownership
- [x] T008 [US2] Record naming reopen conditions and current narrative

## Phase 4: User Story 3 - old terms stay out of mainline (Priority: P3)

- [x] T009 [US3] Record `ModuleDef / Workflow / roots` current narrative and rejection rules
- [x] T010 [US3] Reconcile docs and ledgers with the final governance split
- [x] T011 [US1][US2] Encode static role / naming bucket / reopen rules as executable audit helper and tests
