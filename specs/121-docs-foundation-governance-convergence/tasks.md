# Tasks: Docs Foundation Governance Convergence

**Input**: Design documents from `/specs/121-docs-foundation-governance-convergence/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: docs root routing audit、promotion lane audit、writeback rule audit
**Organization**: 先固定 foundation inventory，再分别完成 routing、promotion lane 与 writeback 规则。

## Phase 1: Setup (Foundation Inputs)

- [x] T001 Create root routing matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/inventory/root-routing-matrix.md`
- [x] T002 [P] Create promotion lane ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/inventory/promotion-lane-ledger.md`
- [x] T003 [P] Create writeback rule ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/inventory/writeback-rules.md`

## Phase 2: User Story 1 - 写入路径可判断 (Priority: P1)

- [x] T004 [US1] Reconcile root and subtree README roles in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/README.md`
- [x] T005 [US1] Normalize governance routing rules in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/docs-governance.md`

## Phase 3: User Story 2 - promotion lane 可审计 (Priority: P2)

- [x] T006 [US2] Align `docs/next/README.md` and `docs/proposals/README.md` with the promotion lane ledger
- [x] T007 [US2] Normalize `docs/next/2026-04-05-runtime-docs-followups.md` metadata and routing notes

## Phase 4: User Story 3 - 新 cluster 可稳定回写 (Priority: P3)

- [x] T008 [US3] Record cluster writeback rules in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/inventory/writeback-rules.md`
- [x] T009 [US3] Reconcile foundation docs and inventory ledgers across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/121-docs-foundation-governance-convergence/data-model.md`
