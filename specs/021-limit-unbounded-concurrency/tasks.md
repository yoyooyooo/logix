---
description: 'Task list for 021-limit-unbounded-concurrency'
---

# Tasks: 021-limit-unbounded-concurrency（并发护栏与预警：限制无上限并发）

**Input**: Design documents from `specs/021-limit-unbounded-concurrency/`
**Prerequisites**: `specs/021-limit-unbounded-concurrency/plan.md`, `specs/021-limit-unbounded-concurrency/spec.md`

**Tests**: 本特性触及 `packages/logix-core` 热路径与诊断协议，测试与回归防线视为必需（含性能基线与诊断字段验证）。

**Organization**: 任务按 User Story 分组，确保每个故事可独立实现与独立验收。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为基线证据与 contracts 校验准备“可复现产物目录 + runner”。

- [x] T001 创建 021 性能产物目录与说明：`specs/021-limit-unbounded-concurrency/perf/README.md`, `specs/021-limit-unbounded-concurrency/perf/.gitkeep`, `specs/021-limit-unbounded-concurrency/perf.md`
- [x] T002 [P] 增加 021 的 perf 命令别名（薄封装 014 collect/diff，默认输出到本特性目录）：`package.json`
- [x] T003 [P] 增加 contracts 预检测试（至少验证 schemas JSON 可解析）：`packages/logix-core/test/Contracts.021.LimitUnboundedConcurrency.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 打通“并发控制面（runtime_default/runtime_module/provider）+ configScope + 统一诊断载荷”的共同底座。

**⚠️ CRITICAL**: 完成本阶段后，US1/US2/US3 才能并行推进。

- [x] T004 定义 `ConcurrencyPolicy/ConcurrencyPolicyPatch` 与 Tags（runtime_default + provider overrides）：`packages/logix-core/src/internal/runtime/core/env.ts`
- [x] T005 扩展 Runtime 公共入口：新增 `RuntimeOptions.concurrencyPolicy` + `concurrencyPolicyOverridesLayer`：`packages/logix-core/src/Runtime.ts`
- [x] T006 实现 `setConcurrencyPolicyOverride(runtime, moduleId, patch)`（runtime_module 热切换，下一笔事务生效）：`packages/logix-core/src/Runtime.ts`
- [x] T007 实现 `makeResolveConcurrencyPolicy`（合并优先级 `provider > runtime_module > runtime_default > builtin`，并产出 `configScope`）：`packages/logix-core/src/internal/runtime/ModuleRuntime.concurrencyPolicy.ts`
- [x] T008 在 ModuleRuntime 初始化时创建 `resolveConcurrencyPolicy`（供 Flow/Task/dispatch 使用，并确保 provider overrides 在调用点生效）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 默认安全的并行 watcher（Priority: P1）🎯 MVP

**Goal**: 并行 watcher 默认有上限并发（16），并在持续饱和/积压时给出可定位预警；业务通道必达且内部积压有界，背压等待不进入事务窗口。

**Independent Test**: 构造高频触发 + 慢处理的最小模块：验证 in-flight ≤ 16、触发 `concurrency::pressure`（含 `configScope`）、并在持续过载时通过背压变慢但不丢事件且不无限堆内存。

### Tests for User Story 1

- [x] T009 [P] [US1] Flow 并发上限回归：验证 `runParallel` 默认 in-flight ≤ 16：`packages/logix-core/test/ConcurrencyPolicy.FlowRuntimeBounded.test.ts`
- [x] T010 [P] [US1] TaskRunner 并发上限回归：验证 `runParallelTask/runExhaustTask` 默认 in-flight ≤ 16：`packages/logix-core/test/ConcurrencyPolicy.TaskRunnerBounded.test.ts`
- [x] T011 [P] [US1] lossless 背压回归：过载下 `dispatch` 不丢且入口可观察变慢（等待不在事务窗口内）：`packages/logix-core/test/ConcurrencyPolicy.LosslessBackpressure.test.ts`
- [x] T012 [P] [US1] 压力预警回归：过载达到阈值后 1s 内产出 `concurrency::pressure`（`trigger.details` 含 `configScope/limit`）：`packages/logix-core/test/ConcurrencyPolicy.PressureWarning.test.ts`
- [x] T013 [P] [US1] 模块销毁收敛回归：`ModuleRuntime` destroy 时会中断 in-flight 并行 fiber，避免“幽灵写回/泄漏”：`packages/logix-core/test/ConcurrencyPolicy.ModuleDestroyCancelsInFlight.test.ts`
- [x] T014 [P] [US1] 嵌套并发回归：并行 watcher 内再触发并行 fan-out 时仍遵守并发上限且诊断可定位：`packages/logix-core/test/ConcurrencyPolicy.NestedConcurrency.test.ts`
- [x] T015 [P] [US1] 多模块压力回归：两模块并发高负载下不应出现明显饥饿（进度与诊断按 moduleId/instanceId 可区分）：`packages/logix-core/test/ConcurrencyPolicy.MultiModuleStarvation.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Flow：将 `runParallel` 默认并发从 `unbounded` 收敛为 `concurrencyLimit`（默认 16）：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
- [x] T017 [US1] TaskRunner：将 `parallel/exhaust` 默认并发从 `unbounded` 收敛为 `concurrencyLimit`（默认 16）：`packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- [x] T018 [US1] 业务通道背压：将 action publish 从事务窗口内剥离到事务之外，并保证 publish 为必达/可背压：`packages/logix-core/src/internal/runtime/ModuleRuntime.dispatch.ts`
- [x] T019 [US1] 为必达通道引入 `losslessBackpressureCapacity`（默认 4096，可覆盖），并确保等待不发生在 `inSyncTransactionFiber` 内：`packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`
- [x] T020 [US1] 预警诊断：实现 `concurrency::pressure`（实例作用域内冷却窗口合并，details 符合 contracts），并在 Flow/Task/dispatch 过载点调用：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- [x] T021 [US1] 错误不静默：并行 watcher/task 未处理失败转为可定位 diagnostic（含 trigger/name/moduleId/instanceId）：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`, `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`

