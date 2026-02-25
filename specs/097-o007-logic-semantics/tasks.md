# Tasks: O-007 Logic 执行语义收敛（淘汰多重兼容分支）

**Input**: Design documents from `specs/097-o007-logic-semantics/`  
**Prerequisites**: `plan.md`（required）, `spec.md`（required）, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`  
**Tests**: REQUIRED（至少覆盖 setup/run 相位边界、三类 logic 输入回归、phase 诊断解释性）

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: 可并行（不同文件/无依赖）
- **[Story]**: `[US1]` / `[US2]` / `[US3]`

---

## Phase 1: Setup（规划落地与骨架）

**Purpose**: 固化 O-007 规划产物，确保实施前文档齐全

- [ ] T001 Confirm `specs/097-o007-logic-semantics/spec.md` 满足 O-007 backlog 目标与验收约束
- [ ] T002 [P] Confirm `specs/097-o007-logic-semantics/plan.md` Constitution Check 覆盖性能预算/诊断成本/IR锚点/稳定标识/迁移说明
- [ ] T003 [P] Confirm `specs/097-o007-logic-semantics/research.md`, `data-model.md`, `quickstart.md`, `contracts/*` 完整可用

---

## Phase 2: Foundational（执行模型收敛前置）

**Purpose**: 在不改变外部 API 的前提下建立 canonical normalize + execute 结构

**⚠️ CRITICAL**: 进入用户故事前必须完成

- [ ] T004 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` 抽取/实现 raw logic -> canonical plan 的统一 normalize 流程
- [ ] T005 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` 将执行主流程收敛为单一 setup/run 管线，移除多重兼容执行分支
- [ ] T006 [P] 视改造规模决定是否新增 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.normalize.ts`（若新增，保持单向依赖）
- [ ] T007 [P] 在 `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts` 校对 phase 诊断提示与 canonical 语义一致

**Checkpoint**: `ModuleRuntime.logics` 仅保留 canonical 执行主路径，逻辑可编译。

---

## Phase 3: User Story 1 - 统一执行入口（Priority: P1）

**Goal**: 单相/plan/plan-effect 三类输入都走 canonical setup/run

**Independent Test**: 对三类输入进行单测，验证执行与生命周期一致

### Tests for User Story 1（REQUIRED）

- [ ] T008 [P] [US1] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` 增加单相 logic canonical 化回归用例
- [ ] T009 [P] [US1] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` 增加 LogicPlan/plan-effect canonical 化回归用例

### Implementation for User Story 1

- [ ] T010 [US1] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.logics.ts` 完成 canonical plan 标准化结果接入执行主链
- [ ] T011 [US1] 清理 O-007 目标范围内已淘汰的兼容逻辑分支与冗余注释

**Checkpoint**: US1 回归用例全部通过。

---

## Phase 4: User Story 2 - phase 错误可解释（Priority: P2）

**Goal**: setup/run 越界错误统一、可解释、可追踪

**Independent Test**: phase 违规场景输出稳定 `logic::invalid_phase` + hint

### Tests for User Story 2（REQUIRED）

- [ ] T012 [P] [US2] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` 增加 setup 中 run-only API 违规诊断断言
- [ ] T013 [P] [US2] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` 增加 run 中 setup-only API 违规诊断断言

### Implementation for User Story 2

- [ ] T014 [US2] 在 `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`/`ModuleRuntime.logics.ts` 对齐 `LogicPhaseError -> logic::invalid_phase` 处理链路
- [ ] T015 [US2] 确保诊断事件保持 Slim 且可序列化，不引入新增协议分支

**Checkpoint**: US2 诊断回归用例全部通过。

---

## Phase 5: User Story 3 - 启动链路缩短与性能证据（Priority: P3）

**Goal**: 核心路径重构后无性能回归并留下可复现证据

**Independent Test**: before/after perf 报告 + diff 可对比

### Perf & Validation（REQUIRED）

- [ ] T016 [US3] 采集 before perf：输出到 `specs/097-o007-logic-semantics/perf/before.*.json`
- [ ] T017 [US3] 采集 after perf：输出到 `specs/097-o007-logic-semantics/perf/after.*.json`
- [ ] T018 [US3] 生成 diff：输出到 `specs/097-o007-logic-semantics/perf/diff.*.json` 并确认 comparability=true

### Documentation for User Story 3

- [ ] T019 [US3] 更新 `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md` 同步 canonical 语义
- [ ] T020 [US3] 更新 `docs/ssot/runtime/logix-core/impl/README.07-env-and-bootstrap.md` 同步启动链路与 phase 诊断口径
- [ ] T021 [US3] 更新 `specs/097-o007-logic-semantics/contracts/migration.md` 记录最终迁移说明

**Checkpoint**: US3 性能证据与文档同步完成。

---

## Phase 6: Quality Gate & Delivery

**Purpose**: 全量质量门、提交与 PR

- [ ] T022 运行 `pnpm typecheck`
- [ ] T023 运行 `pnpm lint`
- [ ] T024 运行 `pnpm test:turbo`（必要时补充包级测试）
- [ ] T025 整理变更并提交到分支 `refactor/o007-logic-semantics`
- [ ] T026 创建 PR（base=`main`）并附 O-007 证据（测试 + perf + 文档）
- [ ] T027 轮询 review bot，采纳合理建议后二次提交并记录采纳/不采纳清单

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> Phase 2 -> Phase 3/4 -> Phase 5 -> Phase 6

### User Story Dependencies

- **US1 (P1)**：依赖 Phase 2
- **US2 (P2)**：依赖 US1（执行主链稳定后再做诊断收敛）
- **US3 (P3)**：依赖 US1 + US2（功能稳定后再测性能并文档收口）

---

## Parallel Opportunities

- `T006` 与 `T007` 可并行
- `T008` 与 `T009` 可并行
- `T012` 与 `T013` 可并行

---

## Implementation Strategy

### MVP First（US1）

1. 完成 Phase 2（canonical normalize + execute）
2. 完成 US1（三类输入统一执行）
3. 先跑相关单测确认无回归

### Incremental Delivery

1. US1（执行语义）
2. US2（诊断可解释）
3. US3（性能证据 + 文档）
