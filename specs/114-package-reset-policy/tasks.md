# Tasks: Package Reset Policy

**Input**: Design documents from `/specs/114-package-reset-policy/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: 以 package inventory 扫描、目录树只读核对、docs 对齐检查作为本特性的验证任务。
**Organization**: 先建立 inventory 与矩阵，再分别完成“包去向清晰”和“统一文件结构约束”。

## Phase 1: Setup (Inventory Inputs)

**Purpose**: 为 package policy 建立可追踪的 inventory 与审计落点

- [x] T001 Create package inventory ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/package-inventory.md`
- [x] T002 [P] Create topology snapshot ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/topology-snapshot.md`
- [x] T003 [P] Create audit results ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/audit-results.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先固定统一处置枚举、复用资产口径和 family template 骨架

- [x] T004 Create disposition matrix scaffold in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`
- [x] T005 [P] Create reuse candidate ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/reuse-candidates.md`
- [x] T006 [P] Define archive and rebootstrap protocol in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/archive-operations.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/contracts/README.md`
- [x] T007 [P] Create family template scaffold in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/family-templates.md`

**Checkpoint**: 统一处置枚举、复用资产台账和 family template 已存在，后续可以开始填包级记录

---

## Phase 3: User Story 1 - 先知道包去向再开工 (Priority: P1) 🎯 MVP

**Goal**: 让每个关键包都有明确去向、owner spec 和复用资产说明

**Independent Test**: 任取一个关键包，能在 5 分钟内从处置矩阵回答其 family、处置类型、复用资产和后续 owner spec

- [x] T008 [US1] Populate core family records in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/reuse-candidates.md` for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core-ng`
- [x] T009 [P] [US1] Populate host family records in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/reuse-candidates.md` for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react`
- [x] T010 [P] [US1] Populate domain and CLI records in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/reuse-candidates.md` for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/domain`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`
- [x] T011 [US1] Populate tooling and out-of-cutover records in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/disposition-matrix.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/research.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/quickstart.md` for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/speckit-kit`

**Checkpoint**: 所有关键包都已有明确处置类型和复用资产登记

---

## Phase 4: User Story 2 - 统一文件结构约束 (Priority: P2)

**Goal**: 给后续 owner spec 提供统一的 family template、archive 协议和 topology contract

**Independent Test**: 任意实现者能从 family template 和 archive 协议判断某个包的公开层、internal 层、测试镜像、封存路径和可复用资产平移方式

- [x] T012 [P] [US2] Define core and host family templates in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/family-templates.md`
- [x] T013 [P] [US2] Define domain, CLI, and tooling family templates in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/family-templates.md`
- [x] T014 [US2] Encode archive examples and topology contracts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/data-model.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/archive-operations.md`
- [x] T015 [US2] Write reuse-first routing checklist for owner specs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/quickstart.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/contracts/README.md`

**Checkpoint**: owner spec 可以直接复用统一 family template 和 archive 协议

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 对齐 inventory、family template、docs 依赖和审计结果

- [x] T016 [P] Reconcile disposition matrix, reuse candidates, and family templates across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/spec.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/data-model.md`
- [x] T017 Run inventory, topology, and docs-alignment audits from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/plan.md` and record results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/inventory/audit-results.md`

---

## Dependencies & Execution Order

- Setup 完成后，先完成 Foundational。
- Foundational 完成后，US1 与 US2 可以继续分阶段推进。
- `T009` 与 `T010` 可并行。
- `T012` 与 `T013` 可并行。
- `T017` 依赖全部 inventory 与 template 文件落盘完成。

## Parallel Example

```bash
Task: "Populate host family records in specs/114-package-reset-policy/inventory/disposition-matrix.md and specs/114-package-reset-policy/inventory/reuse-candidates.md for packages/logix-react packages/logix-sandbox packages/logix-test packages/logix-devtools-react"
Task: "Populate domain and CLI records in specs/114-package-reset-policy/inventory/disposition-matrix.md and specs/114-package-reset-policy/inventory/reuse-candidates.md for packages/logix-query packages/logix-form packages/i18n packages/domain packages/logix-cli"
```

```bash
Task: "Define core and host family templates in specs/114-package-reset-policy/inventory/family-templates.md"
Task: "Define domain, CLI, and tooling family templates in specs/114-package-reset-policy/inventory/family-templates.md"
```

## Implementation Strategy

1. 先把 inventory、矩阵和 archive 协议搭起来。
2. 先完成 US1，让每个关键包都有明确处置类型与复用资产说明。
3. 再完成 US2，给 115 到 119 提供统一目录模板和路由规则。
4. 最后跑审计并回写 spec 产物，保证 policy 能直接被后续 spec 使用。