**Checkpoint**: User Story 1 should be functional and independently testable

---

## Phase 4: User Story 2 - 显式启用无上限并发（Priority: P2）

**Goal**: 开发者显式启用 `concurrencyLimit=\"unbounded\"` 时，系统允许该模式并产出一次高严重度风险提示（可审计、可定位）。

**Independent Test**: 在最小模块中启用无上限并发，验证产生一次 `concurrency::unbounded_enabled`（severity=error）且包含 `configScope` 与触发源信息。

### Tests for User Story 2

- [x] T022 [P] [US2] unbounded opt-in 回归：启用后产出一次 `concurrency::unbounded_enabled` 且可定位到模块/触发源：`packages/logix-core/test/ConcurrencyPolicy.UnboundedOptIn.test.ts`
- [x] T023 [P] [US2] 拒绝隐式 unbounded：当 `allowUnbounded=false` 时 `concurrencyLimit=\"unbounded\"` 必须回退为 bounded 并给出 diagnostic：`packages/logix-core/test/ConcurrencyPolicy.UnboundedRequiresOptIn.test.ts`

### Implementation for User Story 2

- [x] T024 [US2] 在 policy resolver 中强制“unbounded 需 allowUnbounded=true”（否则回退并标注来源 scope）：`packages/logix-core/src/internal/runtime/ModuleRuntime.concurrencyPolicy.ts`
- [x] T025 [US2] 在首次解析到 effective unbounded 时输出一次高严重度诊断 `concurrency::unbounded_enabled`（含风险说明/替代建议/trigger.details）：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 可观测与调优闭环（Priority: P3）

