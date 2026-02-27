# Tasks: O-021 Module 实例化 API 统一

**Input**: 设计文档来自 `specs/102-o021-module-api-unification/`  
**Source**: `docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md`

## Phase 1: Setup

- [x] T001 对齐 `specs/102-o021-module-api-unification/spec.md` 与 O-021 源条目验收口径
- [x] T002 [P] 完成 `specs/102-o021-module-api-unification/plan.md` 的补强 Constitution Check 审核
- [x] T003 [P] 完成 `specs/102-o021-module-api-unification/contracts/migration.md` 迁移门禁校对

## Phase 2: Foundational (Blocking)

- [x] T004 在 `packages/logix-core/src/Module.ts` 设计统一实例化入口
- [ ] T005 [P] 在 `packages/logix-core/src/internal/runtime/ModuleFactory.ts` 抽取构造共核
- [x] T006 [P] 在 `packages/logix-core/src/Runtime.ts` 对齐统一入口装配链路
- [x] T007 在 `packages/logix-core/src/internal/runtime/core` 补齐诊断锚点一致性断言

## Phase 3: User Story 1 - 统一入口（P1）

- [x] T008 [P] [US1] 更新 `packages/logix-core/test` 中实例化 API 行为回归测试
- [x] T009 [US1] 删除 `live/implement/impl` 的推荐出口并固化统一入口文档注释
- [x] T010 [US1] 在 `packages/logix-core/src/index.ts` 对齐导出面

## Phase 4: User Story 2 - 契约与诊断稳定（P2）

- [x] T011 [P] [US2] 在 `packages/logix-core/test/internal/Runtime` 增加装配契约回归用例
- [x] T012 [US2] 在 `packages/logix-core/src/internal/runtime/core` 对齐诊断事件字段与 source 标记
- [x] T013 [US2] 更新 `docs/ssot/runtime/logix-core/observability` 相关中文说明

## Phase 5: User Story 3 - 迁移收口（P3）

- [ ] T014 [P] [US3] 迁移 `examples/logix` 中旧入口调用点
- [ ] T015 [P] [US3] 迁移 `packages/logix-react` 中旧入口调用点
- [ ] T016 [P] [US3] 迁移 `packages/logix-sandbox` 中旧入口调用点
- [x] T017 [US3] 更新 `apps/docs/content/docs` 中文文档，移除旧术语推荐

## Phase 6: Quality Gates

- [x] T018 运行 `pnpm typecheck`（仓库根 `package.json`）
- [x] T019 运行 `pnpm lint`（仓库根 `package.json`）
- [x] T020 运行 `pnpm test:turbo`（仓库根 `package.json`）
- [x] T021 采集并提交 `specs/102-o021-module-api-unification/perf/*` 证据文件
