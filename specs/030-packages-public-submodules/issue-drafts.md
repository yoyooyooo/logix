# Issue Drafts: 030 · Packages 对外子模块裁决与结构治理

> 用途：把 `specs/030-packages-public-submodules/tasks.md` 的任务集合整理成可复制的 issue 草稿，便于同步到任意 issue tracker。
>
> 说明：本特性任务已全部完成；若你仍需要在 tracker 留痕，可按本文件创建后直接关闭。

**Source of Truth**: `specs/030-packages-public-submodules/tasks.md`  

## 推荐：按 Phase 合并成 10 个 Issue

### 1) Phase 1: Setup (Shared Infrastructure)

**Title**: `[030] Setup: public-submodules 验证门脚手架`  
**Tasks**: T001, T002, T003  
**Done Criteria**: `pnpm verify:public-submodules` 可运行并输出 PASS

### 2) Phase 2: Foundational (Blocking Prerequisites)

**Title**: `[030] Gate: exports/internal/src-root 规则与最小单测`  
**Tasks**: T004, T005, T006, T007, T008, T009, T010  
**Done Criteria**: `scripts/public-submodules/verify.test.ts` 覆盖关键违规场景

### 3) Phase 3: US1 - 对外子模块裁决清单

**Title**: `[030] Contracts: Public Submodules 概念地图与独立入口裁决`  
**Tasks**: T011, T012, T013, T014  
**Done Criteria**: `contracts/public-submodules.md` 可单独作为裁决基线阅读

### 4) Phase 4: US2 - 结构与命名规则落地（按包）

**Title**: `[030] Refactor: packages/* public surface 收口（PascalCase + exports）`  
**Tasks**: T015, T016, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028, T029, T030, T031, T032, T033, T034, T035, T036, T037, T038, T039, T040, T041  
**Done Criteria**: `pnpm verify:public-submodules` + `pnpm typecheck`

### 5) Phase 4B: Internal Convergence

**Title**: `[030] Refactor: src/internal 分区收敛（按 internal-structure 蓝图）`  
**Tasks**: T053, T054, T055, T056, T057, T058, T059, T060, T061, T062, T063, T064  
**Done Criteria**: internal 目录按蓝图分区；核心路径 guardrail 写入 plan（如触及语义）

### 6) Phase 5: US3 - 路线图可交接

**Title**: `[030] Docs: Gap Report + 逐包迁移路线图`  
**Tasks**: T065, T066, T067  
**Done Criteria**: `contracts/gap-report.md` + `contracts/migration.md` 可交接执行

### 7) Phase N: Polish & Cross-Cutting Concerns

**Title**: `[030] Polish: 清理/格式化 + 调用方推荐 import 对齐`  
**Tasks**: T068, T069, T070  
**Done Criteria**: verify gate 通过；examples/docs 无 internal deep import

### 8) Phase N+1: Collaboration & Future-Proofing

**Title**: `[030] Governance: 协作协议 + 子模块提升为子包路径`  
**Tasks**: T071, T072  
**Done Criteria**: contracts 完整且与 public-submodules 裁决一致

### 9) Phase N+2: Test Structure Alignment

**Title**: `[030] Tests: test/ 目录按概念地图分组对齐`  
**Tasks**: T076, T077, T078, T079, T080, T081, T082, T083, T084, T085  
**Done Criteria**: `src/**` 下无测试；internal 用例收敛 `test/internal/**`

### 10) Phase N+3: SSoT & User Docs Writeback

**Title**: `[030] Writeback: Runtime SSoT + Glossary + 用户文档 recipes`  
**Tasks**: T073, T074, T075  
**Done Criteria**: `docs/ssot/handbook/*` 与 `apps/docs` 口径一致

## 可选：按 Task 逐条创建 Issue

- 直接以 `specs/030-packages-public-submodules/tasks.md` 的每条 `Txxx` 作为 issue（title+body）。
- 如需我“真正创建 GitHub issues”，你需要提供目标仓库 `owner/repo`（或完整 URL）。
