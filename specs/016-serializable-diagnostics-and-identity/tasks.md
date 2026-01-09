---
description: 'Task list for 016-serializable-diagnostics-and-identity implementation (cross-cutting hardening: serializable diagnostics + identity)'
---

# Tasks: 016 可序列化诊断与稳定身份（横切硬化）

**Input**:

- `specs/016-serializable-diagnostics-and-identity/{spec.md,plan.md,contracts/*}`
- `specs/016-serializable-diagnostics-and-identity/migration.md`
- `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- `specs/011-upgrade-lifecycle/contracts/schemas/{module-runtime-identity.schema.json,error-summary.schema.json}`
- `specs/013-auto-converge-planner/contracts/schemas/trait-converge-event.schema.json`
- `specs/009-txn-patch-dirtyset/spec.md`（稳定标识：`instanceId/txnSeq/opSeq/eventSeq`）

**Note**:

- 本 `tasks.md` 聚焦 016 的横切硬化（导出边界可序列化、稳定锚点与字段口径）；`specs/005-*`/`specs/011-*`/`specs/013-*` 各自的 `tasks.md` 是对应特性的实施入口。重叠部分以 contracts/SSoT 的裁决源为准，并通过显式依赖/引用避免双真相源。
- 本特性会引入破坏性变更（移除双锚点字段）；以迁移说明替代兼容层。

**Tests**: 对 `packages/logix-*` 的新增/重构默认视为必需（除非对应 spec 明确说明可省略）。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**：可并行（不同文件/无未完成依赖）
- **[US]**：仅在用户故事 Phase 中出现（`[US1]`/`[US2]`/`[US3]`）
- 每条任务必须包含至少一个明确文件路径

---

## Phase 1: Setup（Docs-first + Contracts 对齐）

**Purpose**: 先把“导出边界/锚点/降级规则”固化为 SSoT 与 schemas，避免实现跑偏

- [X] T001 更新 Debug SSoT：固化“宿主内原始事件 vs 可导出事件”边界、JsonValue 硬门、`instanceId` 单锚点与降级口径在 `docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [X] T002 （Moved → 011）Lifecycle setup-only 的 SSoT/示例口径由 011 执行与验收：见 `specs/011-upgrade-lifecycle/tasks.md`（T001/T002/T022）
- [X] T003 对齐 005 RuntimeDebugEventRef schema：补齐 `errorSummary`/`downgrade` 字段、稳定标识字段（对齐 009 的 `txnSeq/eventSeq` 或等价集合），并移除双锚点字段，在 `specs/005-unify-observability-protocol/contracts/schemas/runtime-debug-event-ref.schema.json` 与 `specs/005-unify-observability-protocol/contracts/observability-protocol.md`
- [X] T004 统一 016/005 的 Debug 事件契约：消除重复定义（以 005 schema 为主，016 schema 仅做 ref 或 allOf 收敛）在 `specs/016-serializable-diagnostics-and-identity/contracts/schemas/exportable-runtime-debug-event-ref.schema.json` 与 `specs/016-serializable-diagnostics-and-identity/contracts/README.md`
- [X] T005 新增迁移说明骨架（实例锚点收敛、事件字段变更、证据包/导出边界）在 `specs/016-serializable-diagnostics-and-identity/migration.md`

---

## Phase 2: Foundational（Core Hardening, Blocking Prerequisites）

**Purpose**: 先把 `@logixjs/core` 的“可序列化 + 单锚点”拉齐（不做 Devtools 组件/插件交付）

**⚠️ CRITICAL**: 本阶段完成前不得开始任何 Devtools 交付面（组件/Chrome 插件/015 面板）工作

### Tests for Foundation

- [X] T006 [P] 新增单测：`lifecycle:error` 的非序列化 `cause`（bigint/symbol/循环引用/函数等）经归一化后可 `JSON.stringify` 且含 `errorSummary/downgrade` 在 `packages/logix-core/test/Debug.RuntimeDebugEventRef.Serialization.test.ts`
- [X] T007 [P] 更新单测：DevtoolsHub snapshot 可 `JSON.stringify` 且按 `runtimeLabel::moduleId::instanceId` 聚合在 `packages/logix-core/test/DevtoolsHub.test.ts`
- [X] T008 更新单测：`module:init/module:destroy/state:update` 等事件必含 `instanceId`，且归一化后的导出形态可 `JSON.stringify`（字段口径对齐 009/005 contracts）在 `packages/logix-core/test/ModuleRuntime.test.ts` 与 `packages/logix-core/test/DevtoolsHub.test.ts`

### Implementation for Foundation

