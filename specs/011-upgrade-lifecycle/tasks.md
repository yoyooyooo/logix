---
description: "Task list for 011-upgrade-lifecycle implementation"
---

# Tasks: 011 Lifecycle 全面升级

**Input**: `specs/011-upgrade-lifecycle/{spec.md,plan.md,research.md,data-model.md,contracts/*,quickstart.md,perf.md}`

**Note**:

- 本 `tasks.md` 覆盖 011 的“生命周期语义/错误语义/平台信号/可诊断性”实现与扫尾；涉及“可导出 debug 事件的 JsonValue/错误摘要/单锚点（instanceId）”等横切整改时，需要与 `specs/016-serializable-diagnostics-and-identity/*` 保持一致（如有冲突，以 016 的裁决源与 contracts 为准）。
- 对 `packages/logix-*` 与 runtime 核心路径的改动，测试与性能/诊断回归防线默认视为必需（除非 spec 明确说明可省略）。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**：可并行（不同文件/无未完成依赖）
- **[US]**：仅在用户故事 Phase 中出现（`[US1]`…`[US6]`）
- 每条任务必须包含至少一个明确文件路径

---

## Phase 1: Setup（Docs-first + Contracts/Perf 复核）

**Purpose**: 先把“目标语义/裁决源/验收口径”固化到 SSoT/文档与 contracts，避免实现跑偏

