# Tasks: Form Logic Authoring Cutover

**Input**: Design documents from `/specs/137-form-logic-authoring-cutover/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: canonical authoring audit、root export audit、form domain boundary audit

## Phase 1: Setup

- [x] T001 Create canonical surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/contracts/form-surface-ledger.md`
- [x] T002 [P] Create root export ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/contracts/root-export-ledger.md`
- [x] T003 [P] Create expert route ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/contracts/expert-route-ledger.md`

## Phase 2: Foundational

- [x] T004 Freeze the canonical path decision in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/contracts/form-surface-ledger.md` from the final `136` outcome
- [x] T005 [P] Write failing canonical authoring coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
- [x] T006 [P] Write failing package-root boundary coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`

## Phase 3: User Story 1 - one canonical path only (Priority: P1)

- [x] T007 [US1] Create schema-scoped canonical DSL in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/dsl/logic.ts`
- [x] T008 [US1] Wire the canonical path through `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/dsl/from.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Form.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/index.ts`
- [x] T009 [US1] Remove root small-path exports from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/index.ts` and adjust `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/package.json` only if export-map changes are required
- [x] T010 [US1] Lock canonical-path regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.DomainBoundary.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`

## Phase 4: User Story 2 - domain and expert boundaries stay clean (Priority: P2)

- [x] T011 [US2] Demote `$.rules / $.derived / $.fields` out of parallel canonical status in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/dsl/rules.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/dsl/derived.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/dsl/fields.ts`
- [x] T012 [US2] Keep `Form.Rule` as leaf fragment library and `Form.commands.make(...)` as post-construction helper in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Rule.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/commands.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- [x] T013 [US2] Verify domain-state boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`

## Phase 5: User Story 3 - old top-level minds stay out (Priority: P3)

- [x] T014 [US3] Sweep canonical demos in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case02-line-items.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case05-unique-code.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- [x] T015 [US3] Rewrite SSoT wording in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/03-canonical-authoring.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/05-logic-composition-and-override.md`
- [x] T016 [US3] Remove root-barrel assumptions from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form.RulesFirst.d.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RulesFirst.ComplexForm.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Derived.Guardrails.test.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 Run `pnpm -C packages/logix-form typecheck`
- [x] T018 Run `pnpm -C packages/logix-form test`
- [x] T019 Refresh `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/contracts/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/research.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/137-form-logic-authoring-cutover/data-model.md` with the final surface ledger

## Dependencies & Execution Order

- T004-T006 block all user story work
- US1 first writes and lands the canonical path
- US2 depends on US1 so helper and expert layers have a stable default path to compare against
- US3 depends on US1 and US2 so example and docs sweeps can delete old minds in one pass
