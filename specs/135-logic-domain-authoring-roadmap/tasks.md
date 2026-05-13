# Tasks: Logic Domain Authoring Convergence Roadmap

**Input**: Design documents from `/specs/135-logic-domain-authoring-roadmap/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`, `spec-registry.json`, `spec-registry.md`
**Tests**: group registry audit、member scope audit、forward-only gate audit

## Phase 1: Setup

- [ ] T001 Refresh group registry facts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.json`
- [ ] T002 [P] Refresh human routing ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.md`
- [ ] T003 [P] Refresh execution checklist in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/checklists/group.registry.md`

## Phase 2: User Story 1 - owner routing clear (Priority: P1)

- [ ] T004 [US1] Verify member task entrypoints exist in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/tasks.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/tasks.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/tasks.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/tasks.md`
- [ ] T005 [US1] Add or refresh member task links and quickstart links in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/checklists/group.registry.md`
- [ ] T006 [US1] Keep member status transitions synchronized between `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.json` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.md`

## Phase 3: User Story 2 - workstream boundaries stay clean (Priority: P2)

- [ ] T007 [US2] Re-audit `136-139` primary scopes against `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec.md` before any member status moves to `active`
- [ ] T008 [US2] If `@logixjs/domain` becomes directly blocked by the same phase contract, record the split decision in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.json`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.md`

## Phase 4: User Story 3 - forward-only gate stays hard (Priority: P3)

- [ ] T009 [US3] Review `136-139` task lists and remove any task that preserves compatibility layers, deprecation periods, dual-track default authoring, or “temporary” baseline freezes
- [ ] T010 [US3] Verify every member task that changes package surfaces, diagnostics, or docs points back to the relevant SSoT files under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/`

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T011 Run a final consistency pass across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.json`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/spec-registry.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/135-logic-domain-authoring-roadmap/checklists/group.registry.md`

## Dependencies & Execution Order

- `135` 只做调度与治理，不复制成员实现任务
- `136` 必须先于 `137 / 138 / 139`
- `137` 在 `136` 后优先推进
- `138 / 139` 可在 `136` 稳定后并行推进
