# Tasks: Declare Run Phase Contract

**Input**: Design documents from `/specs/136-declare-run-phase-contract/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: phase contract audit、logic diagnostics audit、canonical authoring audit

## Phase 1: Setup

- [x] T001 Create phase surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/contracts/phase-surface-ledger.md`
- [x] T002 [P] Create public shape candidates note in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/contracts/public-shape-candidates.md`
- [x] T003 [P] Create runtime descriptor ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/contracts/runtime-descriptor-ledger.md`

## Phase 2: Foundational

- [x] T004 Freeze declaration-only versus run-only API ownership in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/contracts/phase-surface-ledger.md` using `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` as the current source snapshot
- [x] T005 [P] Write failing regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`
- [x] T006 [P] Extend declaration and freeze regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.Setup.Declare.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.Setup.Freeze.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.Evidence.Stability.test.ts`

## Phase 3: User Story 1 - semantic contract clear (Priority: P1)

- [x] T007 [US1] Rewrite `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/01-public-api-spine.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/03-canonical-authoring.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/05-logic-composition-and-override.md` so they speak only in declaration and run semantics
- [x] T008 [US1] Normalize internal phase types in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/module.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/module.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/ModuleFactory.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/authoring/logicSurface.ts`
- [x] T009 [US1] Keep public surface on a single builder path in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Module.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/index.ts`

## Phase 4: User Story 2 - declaration and run ownership clear (Priority: P2)

- [x] T010 [US2] Split declaration-only and run-only Bound APIs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- [x] T011 [US2] Align diagnostics wording and phase-guard semantics in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts`
- [x] T012 [US2] Convert declaration-centric examples in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/scenarios/lifecycle-gate.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/patterns/fields-reuse.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/fields-setup-declare.ts`

## Phase 5: User Story 3 - old phase objects stay out (Priority: P3)

- [x] T013 [US3] Demote module-level fields default path in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Module.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/ModuleTag.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/index.ts`
- [x] T014 [US3] Lock reviewer-facing regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.ModuleLevel.ExpertWarning.test.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.Conflict.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Logic/LogicFields.Setup.RemoveLogic.test.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T015 Run `pnpm typecheck`
- [x] T016 Run `pnpm -C packages/logix-core test -- --runInBand`
- [x] T017 Refresh `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/contracts/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/research.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/136-declare-run-phase-contract/data-model.md` with the final chosen contract

## Dependencies & Execution Order

- T004-T006 block all user story work
- US1 first locks semantics and public contract
- US2 depends on US1 wording and type ownership being stable
- US3 depends on US1 and US2 so old paths can be cut without ambiguity
