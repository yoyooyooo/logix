# Tasks: I18n Logic Contract Cutover

**Input**: Design documents from `/specs/139-i18n-logic-contract-cutover/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: i18n root surface audit、driver lifecycle wiring audit、service-first boundary audit

## Phase 1: Setup

- [x] T001 Create root surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/contracts/root-surface-ledger.md`
- [x] T002 [P] Create lifecycle wiring ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/contracts/lifecycle-wiring-ledger.md`
- [x] T003 [P] Create projection demotion ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/contracts/projection-ledger.md`

## Phase 2: Foundational

- [x] T004 Freeze keep or remove or move decisions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/contracts/root-surface-ledger.md`
- [x] T005 [P] Extend service-first boundary coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
- [x] T006 [P] Write failing root-boundary coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`

## Phase 3: User Story 1 - service-first default stays clean (Priority: P1)

- [x] T007 [US1] Shrink package root to the service-first surface in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/index.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/package.json`
- [x] T008 [US1] Keep service and token contracts stable in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/I18n.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/Token.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/Token/MessageToken.test.ts`

## Phase 4: User Story 2 - driver wiring stays on the shared contract (Priority: P2)

- [x] T009 [US2] Align driver lifecycle wording and helper boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/internal/driver/i18n.ts`
- [x] T010 [US2] Update shared-lifecycle examples in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/i18n-async-ready.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/i18n-message-token.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/i18n-demo.ts`
- [x] T011 [US2] Extend ready and isolation coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/ReadySemantics.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`

## Phase 5: User Story 3 - projection and root-global stay demoted (Priority: P3)

- [x] T012 [US3] Rewrite package story in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md` and any i18n example copy touched in Phase 4 so projection and root-global are clearly demoted
- [x] T013 [US3] Lock reviewer boundary assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 Run `pnpm -C packages/i18n typecheck`
- [x] T015 Run `pnpm -C packages/i18n test`
- [x] T016 Refresh `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/contracts/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/research.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/139-i18n-logic-contract-cutover/data-model.md` with the final root-surface and lifecycle ledgers

## Dependencies & Execution Order

- T004-T006 block all user story work
- US1 first locks the service-first root contract
- US2 depends on US1 so driver wiring aligns to the final root contract
- US3 depends on US1 and US2 so projection and root-global demotion can be swept without reopening package-root questions
