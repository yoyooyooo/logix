# Tasks: Host Runtime Rebootstrap

**Input**: Design documents from `/specs/116-host-runtime-rebootstrap/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: 宿主相关包默认要求角色边界测试、integration/browser tests 和相关类型检查。
**Organization**: 先建立 role matrix 与 reuse ledger，再分别完成“围绕同一核心组织”和“目录模板稳定”。

## Phase 1: Setup (Host Inputs)

- [x] T001 Create host role matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/host-role-matrix.md`
- [x] T002 [P] Create host reuse ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/reuse-ledger.md`
- [x] T003 [P] Create shared control plane contract notes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/shared-control-plane.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Audit current host package topology in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/host-role-matrix.md`
- [x] T005 [P] Define package templates in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/package-templates.md`
- [x] T006 [P] Record reuse-first routing in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/contracts/README.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/quickstart.md`

**Checkpoint**: role matrix、reuse ledger、package template 已具备

---

## Phase 3: User Story 1 - 宿主相关包围绕同一核心组织 (Priority: P1) 🎯 MVP

**Goal**: 四个宿主相关包都围绕 `kernel + runtime control plane` 组织

**Independent Test**: 任意宿主能力都能定位到唯一包和唯一 contract

### Tests for User Story 1

- [x] T007 [P] [US1] Add React host boundary tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Platform/Platform.NoTearingBoundary.test.tsx`
- [x] T008 [P] [US1] Add sandbox and test package contract tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts`
- [x] T009 [P] [US1] Add devtools snapshot contract tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react/test/internal/SnapshotContract.test.tsx`

### Implementation for User Story 1

- [x] T010 [US1] Re-map React host boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/RuntimeProvider.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/Hooks.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/Platform.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/ReactPlatform.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/internal/**`
- [x] T011 [P] [US1] Re-map sandbox boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/Client.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/Protocol.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/Service.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/Vite.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/internal/**`
- [x] T012 [P] [US1] Re-map test package boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/Execution.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/Assertions.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/TestProgram.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/TestRuntime.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/Vitest.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/src/internal/**`
- [x] T013 [P] [US1] Re-map devtools boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react/src/DevtoolsLayer.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react/src/LogixDevtools.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react/src/FieldGraphView.tsx`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react/src/internal/**`

---

## Phase 4: User Story 2 - 目录重启前先定模板 (Priority: P2)

**Goal**: 给后续实现提供稳定目录模板和 archive / rebootstrap 路径

**Independent Test**: 任意实现者能回答某个宿主能力应落在哪个包的哪个层级

- [x] T014 [US2] Define archive or preserve routes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/package-templates.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`
- [x] T015 [US2] Record reusable fixtures and browser tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/inventory/reuse-ledger.md`
- [x] T016 [US2] Update shared verification and docs anchors in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/07-standardized-scenario-patterns.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/research.md`

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Run targeted typecheck and tests for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react`
- [x] T018 Reconcile role matrix, templates, and reuse ledger across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/data-model.md`
