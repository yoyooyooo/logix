---
description: 'Task list for 003-trait-txn-lifecycle implementation'
---

# Tasks: 003-trait-txn-lifecycle（StateTrait 状态事务 / 生命周期分层 + Devtools 升级）

**Input**: Design documents from `/specs/003-trait-txn-lifecycle/`
**Prerequisites**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**Tests**: 本特性落点在 `@logixjs/core` / `@logixjs/react` / `@logixjs/devtools-react` 三个核心包，测试视为必选：每个 user story 至少要有对应的单测 / 集成测试任务。

**Organization**: 按 user story 分阶段拆解，保证每个故事都可以独立实现与验证。

## Phase 1: Setup（环境与文档基线）

**Purpose**: 对齐 feature 分支环境与文档入口，保证后续任务落点清晰。

- [x] T001 确认 feature 分支与规范文件存在（`003-trait-txn-lifecycle` / `spec.md` / `plan.md`）
- [x] T002 [P] 在 `docs/ssot/runtime/logix-core` 下定位需更新的文档条目并加上 TODO 标记（如 02-module-and-logic-api.md、03-logic-and-flow.md）
- [x] T003 [P] 在 `packages/logix-core`、`packages/logix-react`、`packages/logix-devtools-react` 目录下运行一次 `pnpm test` / `pnpm typecheck`，记录当前基线状态

---

## Phase 2: Foundational（事务内核与统一 Debug 事件模型）

**Purpose**: 建立 StateTransaction / StateTxnContext 内核与 RuntimeDebugEvent 标准化，是所有 user story 的基础。

### 内核：StateTransaction / StateTxnContext

- [x] T004 定义 StateTxnContext 类型与基本 API（beginTransaction/updateDraft/recordPatch/commit）在 `packages/logix-core/src/internal/runtime/core/**`（根据现有 ModuleRuntime 内核文件实际落点）
- [x] T005 将 ModuleRuntime 的状态写入逻辑改造为基于 StateTxnContext 的单事务提交（入口在 `packages/logix-core/src/Runtime.ts` 或对应 internal runtime 文件）
- [x] T006 为 StateTransaction / StatePatch 建立最小单元测试，在 `packages/logix-core/test/ModuleRuntime.test.ts` 验证“一次 dispatch 只提交一次 state:update + Patch 聚合”

### 事件模型：RuntimeDebugEvent 标准化

- [x] T007 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 或等价位置定义 RuntimeDebugEventRef 标准结构（对齐 `specs/003-trait-txn-lifecycle/data-model.md` 中的 TraitRuntimeEvent / RuntimeDebugEventRef）
- [x] T008 [P] 实现 `Logix.Debug.Event -> RuntimeDebugEventRef` 的归一化转换函数（填充 eventId/moduleId/instanceId/txnId/kind/label/meta）并在 DevtoolsSink 之前应用
- [x] T009 [P] 为 Debug 事件标准化增加单测（覆盖 action/state/service/trait-\* 类型），在 `packages/logix-core/test/Debug.test.ts` 或新建测试文件中断言 kind/label/meta 映射
- [x] T046 [P] 在 `packages/logix-core/src/internal/runtime/core` 与 `packages/logix-core/src/Runtime.ts` 中实现 StateTransaction 观测策略（Instrumentation Policy），支持 `"full"` / `"light"` 等级：在不改变“单入口 = 单事务 = 单次订阅通知”语义的前提下，通过配置控制 Patch/快照构建与 Debug 事件种类
- [x] T047 [P] 在 `packages/logix-core/test` 中为观测策略增加单测：验证在 `"full"` 模式下会生成 Patch/快照与完整 RuntimeDebugEvent，在 `"light"` 模式下仍然只提交一次状态并触发一次订阅通知，但允许关闭 Patch/快照和部分 Debug 事件

**Checkpoint**: Runtime 可以按事务提交状态，并产出统一的 RuntimeDebugEventRef 序列。

---

## Phase 3: User Story 1（P1）- Runtime 维护者按事务推理状态变化

**Goal**: “一次逻辑入口 = 一次 StateTransaction 提交，对外只见一次状态写与通知”，并在 Devtools 里能看到完整事务轨迹。

**Independent Test**: 使用 TraitForm 或等价示例，通过一次用户交互触发一次动作，只产生一条状态提交事件和一个事务视图（内部可含多步 Trait / Middleware）。

### Tests for US1

- [x] T010 [P] [US1] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中新增事务级测试用例：多步 Reducer / Trait 更新只产生一次底层 state 写入与一次 debug state:update
- [x] T011 [P] [US1] 在 `examples/logix-react` 对应测试或新建测试中验证“一次交互 → 一条事务 + 一次视图状态更新”，可使用 Vitest + React Testing Library

### Implementation for US1

