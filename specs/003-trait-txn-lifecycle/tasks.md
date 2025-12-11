---

description: "Task list for 003-trait-txn-lifecycle implementation"

---

# Tasks: 003-trait-txn-lifecycle（StateTrait 状态事务 / 生命周期分层 + Devtools 升级）

**Input**: Design documents from `/specs/003-trait-txn-lifecycle/`  
**Prerequisites**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**Tests**: 本特性落点在 `@logix/core` / `@logix/react` / `@logix-devtools-react` 三个核心包，测试视为必选：每个 user story 至少要有对应的单测 / 集成测试任务。

**Organization**: 按 user story 分阶段拆解，保证每个故事都可以独立实现与验证。

## Phase 1: Setup（环境与文档基线）

**Purpose**: 对齐 feature 分支环境与文档入口，保证后续任务落点清晰。

- [ ] T001 确认 feature 分支与规范文件存在（`003-trait-txn-lifecycle` / `spec.md` / `plan.md`）  
- [ ] T002 [P] 在 `docs/specs/runtime-logix/core` 下定位需更新的文档条目并加上 TODO 标记（如 02-module-and-logic-api.md、03-logic-and-flow.md）  
- [ ] T003 [P] 在 `packages/logix-core`、`packages/logix-react`、`packages/logix-devtools-react` 目录下运行一次 `pnpm test` / `pnpm typecheck`，记录当前基线状态

---

## Phase 2: Foundational（事务内核与统一 Debug 事件模型）

**Purpose**: 建立 StateTransaction / StateTxnContext 内核与 RuntimeDebugEvent 标准化，是所有 user story 的基础。

### 内核：StateTransaction / StateTxnContext

- [ ] T004 定义 StateTxnContext 类型与基本 API（beginTransaction/updateDraft/recordPatch/commit）在 `packages/logix-core/src/internal/runtime/core/**`（根据现有 ModuleRuntime 内核文件实际落点）  
- [ ] T005 将 ModuleRuntime 的状态写入逻辑改造为基于 StateTxnContext 的单事务提交（入口在 `packages/logix-core/src/Runtime.ts` 或对应 internal runtime 文件）  
- [ ] T006 为 StateTransaction / StatePatch 建立最小单元测试，在 `packages/logix-core/test/ModuleRuntime.test.ts` 验证“一次 dispatch 只提交一次 state:update + Patch 聚合”  

### 事件模型：RuntimeDebugEvent 标准化

- [ ] T007 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 或等价位置定义 RuntimeDebugEventRef 标准结构（对齐 `specs/003-trait-txn-lifecycle/data-model.md` 中的 TraitRuntimeEvent / RuntimeDebugEventRef）  
- [ ] T008 [P] 实现 `Logix.Debug.Event -> RuntimeDebugEventRef` 的归一化转换函数（填充 eventId/moduleId/instanceId/runtimeId/txnId/kind/label/meta）并在 DevtoolsSink 之前应用  
- [ ] T009 [P] 为 Debug 事件标准化增加单测（覆盖 action/state/service/trait-* 类型），在 `packages/logix-core/test/Debug.test.ts` 或新建测试文件中断言 kind/label/meta 映射  

**Checkpoint**: Runtime 可以按事务提交状态，并产出统一的 RuntimeDebugEventRef 序列。

---

## Phase 3: User Story 1（P1）- Runtime 维护者按事务推理状态变化

**Goal**: “一次逻辑入口 = 一次 StateTransaction 提交，对外只见一次状态写与通知”，并在 Devtools 里能看到完整事务轨迹。

**Independent Test**: 使用 TraitForm 或等价示例，通过一次用户交互触发一次动作，只产生一条状态提交事件和一个事务视图（内部可含多步 Trait / Middleware）。

### Tests for US1

- [ ] T010 [P] [US1] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中新增事务级测试用例：多步 Reducer / Trait 更新只产生一次底层 state 写入与一次 debug state:update  
- [ ] T011 [P] [US1] 在 `examples/logix-react` 对应测试或新建测试中验证“一次交互 → 一条事务 + 一次视图状态更新”，可使用 Vitest + React Testing Library

