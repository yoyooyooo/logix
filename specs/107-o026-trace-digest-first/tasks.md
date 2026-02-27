# Tasks: O-026 Trace 载荷 digest-first 精简

**Input**: 设计文档来自 `specs/107-o026-trace-digest-first/`  
**Source**: `docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md`

## Phase 1: Setup

- [ ] T001 对齐 `specs/107-o026-trace-digest-first/spec.md` 与 O-026 源条目
- [ ] T002 [P] 校验 `contracts/digest-payload-contract.md`
- [ ] T003 [P] 校验 `contracts/replay-lookup-contract.md`

## Phase 2: Foundational (Blocking)

- [ ] T004 在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 增加 digest-first 载荷生成
- [ ] T005 [P] 在 `packages/logix-core/src/internal/runtime/core/ReplayLog.ts` 接入 lookup key
- [ ] T006 [P] 在 `packages/logix-core/src/internal/observability/evidenceCollector.ts` 对齐导出字段
- [ ] T007 在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 对齐降级 reasonCode 与诊断映射

## Phase 3: User Story 1 - 载荷精简（P1）

- [ ] T008 [P] [US1] 增加 bytes/event 与编码时延回归测试
- [ ] T009 [US1] 记录 before/after 导出吞吐证据
- [ ] T010 [US1] 在 `specs/107-o026-trace-digest-first/perf/` 校验 digest 计算开销预算

## Phase 4: User Story 2 - 按需回查（P2）

- [ ] T011 [P] [US2] 在 `packages/logix-devtools-react/test/` 增加 lookup 成功路径测试
- [ ] T012 [P] [US2] 在消费端增加 digest 缺失/错配降级测试
- [ ] T013 [US2] 更新 `contracts/replay-lookup-contract.md` 最终字段

## Phase 5: User Story 3 - 三端迁移（P3）

- [ ] T014 [P] [US3] 迁移 `packages/logix-devtools-react` digest 消费逻辑
- [ ] T015 [P] [US3] 迁移 `packages/logix-sandbox` digest 消费逻辑
- [ ] T016 [US3] 在 `apps/docs/content/docs/` 更新平台文档并在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 切 runtime 默认 digest-only

## Phase 6: Quality Gates

- [ ] T017 运行 `pnpm typecheck`（仓库根 `package.json`）
- [ ] T018 运行 `pnpm lint`（仓库根 `package.json`）
- [ ] T019 运行 `pnpm test:turbo`（仓库根 `package.json`）
