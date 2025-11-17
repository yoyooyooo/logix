---
description: "Task list for 012-program-api (Process)"
---

# Tasks: Process（长效逻辑与跨模块协同收敛）

**Input**: Design documents from `specs/012-program-api/`
**Prerequisites**: `specs/012-program-api/plan.md`, `specs/012-program-api/spec.md`, `specs/012-program-api/data-model.md`, `specs/012-program-api/contracts/`, `specs/012-program-api/research.md`, `specs/012-program-api/quickstart.md`

**Tests**: 本特性触及 `packages/logix-core` 与 `packages/logix-react` 的核心路径（processes 运行承载 / 生命周期 / 并发语义 / 诊断事件），测试与回归防线视为必需（含 contracts/schema 预检 + 语义用例 + 性能/诊断基线）；同时遵循 030 Public Submodules gate：实现目录（如 hooks/components/worker）下沉 `src/internal/**`，任何直接 import `src/internal/**` 的测试应收敛到 `test/internal/**`（`@logix/react` / `@logix/sandbox` 的 `test/browser/**` 允许作为例外）。

**Traceability**: 每条任务应至少映射到一个编码点（FR/NFR/SC）或宪章条款；如为治理/文档/流程任务，用 `Trace: Constitution` 标注。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 先把“Process 公共 API + contracts 预检 + 事件/标识约束脚手架”搭好，避免实现期到处补洞。

- [x] T001 创建 Process 公共入口与最小 API 骨架（类型对齐 data-model + schema；先只定义类型与 meta 挂载点）（Trace: FR-001/FR-008）：`packages/logix-core/src/Process.ts`
- [x] T002 导出 Process 命名空间（与现有 `Logix.*` 结构一致）（Trace: FR-001）：`packages/logix-core/src/index.ts`
- [x] T003 [P] 增加 contracts 预检测试（012 schemas JSON 可解析 + title/$ref/enum 对齐）（Trace: Constitution 文档先行 & SSoT）：`packages/logix-core/test/Contracts/Contracts.012.ProcessContracts.test.ts`
- [x] T004 [P] 增加 Process 静态面（definition/installation）与动态事件（process:\*）的可序列化/预算门槛回归用例（至少保证 JSON.stringify 不抛错 + 关键必填字段齐备）（Trace: FR-008/NFR-002/SC-006）：`packages/logix-core/test/Process/Process.ContractsAndBudgets.test.ts`
- [x] T005 [P] 增加类型级防线：Process 逻辑只获得 `ModuleHandle`（不暴露跨模块 `setState`/可写 Ref）并可被 typecheck:test 覆盖（Trace: FR-005）：`packages/logix-core/test/Process/Process.ModuleHandleOnly.d.ts`
- [x] T048 [P] 更新 agent context（设计/实现前先同步一次，避免并行真相源漂移）（Trace: Constitution 并行真相源治理）：`.specify/scripts/bash/update-agent-context.sh codex`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先落地“统一最小 IR（Process Events）+ 稳定标识 + 安装点/作用域模型 + 运行监督（并发/错误策略）”，否则 US1/US2/US3 会互相打断。