### Implementation for US1

- [ ] T012 [US1] 在 ModuleRuntime 的逻辑入口（action dispatch / source-refresh / service 回写 / devtools 操作）处统一调用 StateTxnContext.beginTransaction，并记录 origin/txnId（文件：`packages/logix-core/src/Runtime.ts` 或对应 internal runtime 文件）  
- [ ] T013 [US1] 将 Reducer / Trait / Middleware 的状态写行为改为写入事务草稿状态，并通过 StateTxnContext.recordPatch 记录字段级 Patch（涉及 `packages/logix-core/src/State.ts` / `state-trait.ts` / middleware 内部）  
- [ ] T014 [US1] 在事务结束处实现 commit：写入底层状态容器、发出一次 state:update Debug 事件，并将 txnId 传入 RuntimeDebugEventRef（`packages/logix-core/src/internal/runtime/core/DebugSink.ts`）  
- [ ] T015 [US1] 扩展 `packages/logix-core/src/internal/runtime/core/EffectOpCore.ts` 或 DebugObserver，使 EffectOp 事件在传入 DebugSink 时附带 txnId 信息，确保 Devtools 能按事务聚合事件  
- [ ] T016 [US1] 在 `specs/003-trait-txn-lifecycle/quickstart.md` 中补充/校正 US1 验证步骤（从 TraitForm 交互 → 查事务列表 → 检查单次提交与 Patch 聚合）

**Checkpoint**: 在 core 层可以证明“一次逻辑入口 = 一次事务 + 一次状态提交”，并能在 Debug 事件流中看到 txnId 聚合。

---

## Phase 4: User Story 2（P2）- Devtools 以「蓝图 / setup / run」调试 Trait

**Goal**: Devtools 能在同一面板中展示 Trait 蓝图、setup 状态与 run 行为，支持从 Trait 节点跳转到相关事务和事件。

**Independent Test**: 在 TraitForm 等 Demo 上，无需启动真实 Env，仅加载蓝图 + setup 即可看到 TraitGraph 与接线状态；运行时可以从 Trait 节点展开相关事务与事件。

### Tests for US2

- [ ] T017 [P] [US2] 在 `packages/logix-core/test/Debug.test.ts` 或新建测试中，验证 `Debug.getModuleTraitsById` 能在 dev 环境下返回正确的 StateTraitProgram/Graph/Plan，并在 prod 环境下按规范退化（不注册或返回 undefined）  
- [ ] T018 [P] [US2] 在 `packages/logix-devtools-react/test` 中增加 TraitGraph 渲染与 lifecycle 状态测试（基于简单模块 + mock Program/Graph）

### Implementation for US2

- [ ] T019 [US2] 完成 StateTraitProgram / StateTraitGraph / StateTraitPlan 的蓝图层数据结构与导出（对齐 `data-model.md`），在 `packages/logix-core/src/state-trait.ts` / `internal/state-trait/model.ts`  
- [ ] T020 [US2] 在 Module.make 阶段将生成的 StateTraitProgram 注册进 ModuleTraitsRegistry，并通过 `Debug.getModuleTraitsById` 提供给 Devtools 使用（`packages/logix-core/src/Module.ts` + `Debug.ts`）  
- [ ] T021 [US2] 在 ModuleRuntime / BoundApi 构造阶段实现 setup 阶段：为每个 source 字段注册刷新入口、为 Devtools/Debug 注册 TraitPlanId/Graph 节点锚点（`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` / `BoundApiRuntime.ts`）  
- [ ] T022 [US2] 在 `packages/logix-devtools-react/src/state.ts` 与 `Sidebar.tsx` 中增加 TraitGraph 视图模型与 lifecycle 标记（蓝图存在 / setup 状态 / run 事件），并打通 Trait 节点点击 → 时间线过滤的链路  
- [ ] T023 [US2] 更新 `specs/003-trait-txn-lifecycle/quickstart.md` 中与 TraitGraph / setup 相关的说明，使其覆盖“只加载蓝图 + setup”的结构校验场景

**Checkpoint**: Devtools 可以在 Module/Instance 级展示 Trait 蓝图与 setup 状态，并能从 Trait 节点查看相关事务与事件。

