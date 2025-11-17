---
description: "Task list for 032-ui-projection-contract (PresentationState / BindingSchema / UiBlueprint / UiKitRegistry)"
---

# Tasks: UI Projection Contract（032：语义编排与 UI 投影解耦）

**Input**: `specs/032-ui-projection-contract/spec.md`  
**Prerequisites**: `specs/032-ui-projection-contract/plan.md`（required）, `specs/032-ui-projection-contract/research.md`, `specs/032-ui-projection-contract/data-model.md`, `specs/032-ui-projection-contract/contracts/`, `specs/032-ui-projection-contract/quickstart.md`

**Tests**: 本特性以“协议与校验”为主（不触及 runtime 热路径），但会被 036 Contract Suite 与后续 Workbench/Agent 强依赖；至少需要 contracts/schema 预检 + 关键校验规则的纯函数单测，避免平台与 CI 漂移。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 示例产物）

- [ ] T001 补齐 032 contracts README（schemas + examples + 版本策略）到 `specs/032-ui-projection-contract/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（032 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.032.UiProjectionContracts.test.ts`
- [ ] T003 [P] 固化 UiKitRegistry 的 IMD 抽样样例生成命令与落点说明到 `specs/032-ui-projection-contract/quickstart.md`
- [ ] T004 [P] 让 IMD 抽取脚本输出满足 schema（本地校验 + 稳定排序）到 `scripts/extract-imd-ui-kit-registry.ts`

---

## Phase 2: Foundational（协议校验与最小可消费 API）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何 Workbench 交互样例（US1/US2/US3）。

- [ ] T005 定义 032 协议的纯函数校验入口（PresentationState/UiBlueprint/BindingSchema/UiKitRegistry）到 `packages/logix-sandbox/src/workbench/ui-projection/validate.ts`
- [ ] T006 定义 BindingSchema 的语义校验：read/dispatch 的 PortAddress kind 合法性到 `packages/logix-sandbox/src/workbench/ui-projection/validateBindingSchema.ts`
- [ ] T007 定义 UiBlueprint × UiKitRegistry 的校验：componentKey/propName/eventName 存在性 + tier 裁剪到 `packages/logix-sandbox/src/workbench/ui-projection/validateUiBlueprint.ts`
- [ ] T008 [P] 单测：UiBlueprint 引用不存在 componentKey/propName/eventName 时的可解释错误到 `packages/logix-sandbox/test/ui-projection/validateUiBlueprint.test.ts`
- [ ] T009 [P] 单测：BindingSchema 读写 kind 越界时的可解释错误到 `packages/logix-sandbox/test/ui-projection/validateBindingSchema.test.ts`

---

## Phase 3: User Story 1 - UI 无状态化：展示态由语义层驱动（Priority: P1）🎯 MVP

**Goal**: UI 仅渲染绑定模块状态并派发事件/动作；不维护展示态真相源。  
**Independent Test**: 一个含 overlay/stack 的最小场景：UI 仅靠 state 渲染即可开/关/回填（无本地 UI state）。

- [ ] T010 [US1] 增加一个最小 PresentationState 模块（overlay/stack）样例到 `examples/logix-sandbox-mvp/src/stage/presentation/PresentationModule.ts`
- [ ] T011 [US1] 为样例场景写出 UiBlueprint + BindingSchema（只绑定自身 instanceId）到 `examples/logix-sandbox-mvp/src/stage/presentation/assets/ui-blueprint.json`
- [ ] T012 [US1] 在 Workbench 增加最小 UI 投影渲染壳：读取 UiBlueprint/BindingSchema 并渲染线框到 `examples/logix-sandbox-mvp/src/stage/presentation/ProjectionView.tsx`
- [ ] T013 [P] [US1] 集成回归：UI 不持有展示态真相源（仅通过 action 驱动）到 `examples/logix-sandbox-mvp/test/ui-projection.stateless.test.ts`

---

## Phase 4: User Story 2 - 画布编排的是语义模型，不是界面像素（Priority: P2）

**Goal**: 语义蓝图与 UI 投影解耦：改 UiBlueprint 不引入语义漂移。  
**Independent Test**: 仅修改 UiBlueprint（布局/组件选择）时，语义蓝图（033）不变；试跑行为不变。

- [ ] T014 [US2] 为 Workbench 增加 UiBlueprint 的稳定归一化（排序/去噪）以便 diff 审阅到 `packages/logix-sandbox/src/workbench/ui-projection/normalizeUiBlueprint.ts`
- [ ] T015 [P] [US2] 单测：UiBlueprint 归一化对排序/噪音字段稳定到 `packages/logix-sandbox/test/ui-projection/normalizeUiBlueprint.test.ts`
- [ ] T016 [US2] 文档：明确“像素/布局不进入语义真相源”的边界与迁移示例到 `specs/032-ui-projection-contract/research.md`

---

## Phase 5: User Story 3 - 禁止跨模块读取：UI 只读自身模块状态（Priority: P3）

**Goal**: UI 表达式/绑定不允许跨实例读写；跨模块展示必须由语义层聚合/镜像。  
**Independent Test**: 尝试绑定到别的 instanceId 的 PortAddress 会被静态校验拒绝并给出修复建议。

- [ ] T017 [US3] 将 035 PortSpec/TypeIR 作为校验输入：BindingSchema 只能引用“自身 instanceId 对应模块”的 PortAddress 到 `packages/logix-sandbox/src/workbench/ui-projection/validateBindingSchema.ts`
- [ ] T018 [P] [US3] 单测：跨模块引用被拒绝并返回可行动建议到 `packages/logix-sandbox/test/ui-projection/validateBindingSchema.cross-instance.test.ts`
- [ ] T019 [US3] Workbench UI：在绑定面板展示“只读自身模块”的解释与建议（镜像/聚合）到 `examples/logix-sandbox-mvp/src/stage/presentation/BindingPanel.tsx`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T020 [P] 文档回链：把 UiKitRegistry 的 tier 多视图裁剪写入 036 的端口桥接说明到 `specs/036-workbench-contract-suite/semantic-ui-port-bridge.md`
- [ ] T021 Run `specs/032-ui-projection-contract/quickstart.md` 的步骤自检并补齐缺口到 `specs/032-ui-projection-contract/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1 可先交付（最小 stateless 投影）；US2/US3 可并行推进
- US3 的“跨模块引用校验”依赖 035 的 PortSpec/TypeIR 可用（来自 031 artifacts 槽位）