- [x] T006 定义 Process 元信息模型与挂载方式（Effect 上附加可序列化 definition/installationScope；将 definition/installation 视为 Static IR）（Trace: FR-001/FR-008）：`packages/logix-core/src/Process.ts`
- [x] T007 定义 Scope/Identity 派生与稳定 id 规则（processId + scopeKey + runSeq/triggerSeq；禁止 random/time 默认）（Trace: NFR-003/Constitution）：`packages/logix-core/src/internal/runtime/core/process/identity.ts`
- [x] T008 定义 Process 事件结构（start/stop/restart/trigger/dispatch/error）与 Slim 序列化投影（含 budgets 裁剪策略）（Trace: FR-008/NFR-002）：`packages/logix-core/src/internal/runtime/core/process/events.ts`
- [x] T009 将 Process 事件接入 DebugSink（新增 `process:*` 事件类型 + `toRuntimeDebugEventRef` 投影/降级规则）（Trace: FR-008）：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T010 实现 Process 并发语义最小集（latest/serial/drop/parallel），并复用 TaskRunner/Flow 的既有语义（避免重造并发轮子）（Trace: FR-006）：`packages/logix-core/src/internal/runtime/core/process/concurrency.ts`, `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- [x] T011 实现 Process 错误策略（failStop 默认 + supervise 有上限；重启递增 runSeq；达到上限停止并产出事件）（Trace: FR-007）：`packages/logix-core/src/internal/runtime/core/process/supervision.ts`
- [x] T012 实现事务边界 guard：在“同步事务 fiber”内触发 Process 调度时稳定 no-op + 诊断（避免 txnQueue 自等死锁；语义对齐 TaskRunner 的 `inSyncTransactionFiber`）（Trace: NFR-004/FR-005）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`, `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- [x] T013 实现 ProcessRuntime 基础能力（按 scope 安装/启动/停止/重启；维护 installations/instances/status；提供 platformEvent 输入与 events 输出；触发源与并发细节在 US3 补齐）（Trace: FR-002/FR-003）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`
- [x] T014 通过 InternalContracts 暴露最小 Process 查询/控制入口（映射 openapi：installations/status/control/platform/event/events；确保导出形态与 schema 对齐且可序列化）（Trace: FR-008/FR-004）：`packages/logix-core/src/internal/InternalContracts.ts`
- [x] T015 [P] 增加事务边界回归用例：事务窗口内触发 Process 不得阻塞/死锁，且在 dev/test 下产出可解释诊断（Trace: NFR-004/FR-005）：`packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 统一长效逻辑为 Process（应用级） (Priority: P1) 🎯 MVP

**Goal**: 应用级（Runtime scope）只用 Process 承载跨模块/长效逻辑；具备可预测启停、缺失依赖可修复错误、以及最小诊断事件链路。

**Independent Test**: 最小 Root Runtime 中声明 1 个 Process（模块 A 事件 → 模块 B 动作），验证随 runtime 启停；缺失依赖时失败并给出修复建议。

- [x] T016 [P] [US1] 增加“应用级协同”端到端用例（A.actions$ → B.dispatch；验证结果可观察）（Trace: SC-001/FR-005）：`packages/logix-core/test/Process/Process.AppScope.Coordinate.test.ts`
- [x] T017 [P] [US1] 增加“runtime.dispose 会终止 app-scope Process”用例（无残留后台行为）（Trace: FR-002）：`packages/logix-core/test/Process/Process.AppScope.DisposeStops.test.ts`
- [x] T018 [P] [US1] 增加“缺失依赖可修复错误”用例（缺失模块/建议安装点/导入路径）（Trace: SC-003/FR-004）：`packages/logix-core/test/Process/Process.AppScope.MissingDependency.test.ts`
- [x] T019 [US1] 实现 app-scope 安装点：从 `rootImpl.processes` 解析 app-scope Process 并由 ProcessRuntime 统一 fork/supervise（替代裸 fork）（Trace: FR-002）：`packages/logix-core/src/internal/runtime/AppRuntime.ts`, `packages/logix-core/src/internal/runtime/Runtime.ts`
- [x] T020 [US1] 补齐 Process 公共 API（`Process.make(...)`/`Process.link(...)`/`Process.getDefinition(...)`；提供最短重载便于“一行写法”；不提供 `Process.of(effect)`）（Trace: FR-001/FR-008）：`packages/logix-core/src/Process.ts`
- [x] T021 [US1] 新增 `Process.link(...)`（跨模块胶水）；并让 `Link.make` 成为等价别名/下沉实现，产物具备稳定 processId（默认用 linkId），可被 ProcessRuntime 识别（Trace: FR-001/FR-005）：`packages/logix-core/src/Link.ts`, `packages/logix-core/src/Process.ts`

---

## Phase 4: User Story 2 - 实例级协同：Process 随模块实例生命周期运行 (Priority: P2)

**Goal**: 模块实例级（imports-scope / per-instance scope）可安装 Process；多实例严格隔离，不串实例；实例销毁自动清理 Process。

**Independent Test**: 同进程创建两份实例（A/B），每份实例安装同一个 instance-scope Process；验证各自只影响自己 scope 内的子模块，实例销毁后 Process 停止。

- [x] T022 [P] [US2] 增加“双实例隔离”用例（A/B 两份 scope 不串；触发 A 只影响 A）（Trace: SC-002/FR-002）：`packages/logix-core/test/Process/Process.ModuleInstance.Isolation.test.ts`
- [x] T023 [P] [US2] 增加“实例销毁停止 instance-scope Process”用例（Scope.close 后无后台残留）（Trace: FR-002）：`packages/logix-core/test/Process/Process.ModuleInstance.DisposeStops.test.ts`
- [x] T024 [US2] 让 ModuleRuntime 支持 instance-scope processes：从 ModuleImpl.processes 解析 instance-scope Process 并在实例 scope 内 fork（与 lifecycle 对齐，避免抢在 logics 就绪前 dispatch）（Trace: FR-002）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T025 [US2] 将 ModuleImpl.processes 传入 ModuleRuntimeOptions（当前仅存于蓝图，尚未进入实例构造链）（Trace: FR-002）：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
- [x] T026 [US2] instance-scope 缺失依赖错误：严格限定当前 scope 解析；失败时产出可修复诊断事件（禁止跨 scope 兜底）（Trace: FR-004/SC-003）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`