---

## Phase 5: User Story 3（P3）- 模块作者在大量 Trait 下仍能信任「一次交互 = 有界更新」

**Goal**: 在 Trait 数量较大时，单次交互仍然具有可预期的状态提交与渲染次数，并能在 Devtools 中直观地验证和对比。

**Independent Test**: 为包含 ~50 个 Trait 节点的示例模块构造若干交互场景，通过 Devtools 事务视图 + Timeline + React 渲染事件统计，证明每次交互的提交/渲染都在可接受上限内。

### Tests for US3

- [ ] T024 [P] [US3] 在 `examples/logix-react` 或新建示例中构造一个包含大量 Trait 的模块（至少 50 个 Trait 节点），并为其添加集成测试，统计单次交互下的事务数量与 state:update 次数（`packages/logix-react/test` 下）  
- [ ] T025 [P] [US3] 在 `packages/logix-devtools-react/test/EffectOpTimelineView.test.tsx` 中增加基于 kind + txnId 的过滤测试，验证在大量事件情况下仍可快速筛选出目标事务和事件

### Implementation for US3

- [ ] T026 [US3] 优化 StateTxnContext 与 ModuleRuntime 处理大量 Patch / 事件时的性能（必要时引入 Patch 分组或惰性计算），确保在高 Trait 数量场景下仍满足 SC-001 中的性能约束（`packages/logix-core/src/internal/runtime/core/**`）  
- [ ] T027 [US3] 在 Devtools Timeline 视图中支持按 kind（action/trait/state/react-render/devtools）进行折叠与高亮，减少高噪音场景下的认知负担（`packages/logix-devtools-react/src/EffectOpTimelineView.tsx`）  
- [ ] T028 [US3] 在 Devtools Transaction 视图中增加简单的“每事务 Patch 数 / 渲染次数”概要信息，帮助模块作者快速评估 Trait 规模对性能的影响（`packages/logix-devtools-react/src/Inspector.tsx` 或新建 TransactionDetail 组件）  

**Checkpoint**: 在高 Trait 密度场景下，单次交互仍然有可控的事务/提交/渲染上限，并可在 Devtools 中直观分析。

---

## Phase 6: User Story 4（时间旅行）- Devtools 支持按事务进行时间旅行

**Goal**: Devtools 可以回到某个事务前/后的状态，未来可扩展到事务内部步骤级的 time-travel。

**Independent Test**: 在 TraitForm 等 Demo 中进行多次交互，Devtools 记录一串事务；选中任意事务使用「回到事务前/后状态」按钮，模块实例和 UI 状态与当时一致，且不会重复触发外部副作用。

### Tests for US4

- [ ] T029 [P] [US4] 在 `packages/logix-core/test/ModuleRuntime.test.ts` 中新增时间旅行相关测试：基于 StateTransaction 快照 + Patch 重建状态，并确保不触发外部 Effect（network/IO）  
- [ ] T030 [P] [US4] 在 `packages/logix-devtools-react/test` 中增加时间旅行 UI 测试：触发 applyTransactionSnapshot 后，Devtools 状态标记为 time-travel 模式，并支持“返回最新状态”

### Implementation for US4

- [ ] T031 [US4] 在 ModuleRuntime 内实现 dev/test 环境下的 dev-only setState 能力：根据指定 txnId + mode("before" | "after") 将某个实例状态回放到事务前/后的状态（`packages/logix-core/src/Runtime.ts` 或 internal runtime core）  
- [ ] T032 [US4] 在 Runtime 与 Devtools 之间实现 `applyTransactionSnapshot(moduleId, instanceId, txnId, mode)` 契约，确保时间旅行操作本身不会重新触发外部服务调用或副作用（`specs/003-trait-txn-lifecycle/contracts/devtools-runtime-contracts.md` 对应实现）  
- [ ] T033 [US4] 在 Devtools UI 中为选中 Transaction 提供「回到事务前状态 / 回到事务后状态 / 返回最新状态」按钮，并在界面显著位置标记当前 time-travel 状态（`packages/logix-devtools-react/src/Inspector.tsx` / `DevtoolsShell.tsx`）  
- [ ] T034 [US4] 在 `specs/003-trait-txn-lifecycle/quickstart.md` 中扩展时间旅行验证步骤，覆盖“多事务 + 回到第 k 个事务前/后”场景

