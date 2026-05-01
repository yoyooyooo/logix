# Tasks: Platform Layered Map Convergence

**Input**: Design documents from `/specs/128-platform-layered-map-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: layer-code-map audit、chain boundary audit、uplift gate audit

## Phase 1: Setup

- [x] T001 Create layer-code map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/128-platform-layered-map-convergence/inventory/layer-code-map.md`
- [x] T002 [P] Create chain boundary ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/128-platform-layered-map-convergence/inventory/chain-boundaries.md`
- [x] T003 [P] Create uplift gate ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/128-platform-layered-map-convergence/inventory/uplift-gate.md`
- [x] T004 [P] Create code roots ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/128-platform-layered-map-convergence/inventory/code-roots.md`

## Phase 2: User Story 1 - layer to code clear (Priority: P1)

- [x] T005 [US1] Map each layer to code roots and owner specs
- [x] T006 [US1] Reconcile `docs/ssot/platform/01-layered-map.md` with the layer-code map

## Phase 3: User Story 2 - no narrative-only uplift (Priority: P2)

- [x] T007 [US2] Record uplift gate criteria and rejection examples
- [x] T008 [US2] Audit existing layers against the uplift gate

## Phase 4: User Story 3 - chain boundaries stable (Priority: P3)

- [x] T009 [US3] Reconcile implementation/governance/host projection boundaries
- [x] T010 [US3] Reconcile docs and inventories with the final chain split
- [x] T011 [US1][US2] Encode layered-map layer/chain/owner/uplift rules as executable audit helper and tests