- [X] T009 [P] 定义 TS 侧 `JsonValue` 与安全投影/裁剪工具（深度/宽度/字符串长度/循环引用）在 `packages/logix-core/src/internal/observability/jsonValue.ts`
- [X] T010 [P] 定义 `SerializableErrorSummary` 构造器（从 `Cause`/`Error`/unknown 提取 message/name/code/hint，并可返回 downgrade reason）在 `packages/logix-core/src/internal/runtime/core/errorSummary.ts`
- [X] T011 统一 Debug 事件导出类型：让 `RuntimeDebugEventRef` 对齐 contracts（`instanceId` 必填、`meta: JsonValue`、`errorSummary`/`downgrade` 可选；禁止双锚点字段）在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T012 去随机化实例锚点：`ModuleRuntime` 支持注入 `instanceId`（默认使用单调序号而非 `Math.random()`），并把 `instanceId` 贯穿到 Debug/EffectOp/StateTransaction 元信息在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T013 去随机化事务/事件标识：显式引入并贯穿 `txnSeq/opSeq/eventSeq`（对齐 009），并以此确定性派生 `txnId/opId/eventId`；移除 `Date.now/Math.random` 作为默认唯一标识在 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 与相关事件元信息
- [X] T014 建立导出边界：`toRuntimeDebugEventRef` 必须产出可 JSON 序列化的 slim 事件（禁止把 `cause/state` 原始对象图塞进 `meta`），并写入 `errorSummary/downgrade` 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T015 DevtoolsHub 只持有可导出形态：ring buffer 从存 `Debug.Event` 改为存 `RuntimeDebugEventRef`；`latestStates` 等按实例维度的 key 改为 `runtimeLabel::moduleId::instanceId`（避免继续使用第二锚点）在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [X] T016 对外 Debug API 同步升级（类型/导出/label API）：更新 `DevtoolsSnapshot`/`setInstanceLabel` 等 public surface，移除双锚点入参在 `packages/logix-core/src/Debug.ts`
- [X] T017 （Moved → 011）Lifecycle 核心语义（init gate / destroy LIFO / initProgress / setup-only）由 011 执行与验收：见 `specs/011-upgrade-lifecycle/tasks.md`（T007/T010/T016/T023–T029/T048）
- [X] T018 （Moved → 011）ModuleRuntime 的 init/destroy 调度与失败链路由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T010/T027/T029）
- [X] T019 （Moved → 011）`$.lifecycle.*` setup-only phase guard 由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T016/T014）
- [X] T020 （Moved → 011）Query 的 setup-only 迁移由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T018）
- [X] T021 （Moved → 011）Form 的 setup-only 迁移由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T019）
- [X] T022 （Moved → 011）Devtools 逻辑的 setup-only 迁移由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T020）
- [X] T023 （Moved → 011）示例的 setup-only 迁移由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T021）
- [X] T024 （Moved → 011）用户文档示例的 setup-only 迁移由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T022/T036/T052）

**Checkpoint**: `@logixjs/core` 的 Debug/Hub 快照可 `JSON.stringify`；事件主锚点已切到 `instanceId`

---

## Phase 3: User Story 2 - instanceId 成为唯一实例锚点（Priority: P1）🎯 Core First

**Goal**: 对外协议与 docs 心智模型只认 `instanceId`；禁止双锚点字段

**Independent Test**: 见 `specs/016-serializable-diagnostics-and-identity/spec.md`

### Implementation for User Story 2

- [X] T025 [US2] 对齐 005/011/013 文档口径：明确 `instanceId` 单一事实源、禁止双锚点字段、以及导出边界禁写 `cause/state` 原始对象在 `specs/011-upgrade-lifecycle/plan.md`、`specs/013-auto-converge-planner/spec.md`、`specs/005-unify-observability-protocol/data-model.md`

**Checkpoint**: SSoT 与 specs 口径一致；后续 Devtools/UI 统一按 `instanceId` 聚合

---

## Phase 4: User Story 3 - 诊断默认近零成本且可裁剪（Priority: P2）

**Goal**: off 档位近零成本；light/full 档位有明确预算与裁剪策略

**Independent Test**: 见 `specs/016-serializable-diagnostics-and-identity/spec.md`

### Tests for User Story 3

- [X] T026 [P] [US3] 新增单测：`off|light|full` 分档下事件存在性/字段裁剪/预算（off 不做递归序列化扫描）在 `packages/logix-core/test/Debug.DiagnosticsLevels.test.ts`
- [X] T027 [P] [US3] 新增性能基线脚手架：测量 off vs light/full 的事件归一化开销与分配（可本地复现，输出 p50/p95 与关键统计），并把结果记录进 `specs/016-serializable-diagnostics-and-identity/perf.md`（入口：`pnpm perf bench:016:diagnostics-overhead`）

### Implementation for User Story 3

