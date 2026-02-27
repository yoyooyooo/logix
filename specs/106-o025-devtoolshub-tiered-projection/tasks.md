# Tasks: O-025 DevtoolsHub 投影分层（light/full）

**Input**: 设计文档来自 `specs/106-o025-devtoolshub-tiered-projection/`  
**Source**: `docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md`

## Phase 1: Setup

- [x] T001 对齐 `specs/106-o025-devtoolshub-tiered-projection/spec.md` 与 O-025 源条目
- [x] T002 [P] 校验 `contracts/projection-tier-contract.md`
- [x] T003 [P] 校验 `contracts/consumer-degraded-contract.md`

## Phase 2: Foundational (Blocking)

- [x] T004 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 增加 tier 切分骨架
- [x] T005 [P] 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 对齐 snapshotToken 与可见字段一致性规则
- [x] T006 [P] 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 增加 degraded reason code 映射表

## Phase 3: User Story 1 - light 最小投影（P1）

- [x] T007 [P] [US1] 增加 light/full 写入开销对比测试
- [x] T008 [US1] 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 将 light 路径限制为摘要写入
- [x] T009 [US1] 记录性能证据并回写到 `specs/106-o025-devtoolshub-tiered-projection/perf/`

## Phase 4: User Story 2 - degraded 可解释（P2）

- [x] T010 [P] [US2] 在 `packages/logix-devtools-react` 增加 degraded 展示回归测试
- [x] T011 [P] [US2] 在 `packages/logix-sandbox` 增加 degraded 消费兼容测试
- [x] T012 [US2] 同步 `contracts/consumer-degraded-contract.md` 字段

## Phase 5: User Story 3 - staged 迁移收口（P3）

- [x] T013 [P] [US3] 更新 Devtools/Replay/Evidence 三端迁移文档
- [x] T014 [US3] 在 `specs/106-o025-devtoolshub-tiered-projection/checklists/release.md` 完成默认策略切换前检查清单
- [x] T015 [US3] 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 切换默认策略并验证矩阵

## Phase 6: Quality Gates

- [x] T016 运行 `pnpm typecheck`（仓库根 `package.json`）
- [x] T017 运行 `pnpm lint`（仓库根 `package.json`）
- [x] T018 运行 `pnpm test:turbo`（仓库根 `package.json`）
