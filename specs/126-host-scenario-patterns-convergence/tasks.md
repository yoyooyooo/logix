# Tasks: Host Scenario Patterns Convergence

**Input**: Design documents from `/specs/126-host-scenario-patterns-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: scenario anchor audit、projection boundary audit、example-verification route audit

## Phase 1: Setup

- [x] T001 Create scenario anchor map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/126-host-scenario-patterns-convergence/inventory/scenario-anchor-map.md`
- [x] T002 [P] Create projection boundary ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/126-host-scenario-patterns-convergence/inventory/projection-boundary.md`
- [x] T003 [P] Create example-verification routing ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/126-host-scenario-patterns-convergence/inventory/example-verification-routing.md`
- [x] T004 [P] Create host variant ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/126-host-scenario-patterns-convergence/inventory/variant-ledger.md`

## Phase 2: User Story 1 - scenario to example clear (Priority: P1)

- [x] T005 [US1] Map standard scenarios to primary examples
- [x] T006 [US1] Link scenarios to verification entry subtree where needed

## Phase 3: User Story 2 - host boundaries clear (Priority: P2)

- [x] T007 [US2] Reconcile projection APIs and verification entry boundaries
- [x] T008 [US2] Audit local/session/suspend/process variants in the host variant ledger

## Phase 4: User Story 3 - no second truth source (Priority: P3)

- [x] T009 [US3] Record rejection rules for host-side parallel control planes
- [x] T010 [US3] Reconcile docs, examples and inventories for a single host narrative
- [x] T011 [US1][US2] Encode standardized scenario anchors as executable registry and contract test