- [x] T012 [US1] 在 ModuleRuntime 的逻辑入口（action dispatch / source-refresh / service 回写 / devtools 操作）处统一调用 StateTxnContext.beginTransaction，并记录 origin/txnId（文件：`packages/logix-core/src/Runtime.ts` 或对应 internal runtime 文件）
- [x] T013 [US1] 将 Reducer / Trait / Middleware 的状态写行为改为写入事务草稿状态，并通过 StateTxnContext.recordPatch 记录字段级 Patch（涉及 `packages/logix-core/src/State.ts` / `state-trait.ts` / middleware 内部）
- [x] T014 [US1] 在事务结束处实现 commit：写入底层状态容器、发出一次 state:update Debug 事件，并将 txnId 传入 RuntimeDebugEventRef（`packages/logix-core/src/internal/runtime/core/DebugSink.ts`）
- [x] T015 [US1] 扩展 `packages/logix-core/src/internal/runtime/core/EffectOpCore.ts` 或 DebugObserver，使 EffectOp 事件在传入 DebugSink 时附带 txnId 信息，确保 Devtools 能按事务聚合事件
- [x] T016 [US1] 在 `specs/003-trait-txn-lifecycle/quickstart.md` 中补充/校正 US1 验证步骤（从 TraitForm 交互 → 查事务列表 → 检查单次提交与 Patch 聚合）
- [x] T056 [P] [US1] 在 `packages/logix-core/src/Runtime.ts` 中扩展 `RuntimeOptions`：新增 `stateTransaction?: { instrumentation?: "full" \| "light" }`，并在 `Logix.Runtime.make` 里将该配置下沉到 `AppRuntimeImpl.LogixAppConfig`，为后续 ModuleRuntime 构造提供 Runtime 级默认观测策略
- [x] T057 [P] [US1] 在 `packages/logix-core/src/internal/runtime/core/module.ts` 与 `packages/logix-core/src/internal/runtime/ModuleFactory.ts` 中扩展 `ModuleTag["implement"]` / `ModuleImpl` 类型与实现：在 `implement` 的 config 中新增可选 `stateTransaction?: { instrumentation?: "full" \| "light" }`，并在 `Module.implement` 内组合 ModuleImpl 级配置、Runtime 级配置与 `getDefaultStateTxnInstrumentation()` 计算模块的有效观测级别
- [x] T058 [P] [US1] 在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 中扩展 `ModuleRuntimeOptions`：新增 `stateTransaction?: { instrumentation?: "full" \| "light" }`，并在创建 `txnContext` 时优先使用该配置，未配置时依次回退到 Runtime 级默认与 `getDefaultStateTxnInstrumentation()`
- [x] T059 [US1] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中新增一组 instrumentation 优先级单测：覆盖“仅 NODE_ENV 默认”、“Runtime 级覆盖 NODE_ENV”、“ModuleImpl 覆盖 Runtime”的三种情况，断言 StateTransaction 实际运行时的 `instrumentation` 与预期优先级一致
- [x] T060 [US1] 复查 `@logixjs/react` 中的 `RuntimeProvider` / `LogixProvider`（`packages/logix-react/src/components/RuntimeProvider.tsx` 等），确保 props 不新增任何 StateTransaction 相关字段，仅接受 `runtime` 与可选 `layer`，并在实现注释中明确事务观测策略只能通过 Runtime.make / Module.implement 配置
- [x] T061 [US1] 在 `packages/logix-react/test` 中新增集成测试：在相同 `Logix.Runtime.make` instrumentation 配置下，对比“直接使用 Runtime.run\*”与“包裹 RuntimeProvider（含/不含 layer）后通过 hook 调用”的行为，验证两种路径产出的 Debug 事件中事务级别（`"full"` / `"light"`）及 Patch/快照记录行为保持一致
- [x] T052 [US1] 在 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 中为每个 `moduleId + instanceId` 实现 StateTransaction 队列：确保任意时刻仅有一个活跃事务，新逻辑入口（dispatch/source-refresh/service-callback/devtools 操作）按 FIFO 排队，当前事务 commit/rollback 后再启动下一条
- [x] T053 [P] [US1] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中增加队列与串行语义测试：验证同一实例快速多次 dispatch 时事务按顺序执行且状态演进顺序与 dispatch 顺序一致，不同实例之间可以并行执行事务

**Checkpoint**: 在 core 层可以证明“一次逻辑入口 = 一次事务 + 一次状态提交”，并能在 Debug 事件流中看到 txnId 聚合。

---

## Phase 4: User Story 2（P2）- Devtools 以「蓝图 / setup / run」调试 Trait

**Goal**: Devtools 能在同一面板中展示 Trait 蓝图、setup 状态与 run 行为，支持从 Trait 节点跳转到相关事务和事件。

**Independent Test**: 在 TraitForm 等 Demo 上，无需启动真实 Env，仅加载蓝图 + setup 即可看到 TraitGraph 与接线状态；运行时可以从 Trait 节点展开相关事务与事件。

### Tests for US2

- [x] T017 [P] [US2] 在 `packages/logix-core/test/Debug.test.ts` 或新建测试中，验证 `Debug.getModuleTraitsById` 能在 dev 环境下返回正确的 StateTraitProgram/Graph/Plan，并在 prod 环境下按规范退化（不注册或返回 undefined）
- [x] T018 [P] [US2] 在 `packages/logix-devtools-react/test` 中增加 TraitGraph 渲染与 lifecycle 状态测试（基于简单模块 + mock Program/Graph）

### Implementation for US2

