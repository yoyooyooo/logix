# Tasks: Examples Verification Alignment

**Input**: Design documents from `/specs/119-examples-verification-alignment/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: examples 侧默认要求 inventory、anchor map、pattern reuse 检查，以及必要的 verification 样例核对。
**Organization**: 先建立 inventory 与 anchor map，再分别完成“example 对应 docs / verification”与“目录拓扑稳定”。

## Phase 1: Setup (Example Inputs)

- [x] T001 Create example inventory in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/example-inventory.md`
- [x] T002 [P] Create docs anchor map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/anchor-map.md`
- [x] T003 [P] Create reuse ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/reuse-ledger.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Audit current example topology in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/example-inventory.md`
- [x] T005 [P] Define verification template in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/verification-template.md`
- [x] T006 [P] Record example structure contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/contracts/README.md`

**Checkpoint**: inventory、anchor map、verification template 已具备

---

## Phase 3: User Story 1 - 示例能对应文档与验证入口 (Priority: P1) 🎯 MVP

**Goal**: docs、examples、verification 三者形成稳定锚点

**Independent Test**: 任取一个 docs 页面都能找到 example 和 verification 入口

- [x] T007 [US1] Map runtime and control-plane docs to examples in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/anchor-map.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/07-standardized-scenario-patterns.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md`
- [x] T008 [P] [US1] Classify reusable scenarios and patterns in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/scenarios/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/patterns/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/reuse-ledger.md`
- [x] T009 [US1] Define verification entry subtree in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/verification/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/verification/index.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/verification-template.md`

---

## Phase 4: User Story 2 - 示例目录不再混杂 (Priority: P2)

**Goal**: 固定 examples 目录模板和 keep / adapt / archive 路由

**Independent Test**: 任意新示例都能根据模板找到唯一落点

- [x] T010 [US2] Define directory templates in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/example-templates.md`
- [x] T011 [US2] Record keep / adapt / archive routes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/inventory/example-inventory.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/research.md`
- [x] T012 [US2] Update example-facing docs notes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/07-standardized-scenario-patterns.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/quickstart.md`

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T013 [P] Run example inventory and anchor audits from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/plan.md`
- [x] T014 [P] Run pattern reuse validation with `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/scripts/check-pattern-reuse.mjs`
- [x] T015 Reconcile inventory, anchor map, verification template, and reuse ledger across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/data-model.md`
