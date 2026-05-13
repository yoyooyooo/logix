# Tasks: Query Logic Contract Cutover

**Input**: Design documents from `/specs/138-query-logic-contract-cutover/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: query root surface audit、integration layer audit、cache truth audit

## Phase 1: Setup

- [x] T001 Create root surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/contracts/root-surface-ledger.md`
- [x] T002 [P] Create integration layer ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/contracts/integration-layer-ledger.md`
- [x] T003 [P] Create cache truth ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/contracts/cache-truth-ledger.md`

## Phase 2: Foundational

- [x] T004 Freeze keep or move or remove decisions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/contracts/root-surface-ledger.md`
- [x] T005 [P] Extend root-surface regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts`
- [x] T006 [P] Write failing root-boundary coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`

## Phase 3: User Story 1 - one default output only (Priority: P1)

- [x] T007 [US1] Shrink package root to `Query.make / Query.Engine / Query.TanStack` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/index.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/package.json`
- [x] T008 [US1] Move surviving declaration helpers onto `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Fields.ts` and remove root `Query.fields` assumptions from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Query.ts`
- [x] T009 [US1] Lock default-output coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query.types.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Engine.combinations.test.ts`

## Phase 4: User Story 2 - internals stay on the main chain (Priority: P2)

- [x] T010 [US2] Keep query internals on the shared declaration contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Query.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/internal/logics/auto-trigger.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/internal/logics/invalidate.ts`
- [x] T011 [US2] Verify cache truth and refresh or invalidate semantics in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query.invalidate.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query.controller.refreshAll.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.CacheReuse.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.Race.test.ts`

## Phase 5: User Story 3 - no second query world (Priority: P3)

- [x] T012 [US3] Rewrite package story and examples in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/querySearchDemo.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/scenarios/middleware-resource-query.ts`
- [x] T013 [US3] Lock reviewer boundary assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 Run `pnpm -C packages/logix-query typecheck`
- [x] T015 Run `pnpm -C packages/logix-query test`
- [x] T016 Refresh `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/contracts/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/research.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/138-query-logic-contract-cutover/data-model.md` with the final root-surface ledger

## Dependencies & Execution Order

- T004-T006 block all user story work
- US1 first locks the root keep or move or remove ledger
- US2 depends on US1 so internals can align to the final public contract
- US3 depends on US1 and US2 so reviewer-facing examples and docs can delete the second query world in one pass
