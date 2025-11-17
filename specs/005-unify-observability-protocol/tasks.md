---
description: "Task list for 005-unify-observability-protocol implementation"
---

# Tasks: 统一观测协议与聚合引擎（平台协议层优先）

**Input**: `specs/005-unify-observability-protocol/{spec.md,plan.md,data-model.md,contracts/*,research.md,quickstart.md}`

**Note**:

- 本 `tasks.md` 是 005 的实施入口；凡涉及 `RuntimeDebugEventRef` 的导出边界（JsonValue/errorSummary/downgrade）、`instanceId` 单锚点、lifecycle setup-only 等横切约束，需对齐 `specs/016-serializable-diagnostics-and-identity/*` 与 `specs/011-upgrade-lifecycle/*` 的裁决源与任务拆解，避免双真相源。
- Devtools 交付面当前裁决：**组件形态优先**（`packages/logix-devtools-react`）；**Chrome 扩展形态分两段**：P1=离线导入 EvidencePackage（US1 验收必需），P2=实时连接/命令回路（US3，Deferred；见 Phase 5）。

**Status Snapshot (2025-12-31)**:

- 已落地：JsonValue 投影/降级与预算统计（`packages/logix-core/src/internal/observability/jsonValue.ts`）。
- 已落地：EvidencePackage import/export（`packages/logix-core/src/internal/observability/evidence.ts`）。
- 已落地（部分）：DevtoolsHub runId/seq + ring buffer + exportBudget + clear（`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`）；`pause/resume` 命令面与 ack 回路仍未实现。
- 未落地：跨宿主 live envelopes（含批量/背压）与宿主无关聚合引擎（同一输入→同一聚合输出的自动化门禁）。

**Tests**: 对 `packages/logix-*` 的新增/重构默认视为必需（除非 spec 明确说明可省略）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可并行执行（不同文件/无前置依赖）
- **[Story]**：归属的用户故事（`[US1]`/`[US2]`/`[US3]`/`[US4]`）
- 每条任务描述必须包含至少一个明确文件路径

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: docs-first 对齐 + 代码落点占位

