# Tasks: O-009 ReadQuery 严格门禁前移到构建期

**Input**: Design documents from `specs/099-o009-readquery-build-gate/`  
**Prerequisites**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/*`

**Tests**: 本特性触及 `packages/logix-core` 热路径，测试与性能/诊断回归防线为必选项。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 O-009 所需的最小骨架与落点。

- [x] T001 建立 O-009 产物目录与合同文档引用一致性（`specs/099-o009-readquery-build-gate/*`）
- [x] T002 [P] 增补 ReadQuery 构建门禁模块骨架（`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`）
- [x] T003 [P] 增补 ReadQuery 测试文件骨架（`packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`、`packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 固化可复用的数据结构与契约，阻断后续实现漂移。

- [x] T004 定义构建期报告数据结构与导出类型（`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`）
- [x] T005 [P] 提供 strict gate 构建期评估函数（`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`）
- [x] T006 [P] 统一 fallbackReason 与 rule 枚举口径，避免 build/runtime 双字典（`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`）
- [x] T007 设计运行时消费上下文结构（build/runtime_jit/runtime_dynamic_fallback）并声明证据字段（`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`）
- [x] T008 [P] 增补基础类型回归测试（结构可序列化、枚举冻结）`packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`

**Checkpoint**: Foundational 完成后再进入用户故事实现。

---

## Phase 3: User Story 1 - 构建期产出 selector 质量报告与静态约束 (Priority: P1) 🎯 MVP

**Goal**: 在构建期完成 selector 定级与 strict gate 判定。

**Traceability**: NS-3, KF-3

**Independent Test**: 执行 build-gate 单测可验证 PASS/WARN/FAIL 与结构化输出。

### Tests for User Story 1

- [x] T009 [P] [US1] 增加构建期 PASS/WARN/FAIL 判定测试（`packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`）
- [x] T010 [P] [US1] 增加构建报告可序列化与稳定字段测试（`packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`）

### Implementation for User Story 1

- [x] T011 [US1] 实现 selector 质量条目生成（`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`）
- [x] T012 [US1] 实现构建期 strict gate 决策并复用既有诊断细节结构（`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`、`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`）
- [x] T013 [US1] 在 ReadQuery 编译输出中接入构建定级元数据（`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`）

**Checkpoint**: 构建期报告链路可独立通过测试。

---

## Phase 4: User Story 2 - 运行时仅消费已定级 selector，简化热路径 (Priority: P1)

**Goal**: 运行时优先消费定级结果，减少 strict gate 热路径分支。

**Traceability**: NS-10, KF-8

**Independent Test**: runtime-consumption 单测验证已定级路径不再重复判定且行为等价。

### Tests for User Story 2

- [x] T014 [P] [US2] 增加“已定级 selector 不重复 strict gate 判定”测试（`packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`）
- [x] T015 [P] [US2] 增加“未定级 selector 显式降级 + 稳定 fallbackReason”测试（`packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`）
- [x] T016 [P] [US2] 更新既有 strict gate 测试以覆盖新消费模式（`packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`）

### Implementation for User Story 2

- [x] T017 [US2] 改造 `changesReadQueryWithMeta`：优先消费 build-grade 结果（`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`）
- [x] T018 [US2] 为未定级 selector 增加受控降级记录（`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`、`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`）
- [x] T019 [US2] 精简运行时 strict gate 判定路径并保留 fail-fast 兜底（`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`）

**Checkpoint**: 运行时消费路径简化且行为等价。

---

## Phase 5: User Story 3 - 诊断链路/IR 对齐与迁移可落地 (Priority: P2)

**Goal**: 保证构建报告与运行时 trace 锚点一致，并提供迁移说明。

**Traceability**: NS-3, NS-10, KF-3, KF-8

**Independent Test**: 诊断事件与迁移文档可单独验证。

### Tests for User Story 3

- [x] T020 [P] [US3] 增加构建报告与运行时锚点字段一致性测试（`packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`）
- [x] T021 [P] [US3] 增加诊断事件 Slim 可序列化回归测试（`packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`）

### Implementation for User Story 3

- [x] T022 [US3] 统一 build/runtime 诊断事件字段与代码路径（`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`）
- [x] T023 [US3] 同步 runtime 中文文档与心智模型（`docs/ssot/runtime/logix-core/impl/04-watcher-performance-and-flow.01-dispatch-to-handler.md`）
- [x] T024 [US3] 更新迁移说明文档（`specs/099-o009-readquery-build-gate/contracts/migration.md`）

**Checkpoint**: 诊断链路可解释且迁移路径清晰。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收尾、证据、质量门、PR 交付。

- [x] T025 [P] 补充 `ReadQuery.compile` 回归测试（构建门禁元数据不破坏既有行为）`packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
- [x] T026 [P] 更新 `specs/099-o009-readquery-build-gate/quickstart.md` 里的实际命令与文件名
- [x] T027 [P] 采集 O-009 性能证据（before/after/diff）`specs/099-o009-readquery-build-gate/perf/*`
- [x] T028 执行质量门：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`
- [x] T029 提交 PR 并回填 spec 任务状态与说明（`specs/099-o009-readquery-build-gate/tasks.md`、PR 描述）
- [x] T030 处理 review bot 建议：采纳后补充二次提交并更新迁移/证据结论

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1/US2/US3 → Phase 6。
- US2 依赖 US1 的构建期产物类型；US3 依赖 US1+US2 的字段稳定性。
- T027 必须在核心实现稳定后执行；T028 在所有代码与文档改动完成后执行。

## Parallel Opportunities

- T002/T003、T005/T006、T009/T010、T014/T015/T016、T020/T021、T025/T026/T027 可并行。

## Implementation Strategy

1. 先打通 US1（构建期报告与门禁），确保有可审计产物。
2. 再推进 US2（运行时消费简化）并确保行为等价。
3. 最后完成 US3（诊断/文档/迁移），再统一跑质量门与 PR 流程。
