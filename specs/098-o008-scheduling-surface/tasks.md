# Tasks: 098 O-008 调度平面统一（Scheduling Surface）

**Input**: Design documents from `specs/098-o008-scheduling-surface/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: 本任务触及 runtime 核心路径，测试与性能证据为强制项。
**Organization**: 按 User Story 分组，确保可独立验证。

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 盘点现有调度语义与事件字段落点于 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`、`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`、`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- [x] T002 [P] 新增 O-008 契约草案并锁定字段语义于 `specs/098-o008-scheduling-surface/contracts/scheduling-policy-surface.schema.json` 与 `specs/098-o008-scheduling-surface/contracts/scheduling-diagnostic-event.schema.json`
- [x] T003 [P] 建立 O-008 实施检查清单并同步 `specs/098-o008-scheduling-surface/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts` 定义统一 scheduling policy surface snapshot（含 scope 与阈值语义）
- [x] T005 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 接线统一策略解析入口，并确保窗口级快照可被 queue/tick 共享
- [x] T006 [P] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts` 改为消费统一快照，移除重复解析路径
- [x] T007 [P] 在 `packages/logix-core/src/internal/runtime/core/TickScheduler.ts` 接入统一快照，保证退化决策与 queue/concurrency 同源
- [x] T008 在 `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts` 统一 backlog/degrade/recover 事件语义与 reason 映射

**Checkpoint**: 完成后可进入各 User Story 实现与验证。

---

## Phase 3: User Story 1 - 单一调度策略面（Priority: P1）

**Goal**: queue/tick/concurrency 在同一窗口使用同一策略快照。
**Traceability**: NS-9, KF-5
**Independent Test**: 统一策略一致性测试通过。

### Tests for User Story 1

- [x] T009 [P] [US1] 新增统一策略一致性测试于 `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.SchedulingSurface.test.ts`
- [x] T010 [P] [US1] 扩展事务队列覆盖测试于 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts` 验证窗口内同源快照

### Implementation for User Story 1

- [x] T011 [US1] 实现 queue/tick/concurrency 同源快照传递链路于 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T012 [US1] 校正 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts` 的 backlog 槽位获取与策略读取顺序
- [x] T013 [US1] 校正 `packages/logix-core/src/internal/runtime/core/TickScheduler.ts` 的退化判断与策略快照绑定

---

## Phase 4: User Story 2 - backlog/degrade 语义与行为对齐（Priority: P1）

**Goal**: backlog/degrade/recover 事件与真实调度行为一一对应。
**Traceability**: NS-10, KF-8
**Independent Test**: 压力场景下事件-行为对齐测试全部通过。

### Tests for User Story 2

- [x] T014 [P] [US2] 扩展退化诊断测试于 `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts` 覆盖 reason 与 boundary 对齐
- [x] T015 [P] [US2] 扩展压力预警测试于 `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts` 覆盖 backlog/recover 语义
- [x] T016 [P] [US2] 新增 tick 关联回归于 `packages/logix-core/test/internal/Runtime/TickScheduler.correlation.test.ts` 验证事件与调度轨迹一一对应

### Implementation for User Story 2

- [x] T017 [US2] 在 `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts` 统一事件结构、cooldown 与 suppressed 计数语义
- [x] T018 [US2] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts` 补齐 backlog 触发/恢复时机的事件发射约束
- [x] T019 [US2] 在 `packages/logix-core/src/internal/runtime/core/TickScheduler.ts` 对齐 degrade/recover 触发条件与 reason 归一化

---

## Phase 5: User Story 3 - 调优与迁移可交接（Priority: P2）

**Goal**: 提供统一配置心智模型、迁移说明与性能证据闭环。
**Traceability**: NS-9, NS-10, KF-5, KF-8
**Independent Test**: 按 quickstart 能复现迁移与诊断调优。

### Tests for User Story 3

- [x] T020 [P] [US3] 运行 quickstart 中的最小验收命令并记录结果于 `specs/098-o008-scheduling-surface/quickstart.md`
- [x] T021 [P] [US3] 采集 before/after 性能证据并落盘 `specs/098-o008-scheduling-surface/perf/*.json`

### Implementation for User Story 3

- [x] T022 [US3] 更新中文用户文档于 `apps/docs/content/docs/guide/advanced/concurrency-policy.cn.md` 说明统一 scheduling surface 与迁移路径
- [x] T023 [US3] 更新 runtime 诊断文档于 `docs/ssot/runtime/logix-core/observability/09-debugging.md` 对齐 backlog/degrade 事件语义
- [x] T024 [US3] 补齐 PR migration note（无兼容层）并同步 `specs/098-o008-scheduling-surface/quickstart.md`
- [x] T029 [US3] 固化 runtime 实现备忘到 `docs/ssot/runtime/logix-core/impl/README.md`（记录 scheduling surface 最终约束与易漂移细节）
- [x] T030 [US3] 如涉及平台侧约束，同步 `docs/specs/sdd-platform/impl/README.md`

---

## Phase 6: Polish & Cross-Cutting

- [x] T025 [P] 运行 `pnpm typecheck`
- [x] T026 [P] 运行 `pnpm lint`
- [x] T027 [P] 运行 `pnpm test:turbo`
- [x] T028 汇总改动、测试结果与 review 反馈到 PR 描述

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为硬依赖。
- Phase 3/4 依赖 Phase 2 完成；可交错推进，但同文件任务需串行。
- Phase 5 依赖 Phase 3/4 主要代码稳定。
- Phase 6 在所有实现与文档任务完成后执行。

## Implementation Strategy

- 先打通 US1 的同源策略面（MVP）。
- 再完成 US2 事件语义对齐，确保核心验收（backlog/degrade 对齐）。
- 最后落 US3 文档迁移与性能证据，形成可交接闭环。
