# Tasks: O-006 Runtime Assembly Graph

**Input**: Design documents from `specs/099-runtime-assembly-graph/`  
**Prerequisites**: `spec.md`, `plan.md`

**Tests**: 本特性触及 runtime 核心路径，测试与性能证据为必选项。  
**Organization**: 按 User Story 分组，保证可独立实现与验收。

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 创建规划辅助文档骨架 `specs/099-runtime-assembly-graph/research.md`、`specs/099-runtime-assembly-graph/data-model.md`、`specs/099-runtime-assembly-graph/quickstart.md`
- [ ] T002 [P] 初始化契约目录与启动报告 schema 骨架 `specs/099-runtime-assembly-graph/contracts/assembly-boot-report.schema.json`
- [ ] T003 [P] 初始化性能证据目录与说明 `specs/099-runtime-assembly-graph/perf/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 定义 assembly graph 阶段模型与稳定标识策略 `specs/099-runtime-assembly-graph/data-model.md`
- [ ] T005 [P] 定义诊断事件 Slim/可序列化契约 `specs/099-runtime-assembly-graph/contracts/assembly-diagnostic.schema.json`
- [ ] T006 [P] 定义冷启动性能预算与采集命令 `specs/099-runtime-assembly-graph/research.md`
- [ ] T007 固化事务窗口约束与迁移门禁 `specs/099-runtime-assembly-graph/research.md`

---

## Phase 3: User Story 1 - 冷启动链路可解释化 (Priority: P1) 🎯 MVP

**Goal**: 装配路径显式化，boot 失败可直接定位。  
**Independent Test**: 成功/失败两类冷启动都能输出可解释装配路径和失败锚点。

- [ ] T008 [P] [US1] 新增装配图成功路径测试 `packages/logix-core/test/internal/Runtime/AppRuntime.AssemblyGraph.test.ts`
- [ ] T009 [P] [US1] 新增 boot 失败定位测试 `packages/logix-core/test/internal/Runtime/AppRuntime.BootFailure.test.ts`
- [ ] T010 [P] [US1] 实现装配图模型与执行器 `packages/logix-core/src/internal/runtime/core/AppAssemblyGraph.ts`
- [ ] T011 [US1] 重构装配主流程接入 assembly graph `packages/logix-core/src/internal/runtime/AppRuntime.ts`
- [ ] T012 [US1] 显式化 RootContext ready/merge 生命周期 `packages/logix-core/src/internal/runtime/core/RootContext.ts`
- [ ] T013 [US1] 投影结构化启动诊断与只读启动报告 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

---

## Phase 4: User Story 2 - 启动稳定性与可回归验证 (Priority: P2)

**Goal**: 标识稳定可复现，诊断成本可预算。  
**Independent Test**: 同配置多次冷启动结果结构一致，且性能/诊断预算可复测。

- [ ] T014 [P] [US2] 新增稳定标识回归测试 `packages/logix-core/test/internal/Runtime/AppRuntime.AssemblyIdentity.test.ts`
- [ ] T015 [P] [US2] 新增诊断序列化与降级测试 `packages/logix-core/test/internal/Runtime/AppRuntime.DiagnosticsSerialization.test.ts`
- [ ] T016 [US2] 实现 stage/event 稳定序号（去随机化）`packages/logix-core/src/internal/runtime/core/AppAssemblyGraph.ts`
- [ ] T017 [US2] 实现 diagnostics off/light/full 成本分级 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [ ] T018 [US2] 采集 before/after/diff 性能证据 `specs/099-runtime-assembly-graph/perf/`

---

## Phase 5: User Story 3 - 迁移与对外行为稳定 (Priority: P3)

**Goal**: 对外入口保持稳定，破坏性变化有迁移说明。  
**Independent Test**: 业务使用路径不改即可运行；若破坏则可按迁移文档完成升级。

- [ ] T019 [P] [US3] 新增 Runtime 入口兼容性回归测试 `packages/logix-core/test/internal/Runtime/AppRuntime.Compatibility.test.ts`
- [ ] T020 [US3] 更新 Runtime 装配链路文档 `docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.02-app-runtime-makeapp.md`
- [ ] T021 [US3] 更新诊断事件协议文档 `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`
- [ ] T022 [US3] 破坏性变更时补迁移说明 `specs/099-runtime-assembly-graph/migration.md`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] 回写 quickstart 验证步骤与验收口径 `specs/099-runtime-assembly-graph/quickstart.md`
- [ ] T024 运行类型与静态检查质量门 `pnpm typecheck`、`pnpm lint`
- [ ] T025 运行测试与性能门禁 `pnpm test:turbo` + `pnpm perf collect/diff`

---

## Dependencies & Execution Order

- [ ] D001 先完成 Phase 1-2（阻塞阶段），再进入任一 User Story。
- [ ] D002 US1 是 MVP，US2/US3 依赖 US1 的装配图主链路完成。
- [ ] D003 US2 可在 US1 合并后并行推进测试与性能证据。
- [ ] D004 US3 在 US1/US2 稳定后执行文档与迁移收口。

## Parallel Opportunities

- [ ] P001 Setup 中 T002/T003 可并行。
- [ ] P002 Foundational 中 T005/T006 可并行。
- [ ] P003 US1 中 T008/T009/T010 可并行。
- [ ] P004 US2 中 T014/T015 可并行。
- [ ] P005 Final 中 T023 可与质量门准备并行。