---

## Phase 5: User Story 3 - 统一触发/并发语义与可诊断性 (Priority: P3)

**Goal**: Process 的触发模型与并发语义在系统层面一致可解释（latest/serial/drop/parallel）；诊断可回答“哪个 Process 因何触发，驱动了哪个模块动作”，且默认近零成本。

**Independent Test**: 同一触发源高频触发下，对比 latest vs serial（可区分且可预测）；同时验证结构化诊断事件链路与稳定标识。

- [x] T027 [P] [US3] 增加并发语义用例：latest vs serial（结果次数/顺序可断言；取消不泄漏）（Trace: FR-006）：`packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- [x] T028 [P] [US3] 增加并发语义用例：drop（exhaust） vs parallel（maxParallel/背压可断言）（Trace: FR-006）：`packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`
- [x] T029 [P] [US3] 增加错误策略用例：failStop 默认 vs supervise（重启上限 + runSeq 递增 + 达上限停止）（Trace: FR-007）：`packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`
- [x] T030 [P] [US3] 增加诊断链路用例：trigger → dispatch → error/start/stop 事件可序列化且带稳定标识（含模块触发的 `txnSeq` 锚点）（Trace: FR-008/NFR-002/SC-004）：`packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts`
- [x] T031 [P] [US3] 增加触发源用例：platformEvent（通过 InternalContracts 投递事件触发 Process）（Trace: FR-006）：`packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
- [x] T032 [P] [US3] 增加触发源用例：timer（可控的间隔触发；与并发策略组合可验收）（Trace: FR-006）：`packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`
- [x] T033 [P] [US3] 增加触发源用例：moduleStateChange（`path` 必须为 dot-path；非法 path 失败并给出可修复提示；复用 `ModuleRuntime.changes(selector)`/`ModuleHandle.changes(selector)`，按 path/selector 变化触发；不引入全量 diff/轮询）（Trace: FR-005/FR-006）：`packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
- [x] T049 [P] [US3] 增加 selector 性能/频率告警：仅在 dev/test 或 diagnostics=light/full 下，对 moduleStateChange selector 的耗时与触发频率做采样统计并产出 warning 事件（diagnostics=off 必须近零成本）（Trace: NFR-002/FR-006）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`, `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
- [x] T034 [US3] 在 ProcessRuntime 内实现触发模型（moduleAction/moduleStateChange/platformEvent/timer），其中 moduleStateChange 需包含 dot-path 解析/校验与可修复错误事件；并统一为 Trigger → Schedule → Dispatch 链路事件（Trace: FR-006/FR-005）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`
- [x] T035 [US3] 在 ProcessRuntime 内实现并发策略与取消/背压语义（复用 TaskRunner 的 latest/exhaust/parallel 语义；serial 默认 `maxQueue=unlimited`，超限护栏默认 failStop（`process::serial_queue_overflow`）且可诊断：队列峰值/当前长度/策略证据）（Trace: FR-006/NFR-001）：`packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
- [x] T036 [US3] 在 ProcessRuntime 内实现事件预算与降级（maxEvents/maxBytes；超限产出摘要事件并累计预算计数）（Trace: NFR-002/FR-008）：`packages/logix-core/src/internal/runtime/core/process/events.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档/迁移说明、Devtools/Sandbox 对齐、以及性能/诊断基线收口。

