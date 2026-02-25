# Tasks: Runtime-Scoped Observability for Diagnostics Hot Path

**Input**: Design documents from `specs/097-runtime-scoped-observability/`  
**Prerequisites**: `spec.md`（required）, `plan.md`（required）

**Tests**: 本特性触及 `packages/logix-core` 运行时核心路径，测试与性能/可诊断回归防线视为必需项。  
**Organization**: 任务按用户故事组织，确保可独立实现与验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件且无未完成依赖）
- **[Story]**: 用户故事标签（US1/US2/US3）
- 每条任务都包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 O-004 的规划与基线采样骨架

- [ ] T001 创建规划产物骨架（`specs/097-runtime-scoped-observability/research.md`、`specs/097-runtime-scoped-observability/data-model.md`、`specs/097-runtime-scoped-observability/quickstart.md`、`specs/097-runtime-scoped-observability/contracts/README.md`）
- [ ] T002 [P] 记录现状链路与热点入口到 `specs/097-runtime-scoped-observability/research.md`（聚焦 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`）
- [ ] T003 [P] 采集 before 性能基线并落盘到 `specs/097-runtime-scoped-observability/perf/before.*.json`
- [ ] T004 在 `specs/097-runtime-scoped-observability/contracts/` 建立事件协议草案（slim envelope / runtime ring / projection result）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 完成所有用户故事共享的硬约束与契约前置

**⚠️ CRITICAL**: 本阶段完成前不得进入用户故事实现

- [ ] T005 完成 runtime-scoped 观测架构与生命周期设计，写入 `specs/097-runtime-scoped-observability/data-model.md`
- [ ] T006 [P] 完成稳定标识模型定义（instanceId/txnSeq/opSeq/eventSeq 派生规则），写入 `specs/097-runtime-scoped-observability/contracts/identity-model.md`
- [ ] T007 [P] 完成 IR/锚点漂移风险清单与防线，写入 `specs/097-runtime-scoped-observability/research.md`
- [ ] T008 [P] 完成迁移说明草案（forward-only，无兼容层），写入 `specs/097-runtime-scoped-observability/quickstart.md`
- [ ] T009 [P] 增加契约测试框架文件 `packages/logix-core/test/internal/Observability/RuntimeScopedContracts.test.ts`
- [ ] T010 增加性能门禁脚本说明与执行步骤到 `specs/097-runtime-scoped-observability/quickstart.md`

**Checkpoint**: 共享契约、预算与迁移策略均已固定

---

## Phase 3: User Story 1 - 诊断开启时仍保持主链低开销 (Priority: P1) 🎯 MVP

**Goal**: 热路径仅写 slim envelope，并将重投影/裁剪从主链剥离

**Traceability**: NS-10, KF-8

**Independent Test**: 在 diagnostics=light/full 下跑压测，验证主链只做轻量 append 且满足预算

### Tests for User Story 1

- [ ] T011 [P] [US1] 新增热路径行为测试 `packages/logix-core/test/internal/Runtime/StateTransaction.ObservabilityHotPath.test.ts`
- [ ] T012 [P] [US1] 新增异步投影触发测试 `packages/logix-core/test/internal/Observability/AsyncProjectionScheduling.test.ts`

### Implementation for User Story 1

- [ ] T013 [US1] 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 实现 slim envelope 主链编码（去除主链重对象投影）
- [ ] T014 [US1] 在 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 对接 envelope-only 提交路径，确保事务窗口无 IO
- [ ] T015 [US1] 新增 `packages/logix-core/src/internal/observability/projection/AsyncProjectionQueue.ts`，承载按需异步重投影
- [ ] T016 [US1] 在 `packages/logix-core/src/internal/observability/jsonValue.ts` 增强大对象/不可序列化降级码输出（`non_serializable`/`oversized`）
- [ ] T017 [US1] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 接入 projection queue 的按需触发与关闭策略
- [ ] T018 [US1] 补充/更新性能基线采样说明到 `specs/097-runtime-scoped-observability/research.md`
- [ ] T019 [US1] 采集 after 性能数据并输出 diff 到 `specs/097-runtime-scoped-observability/perf/diff.before__after.*.json`

**Checkpoint**: diagnostics 开启下主链附加耗时与分配显著下降

---

## Phase 4: User Story 2 - 多 Runtime 观测隔离与可解释 (Priority: P2)

**Goal**: runtime 维度隔离 ring/buffer/计数与 latest 缓存，消除全局串扰

**Traceability**: NS-10, KF-8

**Independent Test**: 并发多个 runtime，验证事件窗口与统计互不影响

### Tests for User Story 2

- [ ] T020 [P] [US2] 新增多 runtime 隔离测试 `packages/logix-core/test/internal/Observability/RuntimeScopedIsolation.test.ts`
- [ ] T021 [P] [US2] 新增 runtime 销毁与迟到事件测试 `packages/logix-core/test/internal/Observability/RuntimeScopedLifecycle.test.ts`

### Implementation for User Story 2

- [ ] T022 [US2] 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 重构为 runtime-scoped 存储模型（每 runtime 独立 ring/buffer）
- [ ] T023 [US2] 新增 `packages/logix-core/src/internal/runtime/core/RuntimeScopedObservability.ts`，统一管理 runtime 级事件上下文与容量策略
- [ ] T024 [US2] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 对接 runtime create/destroy 生命周期回收逻辑
- [ ] T025 [US2] 在 `packages/logix-core/src/internal/runtime/core/Debug.ts` 暴露 runtime-scoped 查询/订阅入口（保持 API 可解释）
- [ ] T026 [US2] 更新 `packages/logix-core/test/internal/Runtime/Runtime.make.devtools.test.ts` 覆盖多 runtime 并发语义

**Checkpoint**: 同进程多 runtime 下无事件串扰，裁剪与计数按 runtime 独立

---

## Phase 5: User Story 3 - 按需重投影与大对象裁剪可追踪 (Priority: P3)

**Goal**: 异步按需重投影具备稳定降级原因，保证性能与解释链路并存

**Traceability**: NS-10, KF-8

**Independent Test**: 注入 oversized / non-serializable payload，验证降级码、锚点与导出可序列化

### Tests for User Story 3

- [ ] T027 [P] [US3] 新增降级原因测试 `packages/logix-core/test/internal/Observability/ProjectionDowngradeReason.test.ts`
- [ ] T028 [P] [US3] 新增导出可序列化测试 `packages/logix-core/test/internal/Observability/ExportSerialization.test.ts`

### Implementation for User Story 3

- [ ] T029 [US3] 在 `packages/logix-core/src/internal/observability/evidenceCollector.ts` 接入按需重投影结果与降级统计导出
- [ ] T030 [US3] 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 补齐 envelope → projection 引用锚点字段（不回流大对象）
- [ ] T031 [US3] 更新 `docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md` 对齐新编码层级与降级策略
- [ ] T032 [US3] 更新 `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md` 对齐 runtime-scoped 锚点与导出口径
- [ ] T033 [US3] 更新 `docs/ssot/runtime/logix-core/observability/09-debugging.03-effectop-bridge.md` 说明 runtime-scoped 聚合替代全局单例语义

**Checkpoint**: 异步重投影按需生效，降级行为稳定可解释，SSoT 与实现口径一致

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收口迁移说明、质量门、证据与文档一致性

- [ ] T034 [P] 汇总迁移说明并固化到 `specs/097-runtime-scoped-observability/quickstart.md`
- [ ] T035 [P] 更新 `specs/097-runtime-scoped-observability/research.md` 记录最终方案取舍与替代方案
- [ ] T036 执行并记录质量门结果（`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`）到 `specs/097-runtime-scoped-observability/research.md`
- [ ] T037 执行并记录性能证据闭环（before/after/diff）到 `specs/097-runtime-scoped-observability/perf/`
- [ ] T038 校验 spec/plan/tasks/SSoT 一致性并在 `specs/097-runtime-scoped-observability/research.md` 写入验收结论

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → 无依赖，可立即开始。
- Phase 2 → 依赖 Phase 1；完成前阻塞所有用户故事阶段。
- Phase 3/4/5 → 依赖 Phase 2；按 P1→P2→P3 推进，允许部分并行。
- Phase 6 → 依赖 Phase 3/4/5 完成。

### User Story Dependencies

- US1 (P1) 为 MVP，优先落地性能与主链剥离。
- US2 (P2) 依赖 US1 的 envelope 主链语义稳定后实施隔离治理。
- US3 (P3) 依赖 US1/US2 的基础锚点与隔离语义后完成按需重投影与文档对齐。

### Parallel Opportunities

- T002/T003/T004 可并行。
- T006/T007/T008/T009 可并行。
- US1: T011 与 T012 可并行；T015 与 T016 可并行。
- US2: T020 与 T021 可并行。
- US3: T027 与 T028 可并行；T031/T032/T033 可并行。
- Phase 6: T034 与 T035 可并行。

## Implementation Strategy

### MVP First (US1)

1. 完成 Phase 1 + Phase 2。  
2. 完成 US1（T011-T019）。  
3. 用性能 diff 验证“诊断开启下主链显著降耗”达标后再进入 US2。

### Incremental Delivery

1. 先交付主链降耗（US1）。
2. 再交付多 runtime 隔离（US2）。
3. 最后交付按需重投影与文档回写（US3）。

### Validation Rule

- 每个用户故事完成时必须具备：对应测试 + 证据/日志 + 文档或契约更新。