**Goal**: 通过统一诊断信号回答“是否失控/瓶颈在哪/如何调优”，并保证诊断通道可降级且可解释（不反向拖垮业务）。

**Independent Test**: 在可复现压力用例中，验证 `concurrency::pressure` 的载荷 slim 且可 JSON 序列化，并能指导一次可执行调优动作（调整上限/改触发策略/拆分任务）。

### Tests for User Story 3

- [x] T026 [P] [US3] 诊断载荷 contracts 对齐：`trigger.details` 满足 `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json` 的 required 字段与 JSON 可序列化：`packages/logix-core/test/Contracts.021.LimitUnboundedConcurrency.test.ts`
- [x] T027 [P] [US3] 降噪/降级可解释：冷却窗口内重复预警会合并并携带 `degradeStrategy/suppressedCount`：`packages/logix-core/test/ConcurrencyPolicy.DiagnosticsDegrade.test.ts`

### Implementation for User Story 3

- [x] T028 [US3] 完善 `concurrency::pressure` 的可解释字段（`degradeStrategy/suppressedCount/sampleRate/droppedCount`），并实现冷却窗口合并策略：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- [x] T029 [US3] 将并发控制面写入用户文档并接入导航（明确字段名与默认值：`concurrencyLimit=16`、`losslessBackpressureCapacity=4096`、`pressureWarningThreshold={ backlogCount:1000, backlogDurationMs:5000 }`、`warningCooldownMs=30000`；解释 `configScope=builtin/runtime_default/runtime_module/provider`；补充 cost model/optimization ladder/迁移说明）：`apps/docs/content/docs/guide/advanced/concurrency-policy.md`, `apps/docs/content/docs/guide/advanced/meta.json`
- [x] T030 [P] [US3] 同步 runtime SSoT（新增诊断 code 与 payload 口径）：`docs/ssot/runtime/logix-core/observability/09-debugging.md`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T031 [P] 暴露/对齐公共 API 与内部契约（必要时补充导出与内部 contracts 测试）：`packages/logix-core/src/index.ts`
- [x] T032 将 quickstart 的验证步骤与最终 API 对齐（配置入口/诊断 code/调优梯子）：`specs/021-limit-unbounded-concurrency/quickstart.md`
- [x] T033 记录质量门结论（typecheck/lint/test）到交接材料：`specs/021-limit-unbounded-concurrency/perf.md`
- [x] T034 采集性能证据（Before/After + diff，diagnostics off ≤2%，产物落盘到 `specs/021-limit-unbounded-concurrency/perf/`）：`pnpm perf collect`, `pnpm perf diff`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1; BLOCKS all user stories
- **US1/US2/US3 (Phase 3–5)**: Depend on Phase 2
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies (Graph)

```text
US1 (P1) ──▶ US2 (P2) ──▶ US3 (P3)
```

说明：US2/US3 复用 US1 的并发默认语义与诊断通道；US3 的文档与降级策略需要以最终代码/字段为准。

---

## Parallel Examples

### Parallel Example: US1

```bash
Task: "T009 [US1] packages/logix-core/test/ConcurrencyPolicy.FlowRuntimeBounded.test.ts"
Task: "T010 [US1] packages/logix-core/test/ConcurrencyPolicy.TaskRunnerBounded.test.ts"
Task: "T018 [US1] packages/logix-core/src/internal/runtime/ModuleRuntime.dispatch.ts"
```

### Parallel Example: US3

```bash
Task: "T029 [US3] apps/docs/content/docs/guide/advanced/concurrency-policy.md"
Task: "T030 [US3] docs/ssot/runtime/logix-core/observability/09-debugging.md"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1–2 先打通控制面合并与 `configScope`（为所有入口统一裁决）
2. 完成 US1：bounded 默认 + lossless 背压 + `concurrency::pressure` 预警闭环
3. 验收后再进入 US2（unbounded opt-in）与 US3（可解释降级与文档）
