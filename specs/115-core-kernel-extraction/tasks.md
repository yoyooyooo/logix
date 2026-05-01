# Tasks: Core Kernel Extraction

**Input**: Design documents from `/specs/115-core-kernel-extraction/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: `packages/logix-core` / `packages/logix-core-ng` 变更默认要求测试、类型检查与 perf evidence。
**Organization**: 先建立 kernel inventory 和 support matrix，再分别完成“kernel 边界清晰”和“core-ng 去向清晰”。

## Phase 1: Setup (Kernel Inputs)

- [x] T001 Create kernel zone map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/kernel-zone-map.md`
- [x] T002 [P] Create support matrix ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/support-matrix.md`
- [x] T003 [P] Create reuse candidate ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/reuse-ledger.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Audit current core and core-ng topology in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/kernel-zone-map.md` using `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng/src`
- [x] T005 [P] Define target public surface map in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/public-surface-map.md`
- [x] T006 [P] Define baseline perf evidence plan in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/perf/README.md`
- [x] T007 [P] Record support-matrix constraints in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/support-matrix.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/contracts/README.md`

**Checkpoint**: 目标 zone、公开面、support matrix、reuse ledger 已具备

---

## Phase 3: User Story 1 - 能说清哪部分是 kernel (Priority: P1) 🎯 MVP

**Goal**: 让 `@logixjs/core` 的关键内部模块能稳定归入明确分层

**Independent Test**: 阅读 zone map 与相关源文件时，能将 `ModuleRuntime`、`StateTransaction`、`TaskRunner`、`RuntimeKernel`、`DebugSink`、`Reflection`、`ProcessRuntime` 归入唯一分层

### Tests for User Story 1

- [x] T008 [P] [US1] Add kernel boundary contract tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelBoundary.test.ts`
- [x] T009 [P] [US1] Add diagnostics and reflection boundary tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/observability/KernelObservabilitySurface.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Extract target kernel boundary in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/kernel-api.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/**`
- [ ] T011 [US1] Split runtime shell and public surface responsibilities in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Runtime.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Module.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Logic.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- [x] T012 [US1] Normalize observability and reflection boundaries in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/evidence-api.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection-api.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/**`
- [x] T013 [US1] Record kernel boundary docs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/01-public-api-spine.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/02-hot-path-direction.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`

**Checkpoint**: kernel / shell / observability / reflection / process 边界已能独立解释

---

## Phase 4: User Story 2 - 给 core-ng 一个明确结论 (Priority: P2)

**Goal**: 让 `@logixjs/core-ng` 不再作为并列主线悬空存在

**Independent Test**: support matrix、migration note 与相关源文件能明确回答 `core-ng` 的唯一去向

### Tests for User Story 2

- [x] T014 [P] [US2] Add support matrix and migration tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelSupportMatrix.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng/test/KernelLegacyRouting.test.ts`

### Implementation for User Story 2

- [x] T015 [US2] Define `core-ng` retention or migration points in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng/src/index.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng/src/RuntimeServices.impls.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/RuntimeServices.impls.coreNg.ts`
- [x] T016 [US2] Record `core-ng` migration note and support matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/inventory/support-matrix.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/quickstart.md`

**Checkpoint**: `core-ng` 已退出并列主线叙事，support matrix 成立

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Run perf evidence collection and diff from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/perf/README.md`
- [x] T018 Run targeted typecheck and tests for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng`
- [x] T019 Reconcile reuse ledger, support matrix, and docs writeback across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/data-model.md`
