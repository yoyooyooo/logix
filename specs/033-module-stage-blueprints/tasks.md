---
description: "Task list for 033-module-stage-blueprints (StageBlueprint / IntentRule / RowRef)"
---

# Tasks: Module Stage Blueprints（033：Module 舞台语义蓝图）

**Input**: `specs/033-module-stage-blueprints/spec.md`  
**Prerequisites**: `specs/033-module-stage-blueprints/plan.md`（required）, `specs/033-module-stage-blueprints/research.md`, `specs/033-module-stage-blueprints/data-model.md`, `specs/033-module-stage-blueprints/contracts/`, `specs/033-module-stage-blueprints/quickstart.md`

**Tests**: 本特性会影响平台“画布→出码→试跑→验收”的主链路；至少需要 contracts/schema 预检 + 蓝图校验/归一化/出码关键路径的单测（纯函数优先），避免 drift。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [ ] T001 补齐 033 contracts README（schemas + 与 034/035/032 的引用关系）到 `specs/033-module-stage-blueprints/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（033 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.033.StageBlueprintContracts.test.ts`

---

## Phase 2: Foundational（蓝图校验/归一化 + 稳定锚点）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何出码/Workbench 场景样例（US1/US2/US3）。

- [ ] T003 定义 StageBlueprint/IntentRule/RowRef 的纯函数校验入口（schema + 语义规则）到 `packages/logix-sandbox/src/workbench/stage/validateStageBlueprint.ts`
- [ ] T004 定义稳定标识校验（instanceId/ruleId/rowId 不允许默认随机/时间戳）到 `packages/logix-sandbox/src/workbench/stage/validateIdentity.ts`
- [ ] T005 定义 StageBlueprint 归一化（稳定排序、去噪字段）用于 diff 审阅到 `packages/logix-sandbox/src/workbench/stage/normalizeStageBlueprint.ts`
- [ ] T006 [P] 单测：identity 违规被拒绝且可解释到 `packages/logix-sandbox/test/stage/validateIdentity.test.ts`
- [ ] T007 [P] 单测：StageBlueprint 归一化保证确定性（排序不产生噪音 diff）到 `packages/logix-sandbox/test/stage/normalizeStageBlueprint.test.ts`

---

## Phase 3: User Story 1 - 场景画布编排多个 Module，并可落盘/出码/验收（Priority: P1）🎯 MVP

**Goal**: 最小可行的“语义蓝图→代码→试跑验收”闭环：节点=ModuleInstance，边=IntentRule。  
**Independent Test**: 给定一个 StageBlueprint（含至少 2 个模块实例 + 1 条规则边），能生成可运行代码并通过 trial-run 工件验收“边确实生效且可解释”。

- [ ] T008 [US1] 定义 StageBlueprint → 代码生成器（输出 TS 源码字符串或文件）到 `packages/logix-sandbox/src/workbench/stage/codegen.ts`
- [ ] T009 [US1] 在 codegen 中实现跨模块规则边：event → action 的桥接代码（引用 035 PortAddress）到 `packages/logix-sandbox/src/workbench/stage/codegenRules.ts`
- [ ] T010 [US1] 增加 Workbench 样例：读取 stage blueprint JSON → 生成代码 → 交给 sandbox compile/run 到 `examples/logix-sandbox-mvp/src/stage/StageRunner.tsx`
- [ ] T011 [US1] 为样例提供 stage blueprint JSON（2 节点 + 1 边）到 `examples/logix-sandbox-mvp/src/stage/assets/stage-blueprint.json`
- [ ] T012 [P] [US1] 集成回归：试跑产出可序列化工件，并能定位 ruleId/instanceId 的诊断指针到 `examples/logix-sandbox-mvp/test/stage.codegen.smoke.test.ts`

---

## Phase 4: User Story 2 - 多 UI 投影同一语义蓝图（Priority: P2）

**Goal**: 语义蓝图不携带 UI；同一 StageBlueprint 可绑定多个 UiBlueprint/BindingSchema 投影（032）。  
**Independent Test**: 改 UI 投影不改 StageBlueprint；试跑行为不变。

- [ ] T013 [US2] 定义 StageBlueprint 与 UiBlueprint/BindingSchema 的绑定约定（instanceId 作为锚点）到 `packages/logix-sandbox/src/workbench/stage/bindProjections.ts`
- [ ] T014 [P] [US2] 单测：同一 StageBlueprint 可挂载多份投影且不产生语义漂移到 `packages/logix-sandbox/test/stage/bindProjections.test.ts`
- [ ] T015 [US2] 文档：明确“语义蓝图 vs 投影蓝图”的 diff 与审阅口径到 `specs/033-module-stage-blueprints/research.md`

---

## Phase 5: User Story 3 - 动态列表回填使用稳定 rowRef（Priority: P3）

**Goal**: 列表回填不使用 index；rowRef（rowPath + rowId）稳定定位。  
**Independent Test**: 列表重排/插入/删除后回填仍命中正确行（基于 rowId）。

- [ ] T016 [US3] 在 codegen 中支持 rowRef 作为映射输入（禁止 index）到 `packages/logix-sandbox/src/workbench/stage/codegenRules.ts`
- [ ] T017 [P] [US3] 单测：rowRef 校验与越界错误可解释到 `packages/logix-sandbox/test/stage/rowRef.test.ts`
- [ ] T018 [US3] Workbench 样例：提供一个包含动态列表回填的 stage blueprint 片段到 `examples/logix-sandbox-mvp/src/stage/assets/stage-blueprint.rowref.json`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T019 [P] 文档回链：把“画布最小概念面（节点/边/资产）”同步到 036 阅读小抄到 `specs/036-workbench-contract-suite/reading-cheatsheet.md`
- [ ] T020 Run `specs/033-module-stage-blueprints/quickstart.md` 的步骤自检并补齐缺口到 `specs/033-module-stage-blueprints/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1 可先交付最小出码闭环；US2/US3 可并行推进
- US1 的端口合法性校验与 codegen 需要 035 的 PortSpec/TypeIR（来源：031 artifacts 槽位）