- [x] T001 更新 SSoT：在 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md` 固化 005 的协议/导出导入/Worker-first/Recording Window 语义
- [x] T002 建立 core 公共入口：新增 `packages/logix-core/src/Observability.ts` 并在 `packages/logix-core/src/index.ts` 导出为 `Logix.Observability`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 User Story 的共同前置（协议/证据包/聚合引擎/命令面）

**⚠️ CRITICAL**: 本阶段完成前不进入任何 UI/宿主形态交付

- [ ] T003 [P] 添加协议排序/兼容性测试：`packages/logix-core/test/observability/ObservationEnvelope.test.ts`
- [ ] T004 [P] 添加证据包录制窗口测试（seq 允许间隙）：`packages/logix-core/test/observability/EvidencePackage.test.ts`
- [ ] T005 [P] 添加聚合确定性测试（同输入同输出）：`packages/logix-core/test/observability/AggregationEngine.test.ts`
- [ ] T006 定义协议公共类型与 API：在 `packages/logix-core/src/Observability.ts` 补齐 `ObservationEnvelope`/`EvidencePackage`/`ControlCommand`/`AggregatedSnapshot`/payload 降级标记
- [x] T007 [P] 实现 payload 降级与摘要工具：`packages/logix-core/src/internal/observability/jsonValue.ts`
- [ ] T008 [P] 实现 ObservationEnvelope codec（validate/parse/compat）：`packages/logix-core/src/internal/observability/envelope.ts`
- [x] T009 [P] 实现 EvidencePackage codec（export/import）：`packages/logix-core/src/internal/observability/evidence.ts`
- [ ] T010 [P] 实现宿主无关聚合引擎（纯函数核心）：`packages/logix-core/src/internal/observability/aggregate.ts`
- [ ] T011 实现增量聚合器（append-only 输入 → 快照输出）：`packages/logix-core/src/internal/observability/aggregator.ts`
- [ ] T012 扩展 DevtoolsHub 为“运行侧事件源”：在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 增加 runId/seq、envelope ring buffer、dropped/oversized 统计、clear/pause/resume 处理
- [ ] T013 在运行侧生成权威 Envelope：在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 将 `DebugSink.Event` 归一化为 `RuntimeDebugEventRef`（`Debug.internal.toRuntimeDebugEventRef`）并封装为 `ObservationEnvelope`
- [ ] T014 暴露统一入口给宿主/UI：在 `packages/logix-core/src/Debug.ts` 导出 Observation Snapshot 订阅与命令派发（例如 `getObservationSnapshot/subscribeObservationSnapshot/sendControlCommand`）
- [ ] T015 [P] 添加命令行为测试（clear/pause/resume）：`packages/logix-core/test/observability/ControlCommand.test.ts`

**Checkpoint**: core 协议 + 证据包 + 聚合引擎 + 命令面已可独立单测验证

---

## Phase 2.1: Transport Profile（Chrome 插件/跨宿主实时）

**Purpose**: 在不引入第二套事实源的前提下，定义并固化跨宿主实时传输消息（HELLO/SUBSCRIBE/BATCH/CONTROL/ACK）。

- [x] T2.1-001 升级 contracts：补齐 transport message schemas：`specs/005-unify-observability-protocol/contracts/schemas/transport-message.schema.json`
- [ ] T2.1-002 [P] 添加 transport schema 的最小解析/校验测试（避免协议漂移）：`packages/logix-core/test/observability/TransportMessage.contract.test.ts`

## Phase 3: User Story 1 - 跨宿主一致消费 + 证据包导出/导入（Priority: P1）🎯 MVP

**Goal**: 同一 run 的观测证据可在组件形态与插件形态中得到一致的核心视图与结论（SC-002/FR-003/FR-011）

**Independent Test**: `specs/005-unify-observability-protocol/spec.md` 的 US1 Independent Test

### Tests for User Story 1

- [ ] T016 [P] [US1] 端到端 roundtrip 测试（export→import→aggregate）：`packages/logix-core/test/observability/ExportImportRoundtrip.test.ts`
- [ ] T017 [P] [US1] Devtools 导入证据包后关键计数一致性测试：`packages/logix-devtools-react/test/EvidenceImport.test.tsx`

### Implementation for User Story 1

- [ ] T018 [US1] 引入 Devtools 数据源抽象（local/evidence）：`packages/logix-devtools-react/src/state/model.ts`
- [ ] T019 [P] [US1] 实现 LocalRuntimeSource（读取 core observation snapshot）：`packages/logix-devtools-react/src/state/sources/localRuntimeSource.ts`
- [ ] T020 [P] [US1] 实现 EvidencePackageSource（导入证据包驱动视图）：`packages/logix-devtools-react/src/state/sources/evidencePackageSource.ts`
- [ ] T021 [US1] 将 Devtools 状态计算迁移为消费 `AggregatedSnapshot`：`packages/logix-devtools-react/src/state/compute.ts`
- [ ] T022 [US1] 在 Devtools runtime 中接入 DataSource（替换直接读 DebugSnapshot）：`packages/logix-devtools-react/src/snapshot.ts`
- [ ] T064 [US1] 移除导入证据包时的“补造/归一化稳定键”（`normalizeDevtoolsSnapshot`），并将缺失字段视为 producer bug/降级提示：`packages/logix-devtools-react/src/internal/snapshot/index.ts`
- [ ] T023 [US1] 增加导出/导入动作与状态：`packages/logix-devtools-react/src/state/logic.ts`
- [ ] T024 [US1] 增加导出/导入 UI（文件导入 + 下载/复制）：`packages/logix-devtools-react/src/ui/settings/SettingsPanel.tsx`

**Checkpoint**: 组件形态导出/导入证据包后核心计数/顺序一致（SC-002）；Chrome 扩展形态离线导入一致性见 Phase 5（P1）

---

## Phase 4: User Story 4 - 录制/选区/回溯（Recorder & Time Travel）（Priority: P1）

**Goal**: Record/Stop + Brush 选区 + Flamegraph 深度查看 +（可选）Time Travel（FR-004/FR-007/FR-008/FR-012/FR-013）

**Independent Test**: `specs/005-unify-observability-protocol/spec.md` 的 US4 Independent Test

### Tests for User Story 4

- [ ] T029 [P] [US4] Recorder 行为测试（命令优先 + local-only 降级 + 录制窗口导出）：`packages/logix-devtools-react/test/Recorder.test.tsx`
- [ ] T030 [P] [US4] Brush/Viewport 联动测试（Overview→Detail）：`packages/logix-devtools-react/test/BrushViewport.test.tsx`
- [ ] T031 [P] [US4] Time Travel 交互联动测试（选择 txn → applyTransactionSnapshot）：`packages/logix-devtools-react/test/TimeTravel.test.tsx`

### Implementation for User Story 4

- [ ] T032 [US4] 在运行侧实现 pause/resume 真正“停采集”（降低开销）：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [ ] T033 [US4] Recorder 状态机：Record/Stop 映射 `resume/pause`，不支持则 local-only：`packages/logix-devtools-react/src/state/logic.ts`
- [ ] T034 [US4] 录制窗口导出：Stop 后仅导出窗口内事件且保留原始 seq（可有间隙）：`packages/logix-devtools-react/src/state/logic.ts`
- [ ] T035 [US4] 增加 viewport 状态与动作（Brush 选区）：`packages/logix-devtools-react/src/state/model.ts`
- [ ] T036 [US4] 实现 OverviewStrip Brush 交互与视口可视化：`packages/logix-devtools-react/src/ui/overview/OverviewStrip.tsx`
- [ ] T037 [US4] Detail 视图按 viewport 过滤并支持深度查看入口：`packages/logix-devtools-react/src/ui/timeline/Timeline.tsx`
- [ ] T038 [US4] 增加 Flamegraph 视图骨架与数据输入（先对齐 trace/effectop）：`packages/logix-devtools-react/src/ui/timeline/FlamegraphView.tsx`
- [ ] T039 [US4] 运行侧补齐 txn span 边界（startedAt/endedAt）到可聚合字段：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [ ] T040 [US4] 聚合引擎输出 OperationWindowSpan 索引（txn lane）：`packages/logix-core/src/internal/observability/aggregate.ts`
- [ ] T041 [US4] OverviewStrip 渲染迁移：从 Histogram → Span + Signal Lane（DOM first）：`packages/logix-devtools-react/src/ui/overview/OverviewStrip.tsx`
- [ ] T042 [US4] Seek/Time Travel：在选中 txn/event 时调用 `Logix.Runtime.applyTransactionSnapshot`：`packages/logix-devtools-react/src/state/logic.ts`
- [ ] T043 [US4] 引入 Worker-first 聚合（Worker 侧增量聚合 + 节流推送）：`packages/logix-devtools-react/src/worker/aggregation.worker.ts`
- [ ] T044 [US4] Worker client + 降级策略（Worker 不可用可预测降级并可见）：`packages/logix-devtools-react/src/state/aggregationWorkerClient.ts`
- [ ] T045 [US4] Devtools 接入 Worker-first（主线程仅投递+渲染）：`packages/logix-devtools-react/src/snapshot.ts`

**Checkpoint**: 录制 10s → Stop → Brush 1s 选区 → Detail/Flamegraph 可用且响应流畅（US4）

---

## Phase 5: Chrome 扩展宿主（P1: 离线导入；P2: 实时连接）

**Status**:

- P1（离线导入）：跟随 US1，一旦证据包导出/导入闭环稳定即可开始。
- P2（实时连接）：Deferred（依赖 TransportMessage v1 + 背压 + 命令回路 + perf evidence）。

### P1: 离线导入（User Story 1 - Priority: P1）

**Goal**: 扩展面板可离线导入 EvidencePackage 并展示一致视图（SC-002/US1）

**Independent Test**: `specs/005-unify-observability-protocol/spec.md` 的 US1 Independent Test（Acceptance Scenario 2）

- [ ] T025 [P] [US1] 新增扩展包骨架（MV3）：`packages/logix-devtools-chrome/package.json`
- [ ] T026 [P] [US1] 配置 devtools panel 入口与静态资源：`packages/logix-devtools-chrome/manifest.json`
- [ ] T027 [US1] 渲染 Devtools 面板（仅离线导入证据包）：`packages/logix-devtools-chrome/src/panel/index.tsx`
- [ ] T028 [US1] 配置扩展构建（最小可用）：`packages/logix-devtools-chrome/vite.config.ts`

**Checkpoint**: 打开扩展 Devtools 面板 → 导入 EvidencePackage → 与组件形态一致（SC-002）（US1）

### P2: 实时连接（User Story 3 - Priority: P2, Deferred）

**Goal**: 扩展面板连接到当前页面会话并实时展示，同时将高成本处理移出被测页面主线程（SC-001/US3）

**Independent Test**: `specs/005-unify-observability-protocol/spec.md` 的 US3 Independent Test

#### Tests for User Story 3

- [ ] T046 [P] [US3] 传输层 codec/unit 测试（window message → extension message）：`packages/logix-devtools-chrome/test/transport.unit.test.ts`

#### Implementation for User Story 3

- [ ] T047 [US3] 页面侧桥接：将 ObservationEnvelope 批量转发到 `window.postMessage`：`packages/logix-core/src/Observability.ts`
- [ ] T048 [US3] Content Script：监听 window message 并转发给扩展：`packages/logix-devtools-chrome/src/content-script.ts`
- [ ] T049 [US3] Background（MV3 service worker）：按 tabId 路由消息/端口：`packages/logix-devtools-chrome/src/background.ts`
- [ ] T050 [US3] Devtools Page：创建 panel 并连接 background：`packages/logix-devtools-chrome/src/devtools.ts`
- [ ] T051 [US3] RemoteRuntimeSource：消费远程 envelopes 驱动 Devtools：`packages/logix-devtools-react/src/state/sources/remoteRuntimeSource.ts`
- [ ] T052 [US3] 命令回路：panel → page（clear/pause/resume）与 accepted/reason：`packages/logix-devtools-chrome/src/background.ts`
- [ ] T053 [US3] 端口背压与降级：高频下批量/丢弃/统计可见：`packages/logix-devtools-chrome/src/background.ts`
- [ ] T054 [US3] 插件面板默认 Worker-first（复用 US4 worker client）：`packages/logix-devtools-chrome/src/panel/index.tsx`

**Checkpoint**: 打开扩展 Devtools 面板即可看到实时时间线/概览/诊断，且页面交互无明显劣化（US3）

---

## Phase 6: User Story 2 - 需求锚点映射与 Step 覆盖（Priority: P2）

**Goal**: 从证据包中计算 Step covered/pending，并可从 Step 追溯到关联证据（FR-005/SC-004）

**Independent Test**: `specs/005-unify-observability-protocol/spec.md` 的 US2 Independent Test

### Tests for User Story 2

- [ ] T055 [P] [US2] 覆盖计算单测（ui:intent → coverage）：`packages/logix-core/test/observability/Coverage.test.ts`
- [ ] T056 [P] [US2] Step UI 与证据追溯测试：`packages/logix-devtools-react/test/StepCoverage.test.tsx`

### Implementation for User Story 2

- [ ] T057 [US2] 定义 `ui:intent` payload（Scenario/Step schema）并同步协议文档：`specs/005-unify-observability-protocol/contracts/observability-protocol.md`
- [ ] T058 [US2] 聚合引擎输出 coverage 结构（steps covered/pending + evidence refs）：`packages/logix-core/src/internal/observability/aggregate.ts`
- [ ] T059 [US2] Devtools 增加 Step 覆盖面板与跳转：`packages/logix-devtools-react/src/ui/coverage/StepCoveragePanel.tsx`
- [ ] T060 [US2] 示例场景注入 Step 信号（region-cascade）：`examples/logix/src/scenarios/region-cascade.ts`

**Checkpoint**: 一次运行产出证据包后可显示 ≥3 个 Step 的 covered/pending，并可 3 次点击内定位证据（SC-004）

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T061 [P] 补齐接入/验收文档（组件+插件+录制）：`specs/005-unify-observability-protocol/quickstart.md`
- [ ] T062 性能与节流回归用例（10k events/s）：`packages/logix-devtools-react/test/perf/observability-10k-events.test.ts`
- [ ] T063 [P] 协议/数据模型一致性复查（contracts ↔ data-model ↔ 实现）：`specs/005-unify-observability-protocol/data-model.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → 进入用户故事
- **US1 (MVP)** 依赖 Phase 2；建议优先完成以验证“跨宿主一致性”主线
- **US4** 依赖 Phase 2（并复用 US1 的 DataSource/导出导入）
- **US3（P2, 实时）** 依赖：Phase 2 + 扩展 P1 离线宿主（T025-T028）+ US4（Worker-first 聚合），以确保低干扰达标路径
- **US2** 依赖 Phase 2（证据包与聚合），不阻塞 P1 主线

