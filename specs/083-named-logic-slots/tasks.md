---
description: "Task list for 083-named-logic-slots (slots metadata + validation + manifest reflection)"
---

# Tasks: Named Logic Slots（083：具名逻辑插槽）

**Input**: `specs/083-named-logic-slots/spec.md`  
**Prerequisites**: `specs/083-named-logic-slots/plan.md`（required）, `specs/083-named-logic-slots/quickstart.md`

**Tests**: 本特性会改变 `@logixjs/core` 的 Module/Manifest 反射契约与校验语义；必须补齐“确定性导出 + 约束失败可解释”的单测，避免平台侧解释链漂移。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（公共类型与 API 入口）

- [ ] T001 在 Module 定义 API 增加 `slots` 字段（SlotDef 类型 + 可选字段）`packages/logix-core/src/Module.ts`
- [ ] T002 [P] 将 slots 纳入 Module.make 的 merge 规则（extend 语义 + 决定是否允许覆盖）`packages/logix-core/src/Module.ts`
- [ ] T003 [P] 补齐最小文档示例（quickstart 内的“怎么用/怎么验收”）`specs/083-named-logic-slots/quickstart.md`

---

## Phase 2: Foundational（填充元数据 + 校验骨架 + 反射出口）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何复杂 DX 变体（例如 Fluent slot builder）。  
**Checkpoint**: 能在运行时拿到 slots 定义与 slot→logic 映射，并在违规时结构化失败。

- [ ] T004 在 LogicUnitOptions 增加 slotName（Platform-Grade 可解析；默认不填）`packages/logix-core/src/Module.ts`
- [ ] T005 [P] 将 slotName 进入 LogicUnitMeta（随 resolvedId 一起成为稳定锚点）`packages/logix-core/src/internal/runtime/core/LogicUnitMeta.ts`
- [ ] T006 实现 slots 校验（required/unique/aspect + slotName 命名规范）并输出结构化错误（在 mount/implement 阶段执行）`packages/logix-core/src/Module.ts`
- [ ] T007 将 slots 定义与 slot→logic 映射导出到 Manifest（稳定排序；未赋槽逻辑保持在 logicUnits；纳入 digestBase）`packages/logix-core/src/internal/reflection/manifest.ts`

---

## Phase 3: User Story 1 - 可枚举插槽语义并支持安全替换（Priority: P1）🎯 MVP

**Goal**: 平台能枚举 slots 定义与 slot→logic 填充关系；缺失 required / 违反 unique 必须失败且可解释。  
**Independent Test**: 仅通过 `Reflection.extractManifest` 即可看到 slots（稳定可 diff）；违规时错误包含 slotName 与冲突 logic refs。

- [ ] T008 [P] [US1] 单测：Manifest 导出包含 slots 定义与 fill 映射且确定性 `packages/logix-core/test/Reflection.extractManifest.slots.test.ts`
- [ ] T009 [P] [US1] 单测：缺失 required slot 触发可解释失败 `packages/logix-core/test/Slots/Slots.required-missing.test.ts`
- [ ] T010 [P] [US1] 单测：unique slot 重复填充触发可解释失败 `packages/logix-core/test/Slots/Slots.unique-conflict.test.ts`

---

## Phase 4: User Story 2 - slots 成为全双工编辑安全边界（Priority: P2）

**Goal**: slots 的声明与填充关系属于 Platform-Grade 子集：子集内可回写，子集外显式降级为 Raw Mode（只报告不回写）。  
**Independent Test**: 明确“可回写子集”的边界与降级 reason codes；平台/CLI 能据此做门禁与提示。

- [ ] T011 [US2] 在本 spec 内补充“可回写子集”约束说明（哪些 slots/填充写法允许回写，哪些必须降级）`specs/083-named-logic-slots/plan.md`
- [ ] T012 [US2] 在 080 group registry 标注 083 的 Hard/后续依赖（与 081/082 的关系口径一致）`specs/080-full-duplex-prelude/spec-registry.md`

---

## Phase 5: Polish & Cross-Cutting

- [ ] T013 [P] 文档回链：在 runtime-logix API 文档补充 slots 的最小用法与语义口径 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- US1（MVP）完成即可支持平台枚举与门禁；US2 先固化“可回写子集”边界（实际回写实现可后续拆任务/拆 spec）。
