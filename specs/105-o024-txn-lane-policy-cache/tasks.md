# Tasks: O-024 Txn Lane 策略前移缓存

**Input**: 设计文档来自 `specs/105-o024-txn-lane-policy-cache/`  
**Source**: `docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md`

## Phase 1: Setup

- [ ] T001 对齐 `specs/105-o024-txn-lane-policy-cache/spec.md` 与 O-024 源条目
- [ ] T002 [P] 校验 `checklists/migration.md` 高影响门禁
- [ ] T003 [P] 校验 `contracts/policy-cache-contract.md` 语义不变量

## Phase 2: Foundational (Blocking)

- [ ] T004 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts` 引入 capture 缓存
- [ ] T005 [P] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts` 对齐缓存读取
- [ ] T006 [P] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts` 消除重复 merge 调用
- [ ] T007 在 runtime core 对齐 override/re-capture 时序逻辑

## Phase 3: User Story 1 - 热路径缓存复用（P1）

- [ ] T008 [P] [US1] 在 `packages/logix-core/test` 增加 merge 指标回归测试
- [ ] T009 [US1] 增加缓存命中/失效场景单测
- [ ] T010 [US1] 记录 before/after merge 指标到 perf 证据

## Phase 4: User Story 2 - 时序语义明确（P2）

- [ ] T011 [P] [US2] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts` 增加 override 不即时生效测试
- [ ] T012 [P] [US2] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts` 增加 re-capture 后生效测试
- [ ] T013 [US2] 更新 `contracts/migration.md` 的时序说明与示例

## Phase 5: User Story 3 - 诊断与手册（P3）

- [ ] T014 [P] [US3] 在 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts` 更新 `txn_lane_policy::resolved` 事件字段测试
- [ ] T015 [US3] 更新 `docs/ssot/runtime` 中文手册（override/re-capture）
- [ ] T016 [US3] 对齐 `contracts/diagnostics.md` 与实现字段

## Phase 6: Quality Gates

- [ ] T017 运行 `pnpm typecheck`（仓库根 `package.json`）
- [ ] T018 运行 `pnpm lint`（仓库根 `package.json`）
- [ ] T019 运行 `pnpm test:turbo`（仓库根 `package.json`）
- [ ] T020 输出 `specs/105-o024-txn-lane-policy-cache/perf/*` 证据