- [X] T028 [US3] 引入诊断分档配置（`off|light|full`）：把“是否记录/是否归一化/是否写入 ring buffer”变为显式策略，并保证 off 档位不产生新热路径开销在 `packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [X] T029 [US3] 落地事件体积预算与裁剪：默认单条事件 JSON 体积 ≤4KB（超限截断或省略并标记 `downgrade: oversized`），并提供 dropped/oversized 计数在 `packages/logix-core/src/internal/observability/jsonValue.ts` 与 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

**Checkpoint**: off 档位近零成本；light/full 可解释且预算可验证

---

## Phase 5: User Story 1 - 证据包永不因不可序列化而崩溃（Priority: P1, Deferred）

**Purpose**: 涉及 005 的 EvidencePackage/export/import；核心数据与 contracts 口径先在 Phase 2 锁定，导出/导入与 UI 交付面按当前优先级延后到 core 稳定后再做

**Goal**: 导出/导入链路满足协议层 JSON 硬门；降级可解释且对用户可见

**Independent Test**: 见 `specs/016-serializable-diagnostics-and-identity/spec.md`

### Tests for User Story 1

- [X] T030 [P] [US1] 新增单测：证据包 JSON 硬门（export → stringify → parse → import；`seq` 允许间隙且导入端不得假设连续）在 `packages/logix-core/test/Observability.EvidencePackage.JsonGate.test.ts`

### Implementation for User Story 1

- [X] T031 [US1] 落地最小 EvidencePackage：定义 `ObservationEnvelope/EvidencePackage` 与 `export/import` codec（至少覆盖 `debug:event`），并从 `packages/logix-core/src/index.ts` 暴露在 `packages/logix-core/src/Observability.ts`、`packages/logix-core/src/internal/observability/evidence.ts`、`packages/logix-core/src/index.ts`
- [X] T032 [US1] 将 Debug/DevtoolsHub 的导出接到 EvidencePackage：从 ring buffer 生成 `ObservationEnvelope(debug:event)` 列表并附带 `runId/seq` 在 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 与 `packages/logix-core/src/Debug.ts`

**Checkpoint**: EvidencePackage roundtrip 不崩溃（核心 API 层面）；UI 交付延后

---

## Phase 6: Deferred - Devtools 交付面（组件 / 015 / 005 插件）

- **Scheduling Note（裁决）**：
  - **优先交付组件形态**：`packages/logix-devtools-react`（应用内嵌 Devtools）作为下一阶段 Devtools 交付面主线。
  - **Chrome 扩展形态后置**：`packages/logix-devtools-chrome`（MV3）整体后置；在本 spec 的 core hardening（Phase 2/3/4）稳定、且组件形态跑通“离线一致性 + 关键交互”前，不启动扩展包实现。

- [X] T033 （Moved → 011）React `RuntimeProvider.onError` 锚点升级由 011 执行与验收：见 `specs/011-upgrade-lifecycle/tasks.md`（T041–T045）
- [X] T034 （Moved → 011）React onError 的嵌套/覆盖策略与 ModuleCache 退化防线由 011 执行：见 `specs/011-upgrade-lifecycle/tasks.md`（T043）
- [X] T035 [US2] Devtools React 消费面升级：修复 selection/聚合/展示逻辑对第二锚点的依赖，改为 `instanceId`（含 tests）在 `packages/logix-devtools-react/src/state/compute.ts`、`packages/logix-devtools-react/src/state/model.ts`、`packages/logix-devtools-react/src/DevtoolsHooks.tsx` 与 `packages/logix-devtools-react/test/devtools-react.integration.test.tsx`
- [X] T036 [US1] Devtools UI 增加导出/导入入口与降级提示：支持粘贴/文件导入 EvidencePackage，并在错误详情展示 `errorSummary` + “已降级”原因在 `packages/logix-devtools-react/src/state/logic.ts` 与 `packages/logix-devtools-react/src/ui/overview/OverviewDetails.tsx`
- [X] T037 [P] [US1] 为 013 converge 证据补齐序列化硬门：补齐/发出 `trait:converge` 事件时 `data` 必须是 JsonValue 且不泄露不可序列化对象在 `packages/logix-core/src/internal/state-trait/converge.ts` 与 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T038 [P] 标注 015 为 Devtools 后续项：在 `specs/015-devtools-converge-performance/tasks.md` 与 `specs/015-devtools-converge-performance/plan.md` 明确“依赖 016 core hardening 完成后再推进”
- [X] T039 [P] 更新用户文档（产品视角，不出现内部术语）：解释降级标记、导出/导入、instanceId 锚点与诊断分档在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`
- [X] T040 [P] 对齐 005/013/015 的 tasks 说明：明确“各自 tasks 为实施入口，横切硬化需对齐 016/011 的 contracts/SSoT 裁决源”，并将 005 的 Chrome 扩展任务标记为 Deferred（组件优先）避免出现双真相源在 `specs/005-unify-observability-protocol/tasks.md`、`specs/013-auto-converge-planner/tasks.md` 与 `specs/015-devtools-converge-performance/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**
- **US2 (Phase 3, Core First)**：依赖 Phase 2
- **US3 (Phase 4, Core)**：依赖 Phase 2
- **US1 (Phase 5, Deferred)**：依赖 Phase 2（JsonValue + instanceId + 导出边界）完成后再做
- **Devtools 交付面 (Phase 6, Deferred)**：在 core 稳定后统一推进（包含 015）

### Parallel Opportunities（示例）

- Phase 2：`T006`/`T007` 可并行；`T009`/`T010` 可并行
- US3：`T026`/`T027` 可并行
- Deferred（Phase 6）：`T037`/`T038`/`T039`/`T040` 可并行