- [x] T037 [P] 更新运行时 SSoT：补齐 Process 语义、三种安装点、并发/错误策略与事件协议（Trace: Constitution 文档先行 & SSoT）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`, `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- [x] T038 [P] 更新用户文档（产品视角，避免 v3/PoC 术语）（Trace: Constitution 迁移与用户文档）：`apps/docs/content/docs/api/core/runtime.md`
- [x] T039 更新破坏性变更与迁移说明（Program→Process；processes 语义收口；无兼容层）（Trace: Constitution 迁移说明）：`docs/reviews/99-roadmap-and-breaking-changes.md`
- [x] T040 [P] 增加可运行示例（AC-1/AC-2/AC-6 最小闭环）（Trace: SC-001/SC-002/FR-003）：`examples/logix/src/scenarios/process-app-scope.ts`, `examples/logix/src/scenarios/process-instance-scope.ts`, `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
- [x] T041 增加性能基线采集脚本（对齐 NFR-001/NFR-002：diagnostics off/light/full；重复运行口径与落盘位置；产物必须给出 PASS/FAIL，阈值以 `specs/012-program-api/perf/README.md` 为准）。脚本统一纳入 `logix-perf-evidence` 并以 `pnpm perf bench:012:process-baseline`（或等价命名）暴露入口（Trace: NFR-001/NFR-002/SC-005/SC-006）：`specs/012-program-api/perf/README.md`
- [x] T042 [P] 增加 UI 子树安装点（useProcesses）回归用例（挂载即启、卸载即停；StrictMode double-invoke 下不重复副作用；必要时实现 provider-scope refCount + 延迟 stop/GC；Suspense 不泄漏）（Trace: FR-003）：`packages/logix-react/src/internal/hooks/useProcesses.ts`, `packages/logix-react/src/Hooks.ts`, `packages/logix-react/test/Hooks/useProcesses.test.tsx`
- [x] T043 [P] 校对并验证 `specs/012-program-api/quickstart.md` 的“安装点/默认策略/迁移口径”与最终 API 一致（必要时回写 quickstart）（Trace: FR-001/Constitution 迁移义务）：`specs/012-program-api/quickstart.md`
- [x] T044 [P] 收尾更新 agent context（以最终 API/目录结构为准再同步一次）（Trace: Constitution 并行真相源治理）：`.specify/scripts/bash/update-agent-context.sh codex`
- [x] T045 [P] Devtools 消费验证：确保 `process:*` 事件能进入 snapshot 并被 timeline/过滤逻辑稳定消费（最小集成测试即可）（Trace: FR-008/SC-004）：`packages/logix-devtools-react/test/internal/ProcessEvents.integration.test.tsx`
- [x] T046 [P] Sandbox 兼容性验证：确认 Worker 的 Logix DebugSink 对 `process:*` 事件处理稳定（作为 LOG；不要求 UI 展示），必要时补最小回归测试（Trace: FR-008）：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`, `packages/logix-sandbox/test/browser/sandbox-worker-process-events.compat.test.ts`
- [x] T047 [P] Dogfooding 迁移示例：将现有跨模块 Link 场景重构为“应用级 Process（processes 承载）”写法，并对照 quickstart 的默认策略口径（Trace: FR-001/Constitution）：`examples/logix/src/scenarios/cross-module-link.ts`
- [x] T050 [P] 增加 schema-based selector：为 moduleStateChange 提供 SchemaAST 驱动的路径解析与安全读取，替换 ProcessRuntime 内 selectByDotPath 的动态访问（Trace: FR-005/FR-006）：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`, `packages/logix-core/src/internal/runtime/core/process/selectorSchema.ts`
- [x] T051 [P] 补充 action payload 反射说明与回归用例：明确 unknown payload 的诊断提取规则并确保异常 payload 不影响链路（Trace: FR-008/SC-004）：`packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts`, `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- [x] T052 [P] 补齐 SC-003 的“2 分钟可修复”量化验证：在 quickstart 增加可复现场景与计时标准（必要时补充脚本化示例）（Trace: SC-003）：`specs/012-program-api/quickstart.md`

---

## Dependencies & Execution Order

- Phase 2 是阻塞项：先把 identity + events + ProcessRuntime + InternalContracts 落地，否则 US1/US2/US3 的实现会互相返工。
- MVP 建议只做 US1：完成 app-scope 的 Process 统一入口 + 生命周期/缺失依赖诊断 + 最小事件链路，再扩展到实例级与触发/并发矩阵。
- US2 依赖 Phase 2 与 US1 的部分产物（Process meta/identity/events），但不要求先完成 US3 的全部触发类型。
- US3 的触发/并发语义应优先复用 TaskRunner/Flow 既有语义，避免引入第二套调度器；新增语义必须补齐诊断事件与预算验证。
- 性能/诊断基线（T041）不要拖到最后：至少在合并前完成 diagnostics off vs on 的对比落盘，避免“实现完成才发现回退”。