### Parallel Opportunities（示例）

- Phase 2：`T003`/`T004`/`T005` 可并行；`T007`/`T008`/`T009`/`T010` 可并行
- US1：`T019`/`T020` 可并行
- US4：`T029`/`T030`/`T031` 可并行；`T043`/`T044` 可并行
- Ext P1（离线）：`T025`/`T026`/`T027`/`T028` 可并行
- US3（Deferred，实时）：`T048`/`T049`/`T050` 可并行
- US2：`T055`/`T056` 可并行；`T059`/`T060` 可并行

---

## Parallel Examples（按 User Story）

### US1（离线一致性）

```bash
Task: "T019 Implement LocalRuntimeSource in packages/logix-devtools-react/src/state/sources/localRuntimeSource.ts"
Task: "T020 Implement EvidencePackageSource in packages/logix-devtools-react/src/state/sources/evidencePackageSource.ts"
```

### US4（录制 + Brush）

```bash
Task: "T029 Recorder test in packages/logix-devtools-react/test/Recorder.test.tsx"
Task: "T030 Brush test in packages/logix-devtools-react/test/BrushViewport.test.tsx"
Task: "T043 Aggregation worker in packages/logix-devtools-react/src/worker/aggregation.worker.ts"
Task: "T044 Worker client in packages/logix-devtools-react/src/state/aggregationWorkerClient.ts"
```

