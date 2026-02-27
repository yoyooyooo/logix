# Tasks: O-023 Flow `run(config)` 命名收敛

**Input**: 设计文档来自 `specs/104-o023-flow-run-config/`  
**Source**: `docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md`

## Phase 1: Setup

- [ ] T001 对齐 `specs/104-o023-flow-run-config/spec.md` 与 O-023 源条目
- [ ] T002 [P] 校验 `specs/104-o023-flow-run-config/checklists/migration.md` 门禁完整性
- [ ] T003 [P] 校验 `specs/104-o023-flow-run-config/contracts/run-config-contract.md`

## Phase 2: Foundational (Blocking)

- [ ] T004 在 `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts` 接入 `run(config)` 主入口
- [ ] T005 [P] 在 `packages/logix-core/src/internal/runtime/core/TaskRunner.ts` 收敛 task 语义实现
- [ ] T006 [P] 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 对齐入口映射
- [ ] T007 在 `packages/logix-core/src/internal/runtime/core` 加入统一策略执行器

## Phase 3: User Story 1 - 单入口 API（P1）

- [ ] T008 [P] [US1] 在 `packages/logix-core/test` 增加 run* -> run(config) 等价测试
- [ ] T009 [US1] 在 `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts` 将旧 run* 改为过渡 alias 并统一内部委托
- [ ] T010 [US1] 更新 `apps/docs/content/docs` 默认示例到 `run(config)`

## Phase 4: User Story 2 - 语义矩阵（P2）

- [ ] T011 [P] [US2] 补充 latest/exhaust/parallel/task 矩阵测试
- [ ] T012 [US2] 对齐 `contracts/diagnostics.md` 与 runtime 事件字段
- [ ] T013 [US2] 在 `packages/logix-core/test/internal` 固化冲突输入行为

## Phase 5: User Story 3 - 迁移收口（P3）

- [ ] T014 [P] [US3] 迁移 `examples/logix` run* 调用点
- [ ] T015 [P] [US3] 迁移 `packages/logix-react` run* 调用点
- [ ] T016 [US3] 删除旧 run* 符号并更新 `contracts/migration.md`

## Phase 6: Quality Gates

- [ ] T017 运行 `pnpm typecheck`（仓库根 `package.json`）
- [ ] T018 运行 `pnpm lint`（仓库根 `package.json`）
- [ ] T019 运行 `pnpm test:turbo`（仓库根 `package.json`）
- [ ] T020 输出 `specs/104-o023-flow-run-config/perf/*` 证据