- [x] T019 [US2] 完成 StateTraitProgram / StateTraitGraph / StateTraitPlan 的蓝图层数据结构与导出（对齐 `data-model.md`），在 `packages/logix-core/src/StateTrait.ts` / `internal/state-trait/model.ts`
- [x] T020 [US2] 在 Module.make 阶段将生成的 StateTraitProgram 注册进 ModuleTraitsRegistry，并通过 `Debug.getModuleTraitsById` 提供给 Devtools 使用（`packages/logix-core/src/Module.ts` + `Debug.ts`）
- [x] T021 [US2] 在 ModuleRuntime / BoundApi 构造阶段实现 setup 阶段：为每个 source 字段注册刷新入口、为 Devtools/Debug 注册 TraitPlanId/Graph 节点锚点（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` / `BoundApiRuntime.ts`）
- [x] T022 [US2] 在 `packages/logix-devtools-react/src/state/**` 与 `packages/logix-devtools-react/src/ui/sidebar/Sidebar.tsx` 中增加 TraitGraph 视图模型与 lifecycle 标记（蓝图存在 / setup 状态 / run 事件），并打通 Trait 节点点击 → 时间线过滤的链路；为空 Module/Instance/Transaction 列表与断连状态实现统一的空状态提示文案与展示逻辑
- [x] T023 [US2] 更新 `specs/003-trait-txn-lifecycle/quickstart.md` 中与 TraitGraph / setup 相关的说明，使其覆盖“只加载蓝图 + setup”的结构校验场景

**Checkpoint**: Devtools 可以在 Module/Instance 级展示 Trait 蓝图与 setup 状态，并能从 Trait 节点查看相关事务与事件。

---

## Phase 5: User Story 3（P3）- 模块作者在大量 Trait 下仍能信任「一次交互 = 有界更新」

**Goal**: 在 Trait 数量较大时，单次交互仍然具有可预期的状态提交与渲染次数，并能在 Devtools 中直观地验证和对比。

**Independent Test**: 为包含 ~50 个 Trait 节点的示例模块构造若干交互场景，通过 Devtools 事务视图 + Timeline + React 渲染事件统计，证明每次交互的提交/渲染都在可接受上限内。

### Tests for US3

- [x] T024 [P] [US3] 在 `examples/logix-react` 或新建示例中构造一个包含大量 Trait 的模块（至少 50 个 Trait 节点），并为其添加集成测试，统计单次交互下的事务数量与 state:update 次数（`packages/logix-react/test` 下）
- [x] T025 [P] [US3] 在 `packages/logix-devtools-react/test/EffectOpTimelineView.test.tsx` 中增加基于 kind + txnId 的过滤测试，验证在大量事件情况下仍可快速筛选出目标事务和事件
- [x] T048 [P] [US3] 在 `packages/logix-devtools-react/test/OverviewStrip.test.tsx` 中为 Devtools 顶部时间轴总览条增加测试：验证按时间 bucket 聚合事务/渲染事件，并在框选一段区域时正确驱动下方 Transaction 列表与 Timeline 的时间过滤

- [x] T026 [US3] 优化 StateTxnContext 与 ModuleRuntime 处理大量 Patch / 事件时的性能（必要时引入 Patch 分组或惰性计算），确保在高 Trait 数量场景下仍满足 SC-001 中的性能约束（`packages/logix-core/src/internal/runtime/core/**`）
- [x] T027 [US3] 在 Devtools Timeline 视图中支持按 kind（action/trait/state/react-render/devtools）进行折叠与高亮，减少高噪音场景下的认知负担（`packages/logix-devtools-react/src/ui/timeline/EffectOpTimelineView.tsx`）
- [x] T028 [US3] 在 Devtools Transaction 视图中增加简单的“每事务 Patch 数 / 渲染次数”概要信息，帮助模块作者快速评估 Trait 规模对性能的影响（`packages/logix-devtools-react/src/ui/inspector/Inspector.tsx` 或新建 TransactionDetail 组件）
      // done in impl: DevtoolsState.settings + setMode reducer + DevtoolsShell mode 切换
- [x] T049 [US3] 在 `packages/logix-devtools-react/src/state/**` 与 `packages/logix-devtools-react/src/ui/shell/DevtoolsShell.tsx` 中实现 Devtools 观测粒度开关（例如 `"basic"` / `"deep"`），控制是否展示 Trait 级事件、`react-render` 事件与时间旅行控件，并将当前模式通过状态集中管理
- [x] T050 [US3] 在 `packages/logix-devtools-react/src/ui/overview/OverviewStrip.tsx` 中实现 Devtools 顶部时间轴总览条：按时间 bucket（基于时间线索引）展示事务数量（txnCount）与渲染次数（renderCount），根据预警阈值为不同 bucket 应用颜色标记，并将用户点击的 bucket 区间回写到 DevtoolsState.timelineRange，用于过滤 Timeline 事件；同时确保 overview 与左侧 Sidebar、中部 Timeline、右侧 Inspector 三列各自滚动，互不抢占滚动条焦点
      // settings.ts 合并在 state.ts 中实现，提供 DevtoolsSettingsSchema + load/persist
- [x] T054 [P] [US3] 在 `packages/logix-devtools-react/src/state/storage.ts`（及相邻的 settings/model 层）中实现 Devtools 设置持久化：定义集中管理的设置对象（观测模式、Trait 明细开关、时间旅行开关、overview 维度、事件窗口大小 `eventBufferSize` 等），在初始化时从 `localStorage` 读取，在设置变更时写回 `localStorage`，在 localStorage 不可用时优雅退化为仅内存态
      // 初版 settings 入口直接集成在 DevtoolsShell 顶部，后续可拆为独立 SettingsPanel
- [x] T055 [US3] 在 `packages/logix-devtools-react/src/ui/shell/DevtoolsShell.tsx` 与 `packages/logix-devtools-react/src/ui/settings/SettingsPanel.tsx` 中实现 Devtools 顶部 settings 入口和设置面板 UI，参考 Chrome DevTools 的交互：将所有会影响 Runtime/Devtools 开销的观测开关统一收敛到该面板，并与 T049/T054 中的状态与持久化逻辑打通

**Checkpoint**: 在高 Trait 密度场景下，单次交互仍然有可控的事务/提交/渲染上限，并可在 Devtools 中直观分析。

---

## Phase 6: User Story 4（时间旅行）- Devtools 支持按事务进行时间旅行

**Goal**: Devtools 可以回到某个事务前/后的状态，未来可扩展到事务内部步骤级的 time-travel。

**Independent Test**: 在 TraitForm 等 Demo 中进行多次交互，Devtools 记录一串事务；选中任意事务使用「回到事务前/后状态」按钮，模块实例和 UI 状态与当时一致，且不会重复触发外部副作用。

### Tests for US4

- [x] T029 [P] [US4] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中新增时间旅行相关测试：基于 StateTransaction 快照 + Patch 重建状态，并确保不触发外部 Effect（network/IO）
- [x] T030 [P] [US4] 在 `packages/logix-devtools-react/test` 中增加时间旅行 UI 测试：触发 applyTransactionSnapshot 后，Devtools 状态标记为 time-travel 模式，并支持“返回最新状态”

### Implementation for US4

- [x] T031 [US4] 在 ModuleRuntime 内实现 dev/test 环境下的 dev-only setState 能力：根据指定 txnId + mode("before" | "after") 将某个实例状态回放到事务前/后的状态（`packages/logix-core/src/Runtime.ts` 或 internal runtime core）
- [x] T032 [US4] 在 Runtime 与 Devtools 之间实现 `applyTransactionSnapshot(moduleId, instanceId, txnId, mode)` 契约，确保时间旅行操作本身不会重新触发外部服务调用或副作用，并为每次 time-travel 创建一条 `origin.kind = "devtools"` 的 StateTransaction 记录回放轨迹（`specs/003-trait-txn-lifecycle/contracts/devtools-runtime-contracts.md` 对应实现）
- [x] T033 [US4] 在 Devtools UI 中为选中 Transaction 提供「回到事务前状态 / 回到事务后状态 / 返回最新状态」按钮，并在界面显著位置标记当前 time-travel 状态（`packages/logix-devtools-react/src/ui/inspector/Inspector.tsx` / `packages/logix-devtools-react/src/ui/shell/DevtoolsShell.tsx`）
- [x] T034 [US4] 在 `specs/003-trait-txn-lifecycle/quickstart.md` 中扩展时间旅行验证步骤，覆盖“多事务 + 回到第 k 个事务前/后”场景

**Checkpoint**: Devtools 可以在 dev/test 环境中对事务进行 time-travel，且不会破坏业务副作用语义。

---

## Phase 7: User Story 5（视图渲染事件）- Devtools 中可见组件 render 与事务对齐

**Goal**: 在 Devtools Timeline 中直接看到组件渲染事件，并能与 StateTransaction 对齐，帮助分析 Trait + 事务对 UI 影响。

**Independent Test**: 在 TraitForm Demo 中输入字符，通过 Devtools Timeline 看到对应事务内的 `react-render` 事件，并统计渲染次数与字段更新范围。

### Tests for US5

- [x] T035 [P] [US5] 在 `packages/logix-react/test` 中增加渲染事件集成测试：使用 useModule/useSelector 渲染组件，断言在 dev 环境下会发出 `kind = "react-render"` Debug 事件，包含 componentLabel/selectorKey/fieldPaths 等 meta
- [x] T036 [P] [US5] 在 `packages/logix-devtools-react/test/EffectOpTimelineView.test.tsx` 中增加 `react-render` 事件可视化与过滤测试

### Implementation for US5

- [x] T037 [US5] 在 `packages/logix-react/src/hooks/useModule.ts` 或相关 hook 中，在 render 后的 effect 里发出 `kind = "react-render"` 的 Debug 事件，通过 RuntimeDebugEvent 标准化后暴露给 Devtools（meta 中附带 componentLabel/selectorKey/fieldPaths/strictModePhase）
- [x] T038 [US5] 设计并实现将 render 事件与 StateTransaction 对齐的策略（例如通过最近一次 state:update 的 txnId 推断），并在 Devtools 侧按 txnId 过滤展示 `react-render` 事件（`packages/logix-devtools-react/src/state/compute.ts` + `packages/logix-devtools-react/src/ui/timeline/EffectOpTimelineView.tsx`）
- [x] T039 [US5] 在 Timeline UI 中为 `react-render` 事件设计专用样式（icon/颜色），并提供开关以在高噪音场景下折叠/展开渲染事件（`packages/logix-devtools-react/src/ui/timeline/EffectOpTimelineView.tsx`）
- [x] T040 [US5] 更新 `specs/003-trait-txn-lifecycle/quickstart.md` 中相关段落，加入“在 Timeline 中观察组件渲染事件”的完整 walkthrough

**Checkpoint**: Devtools 可以在事务视图中清晰展示组件渲染事件，并支持按事务分析 render 次数与影响范围。

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 收尾工作、性能/文档/对齐细节。

- [x] T041 [P] 整理并补全 `docs/ssot/runtime/logix-core/*` 与 `impl/README.md` 中与 StateTransaction / Trait 生命周期 / RuntimeDebugEvent / Devtools 契约相关的文档描述
- [x] T042 [P] 在 `specs/003-trait-txn-lifecycle/references/future-devtools-data-model.md` 中记录本轮实现与原设计之间的差异与后续扩展点（例如事务内部步级 time-travel、录制/回放）
- [x] T043 在 `packages/logix-core` / `packages/logix-react` / `packages/logix-devtools-react` 中做一次轻量代码清理与注释整理：统一通过 `@logixjs/core/Env`（`packages/logix-core/src/internal/runtime/core/env.ts`）暴露 `getNodeEnv` / `isDevEnv`，在 `packages/logix-react/src/internal/env.ts` 中仅做 re-export，移除所有直接访问 `process.env.NODE_ENV` 的代码，并确保 dev-only 逻辑都有明确注释与 `isDevEnv()` 守卫
- [x] T044 跑通 `quickstart.md` 中列出的验证路径，按故事顺序检查：事务视图 → TraitGraph → 时间线游标 → 时间旅行 → 渲染事件 → 高 Trait 密度场景
- [x] T045 [P] 在 `apps/docs/content/docs/guide/advanced/performance-and-optimization.md` 新增“Logix 性能与优化”专题页面，系统整理本特性涉及的事务观测策略（Instrumentation Policy）、Devtools 观测粒度开关、中间件层防抖/节流、Trait 粒度选择等可选优化手法，并以典型场景（高频输入表单、长时间运行模块、Devtools 打开/关闭对比等）分类说明
- [x] T051 在 `examples/logix-react/src/demos/trait-txn-devtools-demo.tsx` 中新增 Demo Page：挂载 TraitForm/TraitFormAdvanced 模块与 Devtools 面板，展示事务视图、时间旅行、渲染事件与顶部时间轴总览条，作为业务开发者感知性能差异与观测模式的入口
- [x] T052 在 Resource/Query reference 与 runtime SSoT 用户文档的 best-practices 中补充约定：在 StateTrait.source 等 DSL 中，推荐通过 `ResourceRef`（或 `ResourceRef.id`）为 resourceId 赋值，而不是散落字符串常量；并在示例中给出统一写法：`specs/001a-module-traits-runtime/references/resource-and-query.md`, `docs/ssot/runtime`
- [x] T074 在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`（或相邻 Runtime 指南）中增加面向业务开发者的「事务边界与逻辑入口心智」小节：
  - 用非 PoC 语言解释“什么时候会开一笔新的 StateTransaction”：至少覆盖“逻辑入口（dispatch / traits.source.refresh / service-callback / devtools 操作）”、“新 Runtime/实例首次进入”、“每次 dispatch 都是一次入口”等规则；
  - 配合 2–3 个典型示例（简单点击、带 loading 的请求、错误使用：在单个 Effect.gen 中跨异步直接 update state），分别标出事务 1/2/… 的边界与执行顺序；
  - 明确推荐心智：用户只需记住“所有业务入口都是显式事务窗口，异步边界不会自动拆事务；长链路用多入口或 Task Runner（未来）表达”，并在文档中链接回 runtime SSoT SSoT 的详细设计章节。
- [x] T075 在 `packages/logix-core/src/internal/runtime/core` 下新增 DevtoolsHub 全局单例与 Hub Sink，实现 Debug 事件的进程/页面级聚合（对齐 FR-018）：
  - 将 `packages/logix-devtools-react/src/snapshot.ts` 中 ring buffer / instance counter / latestStates / instanceLabels 等能力下沉为 core internal（如 `DevtoolsHub.ts`）；
  - 在 `packages/logix-core/src/Debug.ts` 暴露 `Debug.getDevtoolsSnapshot / subscribeDevtoolsSnapshot / clearDevtoolsEvents / setInstanceLabel / getInstanceLabel` 等只读 API；
  - 补齐 `Debug.devtoolsHubLayer({ bufferSize? })`，并在 Debug 命名空间新增一个“追加 sinks”原语（如 `Debug.appendSinks`），确保 Hub Sink 以追加方式挂入当前 sinks 集合；
  - 暴露 `Debug.isDevtoolsEnabled()`（由 devtoolsHubLayer 打开）供 React/Devtools UI 判断 devtools 开关。
- [x] T076 [P] 在 `packages/logix-core/test` 中新增 DevtoolsHub 单测：
  - 验证 Hub Sink 追加后能收集 action/state/trace:\* 事件并形成 snapshot；
  - `clearDevtoolsEvents` 会清空 ring buffer 且不影响其他 Debug sinks；
  - `appendSinks` 不覆盖调用方已有 sinks。
- [x] T077 扩展 `packages/logix-core/src/Runtime.ts` 的 `RuntimeOptions` 增加 `devtools?: true | DevtoolsRuntimeOptions` 一键启用入口，并在 `Runtime.make` 内自动 wiring：
  - 若 devtools 启用，自动 merge `Debug.devtoolsHubLayer({ bufferSize })` 到 appLayer（追加 sinks 语义）；
  - 自动在 `options.middleware ?? []` 上追加 DebugObserver（`Middleware.withDebug`），产出 `trace:effectop` 并携带 txnId；
  - devtools 为显式 override：只要传入即生效，不受 `isDevEnv()` 裁剪；同时定义并导出 `DevtoolsRuntimeOptions`（仅含启动/桥接级字段：Hub bufferSize、observer/filter、react-render 采样/限频、未来 replaceSinks 等）。
- [x] T078 [P] 在 `packages/logix-core/test` 中补充 Runtime devtools 选项测试：
  - 在 `isDevEnv() = false` 的模拟环境下，`Runtime.make({ devtools: true })` 仍会产出 hub snapshot 与 trace:effectop；
  - 断言 hub sink 追加后不影响现有 Debug.layer/replace 行为；
  - 验证 observer 产出的 EffectOp 事件 txnId 与事务队列语义对齐。
- [x] T079 在 `packages/logix-react/src/hooks/useSelector.ts`（及其他 render 埋点处）调整渲染事件 gating：
  - 由 `isDevEnv()` 单条件改为 `isDevEnv() || Logix.Debug.isDevtoolsEnabled()`；
  - 在 devtools 启用时无视 `isDevEnv()` 采集 `trace:react-render`，并预留从 DevtoolsRuntimeOptions / Settings 回流读取采样率的接线位。
- [x] T080 [P] 在 `packages/logix-react/test/runtime-react-render-events.integration.test.tsx`（或新建测试）中增加用例：
  - 在非 dev 环境 + devtools 启用时仍采集 `react-render` 事件；
  - 与 txnId 对齐的兜底逻辑不回归。
- [x] T081 在 `packages/logix-devtools-react` 中移除内置 snapshot/sink，改为直接消费 core DevtoolsHub：
  - 删除或空实现 `src/snapshot.ts` 与 `DevtoolsSnapshotStore` 对 ring buffer 的自建依赖；
  - `DevtoolsLogic/DevtoolsState` 改为订阅 `Debug.subscribeDevtoolsSnapshot`，从 core snapshot 派生 UI 状态；
  - 对外继续导出 `devtoolsLayer` 作为薄别名（指向 `Debug.devtoolsHubLayer()`），并标注 deprecated；
  - 确保现有 Devtools UI 行为与 localStorage 设置不回归。
- [x] T082 [P] 更新 `packages/logix-devtools-react/test` 以适配 core Hub：
  - OverviewStrip/Timeline/TimeTravel 等测试改为通过 core snapshot 注入事件；
  - 验证 Devtools 在多 runtimeLabel 下的分组与切换仍正确。
- [x] T083 [P] 迁移 `examples/logix-react` 及其他示例为一键启用写法：
  - 将原先手动组合 `devtoolsLayer` / `Middleware.withDebug` 的 Runtime 改为 `Runtime.make(..., { devtools: true })`；
  - 删除 demo 中为“看见 trait”临时加的 withDebug wiring，保持示例与最终推荐 API 一致。
- [x] T084 在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md` 中补充“一键启用 Devtools”与环境提示：
  - 用产品视角说明 `Runtime.make({ devtools: true })` 自动做了什么（Hub + Observer + react-render）；
  - 明确 devtools 为显式 override，是否在生产环境启用由用户自行判断，并提示开销/风险；
  - 更新示例代码与 quickstart 链接。
- [x] T085 [P] SSoT 回写：在 `docs/ssot/runtime/logix-core/observability/09-debugging.md` 与 `docs/ssot/runtime/logix-core/impl/README.md` 中补充 DevtoolsHub 与一键启用契约说明（不影响 apps/docs 的产品叙事）。
- [x] T057 [P] 在 `packages/logix-devtools-react/src/state/compute.ts` 中基于 `RuntimeDebugEventRef` 增加“操作窗口”统计逻辑：
  - 从关键逻辑入口事件（如 `action:dispatch` / `devtools` 操作）起，维护一个短时间窗口（默认 1000ms，可读取/复用现有 `DevtoolsSettings.eventBufferSize` 配置），收集窗口内的所有相关事件（action/state/service/`react-render` 等），在无新事件进入的 1000ms 之后归并为一次“操作摘要”；
  - 抽象出纯函数（例如 `groupEventsIntoOperationWindows(events, settings)`）便于单元测试，不在 UI 层直接操作原始事件数组。
- [x] T058 在 `packages/logix-devtools-react/src/ui/shell/DevtoolsShell.tsx`（或新建 `ui/summary/OperationSummaryBar.tsx`）中实现固定 info bar UI：
  - 将 T057 中的“最近一次操作摘要”（事件计数、渲染次数、持续时间等）以受控 props 的形式渲染为顶部信息条，贴合 Timeline/Overview 区域上方；
  - 默认不自动消失，由下一次操作覆盖或由用户点击关闭按钮隐藏；
  - 确保在窄视口下 info bar 不抢占主要调试区域（必要时在小屏幕上折叠为一行摘要 + tooltip 详情）。
- [x] T059 在 `packages/logix-devtools-react/src/ui/timeline/EffectOpTimelineView.tsx`（或其子组件）中为新进入的事件行增加轻量入场动画：
  - 采用基于 `transform` + `opacity` 的简单从右向左滑入/淡入效果，并可选加入轻微的错峰 delay（stagger）以增强“这一批事件刚刚发生”的时间感知；
  - 动画实现需遵守性能约束：不打断虚拟滚动/大列表性能，优先使用 CSS 动画或 Tailwind 动画类，不在每行组件中引入复杂的 `useState`/`useEffect`；
  - 尊重用户的「减少动态效果」偏好（`prefers-reduced-motion`），在该模式下自动禁用入场动画，仅保留静态高亮。
- [x] T060 在 `packages/logix-devtools-react/src/ui/overview/OverviewStrip.tsx` 中增强 Overview 柱状条的“新增反馈”效果：
  - 当 bucket 计数在最近一次聚合中发生变化时，将其标记为“新近更新”：在计算 buckets 时附加一个 `lastChangedAt` 或等价标记，并在渲染时根据当前时间与 `settings.overviewHighlightDurationMs`（新配置项，默认数秒）决定是否处于高亮期；
  - 处于高亮期的 bucket 应在颜色与微动效上与其他柱子区分，例如使用略微更亮的描边/填充色，并配合轻微上下跳动或轻度 scale 动画，帮助用户在多柱子中一眼看出“刚刚动过的是哪几根”；
  - 动画同样需要遵守性能与可访问性约束：
    - 优先使用 CSS transition/animation（基于 `transform`），不在每个柱子内部挂重型 hooks；
    - 遵守 `prefers-reduced-motion`，在该模式下仅使用静态颜色高亮而不做跳动动画。

- [x] T061 [P] 在 `packages/logix-devtools-react/src/state/model.ts` 中为 Settings v2 扩展配置字段：
  - 在 `DevtoolsSettingsSchema` 中增加：
    - `operationWindowMs: Schema.Number`（操作摘要时间窗口，默认 1000）；
    - `overviewHighlightDurationMs: Schema.Number`（Overview 高亮持续时长，默认数秒）；
  - 为上述字段在 `defaultSettings` 中提供默认值，并在 `loadSettingsFromStorage` / `persistSettingsToStorage` 中补齐读取与裁剪逻辑（包括合理的最小/最大值约束），保持对旧版本 `__logix_devtools_settings_v1__` 数据的兼容；
  - 确保新字段不会破坏现有 DevtoolsState 结构与调试行为，在未配置时回退到默认值。
- [x] T062 在 `packages/logix-devtools-react/src/ui/shell/DevtoolsShell.tsx` 与 `packages/logix-devtools-react/src/ui/settings/SettingsPanel.tsx` 中实现集中设置面板 UI：
  - 在 header 右侧新增 Settings 按钮（图标 + tooltip），点击后在 Devtools 内部弹出/展开 Settings 面板：
    - Core 区域：`mode`（basic/deep）、`showTraitEvents`、`showReactRenderEvents`、`enableTimeTravelUI`、`eventBufferSize`（数值输入或 slider）、`operationWindowMs`；
    - Advanced 区域（可折叠）：`overviewThresholds.*`、`overviewHighlightDurationMs`、`sampling.reactRenderSampleRate`；
  - Settings 面板通过 DevtoolsState 的 actions 更新 `settings`，不直接访问 localStorage，所有变更需即时体现在 Timeline/Overview/TimeTravel 行为上；
  - 保留 header 中现有的模式/主题切换快捷入口，但将其它与 Runtime 开销相关的细粒度开关迁移到 Settings 面板中，避免在 header 上分散多个零散按钮。

---

## Phase 9: Future Work - 长链路 Task Runner（run\*Task）

**Purpose**: 在不改变“逻辑入口 = 事务边界”内核不变量的前提下，为业务提供线性长链路写法（pending → IO → result）的通用语法糖，降低多入口拆事务的心智负担。本 Phase 为后续演进，不阻塞本轮 US1–US5 交付。

### Core Types & API Surface

- [x] T063 [Future] 在 `packages/logix-core/src/internal/runtime/core/TaskRunner.ts` 中定义 Task Runner 的核心类型与运行期模型：
  - `TaskRunnerConfig`（pending/effect/success/failure/origin/priority）与 `TaskExecution`（taskId/status/时间戳）结构；
  - 导出最小 helper（如 `makeTaskRunner(stream, mode, config)`）供 IntentBuilderFactory 复用。
- [x] T064 [Future] 在 `packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts` 的 `IntentBuilder` 接口中新增四个方法签名：
  - `runTask / runLatestTask / runExhaustTask / runParallelTask`；
  - 并在 `packages/logix-core/src/Logic.ts` 的对外类型别名中同步暴露。

### Builder Implementation（Bound/Flow）

- [x] T065 [Future] 在 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` 的 IntentBuilderFactory 中实现 `runTask` 与 `runParallelTask`：
  - 镜像 `flowApi.run` / `flowApi.runParallel` 的 stream 处理方式；
  - 对每次“被接受的触发”先 enqueue pending 事务，再 fork 运行 IO，并在完成时 enqueue 写回事务。
- [x] T066 [Future] 在同一 IntentBuilderFactory 中实现 `runExhaustTask`：
  - 复用 `FlowRuntime.runExhaust` 的 busyRef/互斥模式；
  - 被忽略触发不产生 pending 事务。
- [x] T067 [Future] 在同一 IntentBuilderFactory 中实现 `runLatestTask`：
  - 新触发到来时对旧 task Fiber 发起 `interrupt`；
  - 在写回阶段使用递增 `taskId` guard，确保旧 task 永不写回。

### Transaction Alignment & Origins

- [x] T068 [Future] 通过 `BoundApiRuntime.__runWithStateTransaction` 实现 pending 独立事务入口：
  - 默认 `origin.kind = "task:pending"`，`origin.name` 为触发源（actionTag/fieldPath）或用户覆写值；
  - pending 只对被接受并启动的 task 执行。
- [x] T069 [Future] 通过同一事务助手实现 success/failure 写回事务入口：
  - 默认 `origin.kind = "service-callback"`，`origin.name = "task:success" | "task:failure"`；
  - 支持 config 覆写 origin。
- [x] T070 [Future] 增加 dev/test 诊断守卫：当 `run*Task` 被误用在 Reducer/Trait-run 的同步事务 body 内时，发出 `logic::invalid_usage` 诊断或结构化 Debug 事件，提示作者改为 watcher/多入口模式。

### Tests & Docs

- [x] T071 [P] [Future] 在 `packages/logix-core/test/TaskRunner.test.ts` 中补齐单测：
  - pending 为独立事务且在 txnQueue 中先于写回事务；
  - `runLatestTask` 中断 + guard 不写回旧结果；
  - `runExhaustTask` busy 忽略不产生 pending；
  - `runParallelTask` 并发下事务顺序与结果对应一致。
- [x] T072 [P] [Future] 在 `packages/logix-react/test` 或示例集成测试中补齐长链路用法验证：
  - `$.onAction("refresh").runLatestTask(...)` 的 loading/写回视觉行为；
  - 与现有事务/渲染事件对齐不回归。
- [x] T073 [Future] 文档回写：
  - 在 `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md` 增加长链路 Task Runner 的心智模型与正反例；
  - 在 `apps/docs/content/docs` 增加面向业务开发者的 `run*Task` 使用指南（无 PoC 术语）。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** → 无依赖，可立即开始。
- **Phase 2: Foundational** → 依赖 Phase 1，完成后才允许开始任何 user story 实现。
- **Phase 3~8: User Stories & Polish** → 依赖 Phase 2 完成；
  - US1（事务语义）优先，其它故事（US2~US5）可在 US1 基础上并行推进；
  - Polish 阶段依赖所有希望纳入本轮的 user story 完成。
- **Phase 9: Future Task Runner** → 依赖 Phase 2 + US1 的事务语义稳定后再启动；不阻塞本轮交付，可单独后续推进。

### User Story Dependencies

- **US1**：仅依赖 Foundational（Phase 2），是所有后续故事的业务基础。
- **US2**：依赖 US1 的事务模型，但在结构层（蓝图/setup）上也可并行推进一部分；
- **US3**：依赖 US1（事务）与 US2（TraitGraph/Devtools 视图）基础能力；
- **US4**：强依赖 US1（StateTransaction + Patch + 快照模型）、US2（Devtools 事务视图），建议在 US1+US2 完成后实现；
- **US5**：依赖 US1（txnId 语义）与 US2/US3（Timeline 视图），与 US4 部分可并行推进。

### Parallel Opportunities

- Phase 1/2 中标记为 [P] 的任务可以在不同包/目录下并行；
- 在 US1 完成后：
  - US2（Trait 蓝图/setup/run Devtools 视图）、US5（React 渲染事件）可以并行开发；
  - US4（时间旅行）可在 US1 的事务模型稳定后先做 Runtime 部分，UI 集成与 US2/US3 的 Devtools 视图可以并行推进；
  - US3 的性能与可视化优化可以穿插在 Devtools UI 实现过程中。

### MVP Strategy

- 最小可演示增量通常为：完成 Phase 1/2 + US1 + 部分 US2：
  - Runtime：事务模型 + StateTxnContext + Debug 事件聚合；
  - Devtools：基本 Module/Instance/Transaction 视图与 Timeline；
  - 示例：TraitForm 上可以看到“一次交互 = 一次事务 + 一次提交”的行为。
- 后续可以按优先级依次接入：
  - US2 完整 Trait 蓝图/setup/run 视图；
  - US4 时间旅行；
  - US5 渲染事件；
  - US3 高 Trait 密度下的性能与可视化优化。