### US3（扩展实时链路）

```bash
Task: "T025 Create extension package skeleton in packages/logix-devtools-chrome/package.json"
Task: "T026 Add MV3 manifest in packages/logix-devtools-chrome/manifest.json"
Task: "T048 Content script in packages/logix-devtools-chrome/src/content-script.ts"
Task: "T049 Background worker in packages/logix-devtools-chrome/src/background.ts"
Task: "T050 Devtools page in packages/logix-devtools-chrome/src/devtools.ts"
```

### US2（Step 覆盖）

```bash
Task: "T055 Coverage unit test in packages/logix-core/test/observability/Coverage.test.ts"
Task: "T059 Step panel UI in packages/logix-devtools-react/src/ui/coverage/StepCoveragePanel.tsx"
Task: "T060 Emit step signals in examples/logix/src/scenarios/region-cascade.ts"
```

---

## Implementation Strategy（MVP First）

1. Phase 1（docs-first + core 入口）
2. Phase 2（协议/证据包/聚合/命令面）——到此为止应可写纯单测验证 determinism
3. US1（MVP）：导出/导入 + 组件离线一致性 + 扩展离线导入一致性
4. US4：Recorder/Brush/TimeTravel + Worker-first 达标路径
5. US3（Deferred）：扩展实时连接 + 低干扰（复用 Worker-first）
6. US2：Scenario/Step 覆盖与证据追溯
