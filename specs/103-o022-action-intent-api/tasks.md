# Tasks: O-022 Action API 收敛到 ActionIntent

**Input**: 设计文档来自 `specs/103-o022-action-intent-api/`  
**Source**: `docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md`

## Phase 1: Setup

- [x] T001 对齐 `specs/103-o022-action-intent-api/spec.md` 与 O-022 裁决口径
- [x] T002 [P] 校验 `specs/103-o022-action-intent-api/checklists/api.md` 作为高影响门禁
- [x] T003 [P] 校验 `specs/103-o022-action-intent-api/contracts/api-surface.md` 分层定义

## Phase 2: Foundational (Blocking)

- [x] T004 在 `packages/logix-core/src/internal/action.ts` 统一 ActionIntent 内核接口
- [x] T005 [P] 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 接入统一内核
- [x] T006 [P] 在 `packages/logix-core/src/internal/runtime/core` 对齐入口来源诊断字段

## Phase 3: User Story 1 - 保留 `$.dispatchers` 主入口（P1）

- [x] T007 [P] [US1] 在 `packages/logix-core/test` 增加 `$.dispatchers` 类型推导与行为回归测试
- [x] T008 [US1] 在 `packages/logix-core/src` 确保 `$.dispatchers` facade 为薄封装
- [x] T009 [US1] 更新 `apps/docs/content/docs` 默认写法为 `$.dispatchers`

## Phase 4: User Story 2 - ActionIntent 内核统一（P2）

- [x] T010 [P] [US2] 在 `packages/logix-core/test/internal` 增加三入口同内核路径断言
- [x] T011 [US2] 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 对齐 `$.action(token)` 到 ActionIntent 统一执行链
- [x] T012 [US2] 在 `contracts/action-intent-kernel.md` 回写最终字段契约

## Phase 5: User Story 3 - 兼容入口低阶化（P3）

- [x] T013 [P] [US3] 识别并迁移 `examples/logix` 中字符串入口高频调用
- [x] T014 [P] [US3] 识别并迁移 `packages/logix-react` 中字符串入口高频调用
- [x] T015 [US3] 更新 `contracts/migration.md` 明确未来移除策略

## Phase 6: Quality Gates

- [x] T016 运行 `pnpm typecheck`（仓库根 `package.json`）
- [x] T017 运行 `pnpm lint`（仓库根 `package.json`）
- [x] T018 运行 `pnpm test:turbo`（仓库根 `package.json`）
- [x] T019 输出 `specs/103-o022-action-intent-api/perf/*` 证据
