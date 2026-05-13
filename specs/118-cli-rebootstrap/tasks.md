# Tasks: CLI Rebootstrap

**Input**: Design documents from `/specs/118-cli-rebootstrap/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: CLI 默认要求 integration tests、输出契约检查和类型检查。
**Organization**: 先建立命令面与 legacy 路由台账，再分别完成“新控制面直接可用”和“旧 CLI 安全退场”。

## Phase 1: Setup (CLI Inputs)

- [x] T001 Create command surface ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/command-surface.md`
- [x] T002 [P] Create legacy routing ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/legacy-routing.md`
- [x] T003 [P] Create reuse ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/reuse-ledger.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Audit current CLI topology in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/command-surface.md`
- [x] T005 [P] Define output schema in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/output-contract.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/contracts/README.md`
- [x] T006 [P] Record archive and expert routes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/legacy-routing.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`

**Checkpoint**: 新命令面、legacy routes、reuse ledger 已具备

---

## Phase 3: User Story 1 - 用新控制面直接驱动验证 (Priority: P1) 🎯 MVP

**Goal**: 新 CLI 的一级命令面围绕 `check / trial / compare`

**Independent Test**: 从命令面文档与源文件能读出唯一主命令与结构化输出契约

### Tests for User Story 1

- [x] T007 [P] [US1] Add check and compare integration tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/test/Integration/check.command.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/test/Integration/compare.command.test.ts`
- [x] T008 [P] [US1] Add trial integration and output contract tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/test/Integration/trial.command.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/test/Integration/output-contract.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Re-map CLI root command surface in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/bin/logix.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/Commands.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/index.ts`
- [x] T010 [P] [US1] Introduce control plane commands in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/check.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/trial.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/compare.ts`
- [x] T011 [US1] Align output helpers with verification contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/output.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/result.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/artifacts.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/stableJson.ts`

---

## Phase 4: User Story 2 - 旧 CLI 能安全退场 (Priority: P2)

**Goal**: 旧命令从主线退出，但可复用 helper 和 tests 得到保留

**Independent Test**: legacy routing ledger 能解释每条旧命令的去向

- [x] T012 [US2] Route legacy commands in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/anchorAutofill.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/anchorIndex.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/describe.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/irDiff.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/irExport.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/irValidate.ts`
- [x] T013 [US2] Record helper and test reuse in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/inventory/reuse-ledger.md`
- [x] T014 [US2] Update verification-aligned docs notes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/research.md`

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T015 [P] Run targeted typecheck and integration tests for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`
- [x] T016 Reconcile command surface, output contract, legacy routing, and reuse ledger across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/data-model.md`
