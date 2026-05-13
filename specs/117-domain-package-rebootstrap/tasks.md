# Tasks: Domain Package Rebootstrap

**Input**: Design documents from `/specs/117-domain-package-rebootstrap/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: 领域包默认要求边界测试、类型检查和必要的 reuse regression tests。
**Organization**: 先建立角色矩阵与 reuse ledger，再分别完成“主输出形态明确”和“目录模板稳定”。

## Phase 1: Setup (Domain Inputs)

- [x] T001 Create domain role matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/domain-role-matrix.md`
- [x] T002 [P] Create domain reuse ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/reuse-ledger.md`
- [x] T003 [P] Create boundary notes ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/boundary-notes.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Audit current domain package topology in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/domain-role-matrix.md`
- [x] T005 [P] Define domain package templates in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/package-templates.md`
- [x] T006 [P] Record output-mode and archive routes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/contracts/README.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`

**Checkpoint**: 主输出形态表、reuse ledger、package template 已具备

---

## Phase 3: User Story 1 - 领域包不再长第二套心智 (Priority: P1) 🎯 MVP

**Goal**: query / form / i18n / domain 都有唯一主输出形态

**Independent Test**: 任取一个领域包，都能从 role matrix 与合同中读出唯一主入口

### Tests for User Story 1

- [x] T007 [P] [US1] Add query and i18n boundary tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
- [x] T008 [P] [US1] Add form and domain boundary tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.DomainBoundary.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain/test/Crud/Crud.PatternKitBoundary.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Re-map query boundary in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Query.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Engine.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/TanStack.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/Fields.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/internal/**`
- [x] T010 [P] [US1] Re-map i18n boundary in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/I18n.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/I18nModule.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/Token.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/internal/**`
- [x] T011 [P] [US1] Re-map domain boundary in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain/src/Crud.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain/src/index.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain/src/internal/**`
- [x] T012 [US1] Re-map form boundary in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Form.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/FormView.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Field.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/react/**`

---

## Phase 4: User Story 2 - 旧目录可封存，主线可重建 (Priority: P2)

**Goal**: 领域包都具备清晰的 archive / preserve / move 路径

**Independent Test**: 任意实现者都能判断某个领域实现是保留、平移、拆分还是退出主线

- [x] T013 [US2] Record reusable protocol, helper, fixture, and test assets in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/reuse-ledger.md`
- [x] T014 [US2] Define archive or preserve routes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/inventory/package-templates.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`
- [x] T015 [US2] Update boundary docs and migration notes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/research.md`

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T016 [P] Run targeted typecheck and tests for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain`
- [x] T017 Reconcile role matrix, package templates, and reuse ledger across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/data-model.md`