- [X] T001 更新 Runtime SSoT：生命周期语义（initRequired vs start、destroy LIFO、setup-only、可等待获取）在 `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`
- [X] T002 [P] 更新 Bound API SSoT：`$.lifecycle.*` 的 setup/run 边界、错误分层提示与反例在 `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md`
- [X] T003 [P] 更新 Debug/诊断 SSoT：lifecycle 事件位、错误摘要与预算（≤20 events/instance、≤4KB/event）在 `docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [X] T004 [P] 复核 contracts 与 data-model 一致性（identity/status/outcome/error）：`specs/011-upgrade-lifecycle/contracts/schemas/*.schema.json` 与 `specs/011-upgrade-lifecycle/data-model.md`
- [X] T005 [P] 对齐 quickstart 的“目标语义示例”到 tasks 产出（setup-only 写法、错误分层、可等待获取）在 `specs/011-upgrade-lifecycle/quickstart.md`
- [X] T006 [P] 复核 perf 口径与脚手架（create/init/destroy、off vs on budget）在 `pnpm perf bench:011:lifecycle` 与 `specs/011-upgrade-lifecycle/perf.md`

---

## Phase 2: Foundational（Core Primitives, Blocking Prerequisites）

**Purpose**: 为所有 User Story 提供共同的 runtime 基座（生命周期注册/调度、状态门禁、错误上下文）

**⚠️ CRITICAL**: 本阶段未完成前不得开始任何 React/Docs/Examples 的交付面工作（避免语义漂移）

- [X] T007 定义生命周期任务模型与状态（initRequired/start/destroy/platform、initProgress、budgets）在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- [X] T008 [P] 定义可序列化 LifecycleErrorContext（phase/hook/moduleId/instanceId/txnSeq/opSeq/taskId）并对齐 contracts 在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- [X] T009 调整 `ModuleRuntime` 公共形状：暴露 `instanceId` 与初始化状态（并支持可等待获取/门禁）在 `packages/logix-core/src/internal/runtime/core/module.ts`
- [X] T010 将 `ModuleRuntime.make` 接入生命周期门禁：setup → runInitRequired(blocking) → fork run fibers → start tasks（non-blocking）→ finalizer(destroy LIFO) 在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T011 [P] 统一生命周期事件记录入口（phase/error/diagnostic）：补齐事件名与最小 payload（可序列化且受预算）在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T012 [P] 调整 LogicPhaseError 诊断：补齐 setup-only 的违规 kind（lifecycle_in_run 等）与更可行动 hint 在 `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`
- [X] T013 为 lifecycle/门禁/错误链路新增测试夹具（最小模块、可控失败、可控中断）在 `packages/logix-core/test/fixtures/lifecycle.ts`

**Checkpoint**: lifecycle primitives ready（类型+最小实现+测试夹具齐全）→ 可进入 P1 用户故事

---

## Phase 3: User Story 5 - `$.lifecycle` 仅允许在 setup 注册 (Priority: P1)

**Goal**: `$.lifecycle.*` 固化为 setup-only 注册 API；run 段调用必须拒绝并给出 `logic::invalid_phase` 诊断，但不得改变既有注册结果或终止实例

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 5 Independent Test

### Tests for User Story 5

- [X] T014 [P] [US5] 新增单测：run 段调用 `$.lifecycle.*` 触发 `logic::invalid_phase` 且不改变注册集合在 `packages/logix-core/test/Lifecycle.PhaseGuard.test.ts`
- [X] T015 [P] [US5] 新增单测：run 段用 `Effect.acquireRelease` / Scope finalizer 做动态资源清理不依赖 late onDestroy 在 `packages/logix-core/test/Lifecycle.DynamicResource.test.ts`

### Implementation for User Story 5

- [X] T016 [US5] 反转 phase guard：`$.lifecycle.*` 改为 setup-only（run 段调用拒绝并发诊断）在 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T017 [US5] 生命周期注册从“调用点执行”改为“注册到 LifecycleManager”（调用返回值允许丢弃）在 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [X] T018 [P] [US5] 迁移 Query：消灭 run 段 `yield* $.lifecycle.*`，改为 setup-only 注册写法在 `packages/logix-query/src/logics/auto-trigger.ts`
- [X] T019 [P] [US5] 迁移 Form：消灭 run 段 `yield* $.lifecycle.*`，改为 setup-only 注册写法在 `packages/logix-form/src/logics/install.ts`
- [X] T020 [P] [US5] 迁移 Devtools 逻辑：消灭 run 段 `yield* $.lifecycle.*`，改为 setup-only 注册写法在 `packages/logix-devtools-react/src/state/logic.ts`
- [X] T021 [P] [US5] 迁移示例：setup-only 注册写法在 `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx` 与 `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- [X] T022 [P] [US5] 迁移用户文档示例：消灭 run 段 `yield* $.lifecycle.*` 与不存在的 `$.lifecycle.onReady`，统一为 setup-only 注册写法；并对齐 Suspense 默认语义（`useModule` 默认同步，只有 `suspend:true + key` 才会挂起）在 `apps/docs/content/docs/api/core/bound-api.md`、`apps/docs/content/docs/guide/essentials/lifecycle.md`、`apps/docs/content/docs/guide/get-started/tutorial-complex-list.md`、`apps/docs/content/docs/guide/learn/lifecycle-and-watchers.md`、`apps/docs/content/docs/guide/learn/deep-dive.md`、`apps/docs/content/docs/guide/advanced/error-handling.md` 与 `apps/docs/content/docs/guide/advanced/suspense-and-async.md`

**Checkpoint**: 任何 lifecycle 注册在 run 段都不会生效且会有可行动诊断；现存用例已迁移可编译/可跑

---

## Phase 4: User Story 1 - 声明式模块生命周期 (Priority: P1) 🎯 MVP

**Goal**: 模块内声明 initRequired/start/destroy/onError；必需初始化门禁一致、失败可观测；destroy LIFO 且 exactly-once

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 1 Independent Test

### Tests for User Story 1

- [X] T023 [P] [US1] 新增单测：必需初始化串行 + blocking gate（可等待获取）+ 失败可观测在 `packages/logix-core/test/ModuleRuntime.InitGate.test.ts`
- [X] T024 [P] [US1] 新增单测：destroy LIFO + exactly-once（正常终止/错误终止/中途终止）在 `packages/logix-core/test/ModuleRuntime.DestroyLifo.test.ts`

### Implementation for User Story 1

- [X] T025 [US1] 历史实现：曾扩展 Bound API 新增 public lifecycle authoring；该 public spelling 已由 `../170-runtime-lifecycle-authoring-surface/spec.md` 移除，当前 readiness 使用 `$.readyAfter(...)`
- [X] T026 [US1] 在 LifecycleManager 中实现 initRequired 队列（串行执行、失败即失败）与 start 队列（non-blocking，失败上报）在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- [X] T027 [US1] 在 ModuleRuntime 中实现可等待获取：初始化完成前不对外暴露可用实例（或暴露 status 但禁止业务读写）在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T028 [US1] 统一销毁执行：destroy tasks LIFO + best-effort（失败只记录不阻塞）在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- [X] T029 [US1] 初始化失败路径：触发 runtime-owned lifecycle:error / diagnostics 事件，并使“该次初始化”对消费方呈现为失败；public per-logic error hook 已由 170 移除

**Checkpoint**: 仅实现 US1 即可独立验收（门禁/顺序/失败/销毁均符合 spec）

---

## Phase 5: User Story 4 - 错误处理模式清晰分层（全局 → 模块 → 局部）(Priority: P1)

**Goal**: 明确错误分类与默认策略；预期错误/取消不污染未处理错误链路；未处理缺陷能走模块兜底与全局上报

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 4 Independent Test

### Tests for User Story 4

- [X] T030 [P] [US4] 新增单测：预期错误被局部捕获后不触发 lifecycle:error / onError 在 `packages/logix-core/test/ErrorHandling.ExpectedError.test.ts`
- [X] T031 [P] [US4] 新增单测：取消/中断不当作错误上报（不触发 onError、不产高严重诊断）在 `packages/logix-core/test/ErrorHandling.Interrupt.test.ts`
- [X] T032 [P] [US4] 新增单测：装配失败（缺 provider）错误信息稳定且可修复（含 token/位置/建议）在 `packages/logix-core/test/ErrorHandling.AssemblyFailure.test.ts`

### Implementation for User Story 4

- [X] T033 [US4] 在 lifecycle/logic failure 处理链路中区分 defect vs interrupt（interrupt 不上报为 error）在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T034 [US4] 固化错误分类（expected/defect/assembly/interrupt/diagnostic）与默认处理策略，并同步诊断事件 code/严重级别在 `packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts`
- [X] T035 [US4] 更新内部规范：错误处理三层模型与反例（全局/模块/局部）在 `docs/ssot/runtime/logix-core/runtime/11-error-handling.md`
- [X] T036 [US4] 更新用户文档：错误处理指南与可达性（≤2 次跳转）在 `apps/docs/content/docs/guide/advanced/error-handling.md`

**Checkpoint**: 四类场景（预期错误/缺陷/取消/装配失败）对外语义一致且可解释，文档可直接指导接线

---

## Phase 6: User Story 2 - 平台信号与会话语义解耦 (Priority: P2)

**Goal**: 支持 suspend/resume/reset 信号，不终止实例；未注册处理器时安全忽略且无高噪音错误

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 2 Independent Test

### Tests for User Story 2

- [X] T037 [P] [US2] 新增单测：平台信号触发已注册处理器且不改变实例可用性在 `packages/logix-core/test/PlatformSignals.test.ts`
- [X] T038 [P] [US2] 新增单测：未注册信号处理器时安全 no-op（不抛错/不终止/不产 error 噪音）在 `packages/logix-core/test/PlatformSignals.NoHandler.test.ts`

### Implementation for User Story 2

- [X] T039 [US2] 扩展 Platform.Service：提供可测试的信号广播入口（emitSuspend/emitResume/emitReset 或等价）并保持默认实现安全 no-op 在 `packages/logix-core/src/internal/runtime/core/Platform.ts` 与 `packages/logix-core/src/Platform.ts`
- [X] T040 [US2] 生命周期平台注册与调度：按实例维度注册 handler，并在信号触发时以 non-fatal 策略运行（失败上报但默认不终止）在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`

**Checkpoint**: 平台信号与销毁语义解耦；信号处理失败不默认终止实例且可诊断

---

## Phase 7: User Story 6 - React RuntimeProvider 的错误上报桥 (Priority: P2)

**Goal**: `RuntimeProvider.onError` 既能上报 layer 构建失败，也能监听模块未处理失败；嵌套 Provider 行为可预测且不退化 ModuleCache

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 6 Independent Test

### Tests for User Story 6

- [X] T041 [P] [US6] 新增集成测试：layer 构建失败触发 onError（provider.layer.build）且应用不崩溃在 `packages/logix-react/test/integration/runtimeProviderOnError.test.tsx`
- [X] T042 [P] [US6] 新增集成测试：lifecycle:error / error 级 diagnostic 触发 onError（含 `moduleId + instanceId`）在 `packages/logix-react/test/integration/runtimeProviderOnErrorLifecycle.test.tsx`
- [X] T043 [P] [US6] 新增集成测试：嵌套 Provider onError 触发顺序/覆盖策略可预测且不破坏 ModuleCache 复用在 `packages/logix-react/test/integration/runtimeProviderNestedOnError.test.tsx`

### Implementation for User Story 6

- [X] T044 [US6] 升级 onError context：以 `instanceId` 为主锚点在 `packages/logix-react/src/components/RuntimeProvider.tsx`
- [X] T045 [US6] 对齐 DebugSink 生命周期错误事件：`lifecycle:error` 必含 `moduleId + instanceId` 且可关联在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

**Checkpoint**: React 上报桥可复用且不污染错误语义；嵌套 Provider 行为明确

---

## Phase 8: User Story 3 - 生命周期可诊断、可解释 (Priority: P3)

**Goal**: 初始化失败/后台崩溃/销毁失败都能产出结构化且可序列化的诊断事件；initProgress 可观察并与实例锚点关联

**Independent Test**: `specs/011-upgrade-lifecycle/spec.md` 的 User Story 3 Independent Test

### Tests for User Story 3

- [X] T046 [P] [US3] 新增单测：三类失败场景都产出 lifecycle 结构化事件且 `JSON.stringify` 不失败在 `packages/logix-core/test/Lifecycle.DiagnosticsSerialization.test.ts`
- [X] T047 [P] [US3] 新增单测：初始化进行中时可读取 `initProgress`（总数/已完成/当前序号/开始时间或耗时）在 `packages/logix-core/test/Lifecycle.InitProgress.test.ts`

### Implementation for User Story 3

- [X] T048 [US3] 实现 `LifecycleStatus.initProgress`：在 initRequired 执行期间持续更新可序列化摘要并暴露给 Devtools/Debug 在 `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- [X] T049 [US3] 补齐 lifecycle 事件位：init/start/destroy/平台信号的 phase 事件与错误事件（含 phase/hook/identity）在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

**Checkpoint**: 开发者可不查源码定位“哪个实例/哪个阶段/为何失败”，且事件预算可守住

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 消除规范/实现/示例/用户文档漂移，并补齐回归防线

- [X] T050 [P] 文档扫尾：将 quickstart 的目标语义示例替换为可运行示例或明确标注并链接在 `specs/011-upgrade-lifecycle/quickstart.md`
- [X] T051 [P] 更新可运行示例：新增/调整 ≥1 个场景覆盖 init gate + start task + destroy + onError 在 `examples/logix/src/scenarios/lifecycle-gate.ts`
- [X] T052 [P] 更新用户文档可达性：从生命周期/调试入口 ≤2 跳转能到错误处理指南在 `apps/docs/content/docs/guide/essentials/lifecycle.md`
- [X] T053 [P] Perf 回归防线：补齐 off/on 两档门槛断言与证据写入在 `pnpm perf bench:011:lifecycle` 与 `specs/011-upgrade-lifecycle/perf.md`
- [X] T054 运行 repo 级质量门槛并修复本特性引入的问题在 `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **P1 User Stories (Phase 3–5)** → **P2/P3 User Stories (Phase 6–8)** → **Polish (Phase N)**

### User Story Dependencies（建议）

- **US5 (setup-only)**：建议最先完成（为 US1/US2/US3/US6 提供稳定注册语义）
- **US1 (生命周期门禁/销毁)**：依赖 US5；优先作为 MVP
- **US4 (错误分层)**：依赖 US1 的错误链路落点稳定
- **US2 (平台信号)**：依赖 US5（注册语义）与 US1（生命周期基座）
- **US6 (React onError)**：依赖 US1/US3 的事件锚点与上下文
- **US3 (可诊断性)**：依赖 US1 的生命周期状态与事件位

---

## Parallel Examples（按 User Story）

### US5（setup-only 迁移）

```bash
Task: "T018 migrate query lifecycle registration in packages/logix-query/src/logics/auto-trigger.ts"
Task: "T019 migrate form lifecycle registration in packages/logix-form/src/logics/install.ts"
Task: "T020 migrate devtools logic lifecycle registration in packages/logix-devtools-react/src/state/logic.ts"
Task: "T021 migrate examples lifecycle registration in examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx"
```

### US1（门禁/销毁）

```bash
Task: "T023 init gate test in packages/logix-core/test/ModuleRuntime.InitGate.test.ts"
Task: "T024 destroy LIFO test in packages/logix-core/test/ModuleRuntime.DestroyLifo.test.ts"
```