**Checkpoint**: Devtools 可以在 dev/test 环境中对事务进行 time-travel，且不会破坏业务副作用语义。

---

## Phase 7: User Story 5（视图渲染事件）- Devtools 中可见组件 render 与事务对齐

**Goal**: 在 Devtools Timeline 中直接看到组件渲染事件，并能与 StateTransaction 对齐，帮助分析 Trait + 事务对 UI 影响。

**Independent Test**: 在 TraitForm Demo 中输入字符，通过 Devtools Timeline 看到对应事务内的 `react-render` 事件，并统计渲染次数与字段更新范围。

### Tests for US5

- [ ] T035 [P] [US5] 在 `packages/logix-react/test` 中增加渲染事件集成测试：使用 useModule/useSelector 渲染组件，断言在 dev 环境下会发出 `kind = "react-render"` Debug 事件，包含 componentLabel/selectorKey/fieldPaths 等 meta  
- [ ] T036 [P] [US5] 在 `packages/logix-devtools-react/test/EffectOpTimelineView.test.tsx` 中增加 `react-render` 事件可视化与过滤测试

### Implementation for US5

- [ ] T037 [US5] 在 `packages/logix-react/src/hooks/useModule.ts` 或相关 hook 中，在 render 后的 effect 里发出 `kind = "react-render"` 的 Debug 事件，通过 RuntimeDebugEvent 标准化后暴露给 Devtools（meta 中附带 componentLabel/selectorKey/fieldPaths/strictModePhase）  
- [ ] T038 [US5] 设计并实现将 render 事件与 StateTransaction 对齐的策略（例如通过最近一次 state:update 的 txnId 推断），并在 Devtools 侧按 txnId 过滤展示 `react-render` 事件（`packages/logix-devtools-react/src/state.ts` + TimelineView）  
- [ ] T039 [US5] 在 Timeline UI 中为 `react-render` 事件设计专用样式（icon/颜色），并提供开关以在高噪音场景下折叠/展开渲染事件（`packages/logix-devtools-react/src/EffectOpTimelineView.tsx`）  
- [ ] T040 [US5] 更新 `specs/003-trait-txn-lifecycle/quickstart.md` 中相关段落，加入“在 Timeline 中观察组件渲染事件”的完整 walkthrough

**Checkpoint**: Devtools 可以在事务视图中清晰展示组件渲染事件，并支持按事务分析 render 次数与影响范围。

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 收尾工作、性能/文档/对齐细节。

- [ ] T041 [P] 整理并补全 `docs/specs/runtime-logix/core/*` 与 `impl/README.md` 中与 StateTransaction / Trait 生命周期 / RuntimeDebugEvent / Devtools 契约相关的文档描述  
- [ ] T042 [P] 在 `specs/003-trait-txn-lifecycle/references/future-devtools-data-model.md` 中记录本轮实现与原设计之间的差异与后续扩展点（例如事务内部步级 time-travel、录制/回放）  
- [ ] T043 在 `packages/logix-core` / `packages/logix-react` / `packages/logix-devtools-react` 中做一次轻量代码清理与注释整理，确保 dev-only 逻辑都有明确注释与 `isDevEnv()` 守卫  
- [ ] T044 跑通 `quickstart.md` 中列出的验证路径，按故事顺序检查：事务视图 → TraitGraph → 时间线游标 → 时间旅行 → 渲染事件 → 高 Trait 密度场景

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** → 无依赖，可立即开始。  
- **Phase 2: Foundational** → 依赖 Phase 1，完成后才允许开始任何 user story 实现。  
- **Phase 3~8: User Stories & Polish** → 依赖 Phase 2 完成；  
  - US1（事务语义）优先，其它故事（US2~US5）可在 US1 基础上并行推进；  
  - Polish 阶段依赖所有希望纳入本轮的 user story 完成。

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

