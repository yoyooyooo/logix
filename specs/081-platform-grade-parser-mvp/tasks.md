---
description: "Task list for 081-platform-grade-parser-mvp (AnchorIndex@v1)"
---

# Tasks: Platform-Grade Parser MVP（081：AnchorIndex@v1）

**Input**: `specs/081-platform-grade-parser-mvp/spec.md`  
**Prerequisites**: `specs/081-platform-grade-parser-mvp/plan.md`（required）, `specs/081-platform-grade-parser-mvp/research.md`, `specs/081-platform-grade-parser-mvp/data-model.md`, `specs/081-platform-grade-parser-mvp/contracts/`, `specs/081-platform-grade-parser-mvp/quickstart.md`

**Tests**: 本特性引入 Node-only AST 引擎（`ts-morph`），且其输出是后续回写闭环（082/079）的前置事实源；必须补齐 contracts/schema 预检 + 确定性/降级语义的单测，避免平台侧出现并行推断。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（新包骨架 + contracts 预检）

- [ ] T001 创建 Node-only 引擎包骨架（pnpm workspace package + exports）`packages/logix-anchor-engine/package.json`
- [ ] T002 [P] 创建引擎包入口与子模块导出（Parser 对外 API）`packages/logix-anchor-engine/src/index.ts`
- [ ] T003 [P] 补齐 081 contracts README（schema 清单 + 不变量/确定性口径）`specs/081-platform-grade-parser-mvp/contracts/README.md`
- [ ] T004 [P] 增加 contracts 预检测试（081 schema JSON 可解析 + $ref 可解析）`packages/logix-anchor-engine/test/Contracts/Contracts.081.AnchorIndex.test.ts`

---

## Phase 2: Foundational（AnchorIndex 生成骨架：确定性/RawMode/ReasonCodes）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何 autofill/rewrite 对接（US2/US3 的细节扩展必须建立在稳定骨架上）。  
**Checkpoint**: 对一个小型 fixture 仓库能产出 `AnchorIndex@v1`，并满足稳定排序/确定性/可序列化。

- [ ] T005 定义 Parser 公共入口（入参：repoRoot + includeGlobs/excludeGlobs + budgets）`packages/logix-anchor-engine/src/Parser.ts`
- [ ] T006 [P] 提供稳定 span/pos 抽取工具（line/column/offset 与 schema 对齐）`packages/logix-anchor-engine/src/internal/span.ts`
- [ ] T007 [P] 定义 reason codes（RawMode 与 entry 级 reasonCodes 的枚举/常量）`packages/logix-anchor-engine/src/internal/reasonCodes.ts`
- [ ] T008 解析仓库文件集并构建 ts-morph Project（禁止执行用户代码）`packages/logix-anchor-engine/src/internal/project.ts`
- [ ] T009 输出稳定排序策略（entries/rawMode/summary 的稳定排序与去重）`packages/logix-anchor-engine/src/internal/stableSort.ts`
- [ ] T010 [P] 单测：AnchorIndex 输出确定性（同输入重复输出一致）`packages/logix-anchor-engine/test/Parser/Parser.determinism.test.ts`

---

## Phase 3: User Story 1 - 仓库级锚点索引（Priority: P1）🎯 MVP

**Goal**: 扫描仓库得到可平台消费的 `AnchorIndex@v1`，对子集外显式 Raw Mode，并给出可行动 reason codes。  
**Independent Test**: 仅依赖 fixture 输入即可验证：模块清单/定义点/RawMode 清单输出稳定且可 JSON 序列化。

- [ ] T011 [P] [US1] 构造最小 fixture：包含 2 个 Platform-Grade `Module.make` 与 1 个子集外样例 `Module.make` `packages/logix-anchor-engine/test/fixtures/repo-basic/*`
- [ ] T012 [US1] 识别 `Logix.Module.make(<string literal>, <object literal>)` 定义点并输出 `ModuleDef` entry `packages/logix-anchor-engine/src/internal/scanModuleMake.ts`
- [ ] T013 [US1] 对子集外模块定义输出 RawModeEntry（含 reasonCodes）`packages/logix-anchor-engine/src/internal/scanModuleMake.ts`
- [ ] T014 [P] [US1] 单测：Platform-Grade ModuleDef 可被识别且输出 span 合法 `packages/logix-anchor-engine/test/Parser/Parser.moduleDef.test.ts`
- [ ] T015 [P] [US1] 单测：子集外定义被降级为 rawMode 且 reasonCodes 稳定 `packages/logix-anchor-engine/test/Parser/Parser.rawMode.test.ts`

---

## Phase 4: User Story 2 - 缺口点定位（Priority: P1）

**Goal**: 为 079/082 提供“只改缺失字段”的插入点：`missing.services` / `missing.devSource`。  
**Independent Test**: 同一源码未变时，缺口点 insertSpan 稳定；当字段已显式声明（含 `services: {}`）时不输出缺口点。

- [ ] T016 [US2] 计算 object literal 缺失字段的插入点（insertSpan）`packages/logix-anchor-engine/src/internal/missingField.ts`
- [ ] T017 [US2] 对 `services` 缺失输出 `missing.services`；`services: {}` 视为已声明不输出 `packages/logix-anchor-engine/src/internal/scanMissingAnchors.ts`
- [ ] T018 [US2] 对 `dev.source` 缺失输出 `missing.devSource`（仅在可安全插入时）`packages/logix-anchor-engine/src/internal/scanMissingAnchors.ts`
- [ ] T019 [P] [US2] 单测：缺失 services 的 insertSpan 稳定且幂等 `packages/logix-anchor-engine/test/Parser/Parser.missing.services.test.ts`
- [ ] T020 [P] [US2] 单测：存在 `services: {}` 时禁止输出缺口点 `packages/logix-anchor-engine/test/Parser/Parser.missing.services-explicit-empty.test.ts`
- [ ] T021 [P] [US2] 单测：缺失 dev.source 的 insertSpan 稳定 `packages/logix-anchor-engine/test/Parser/Parser.missing.devSource.test.ts`

---

## Phase 5: User Story 3 - 枚举依赖使用点（不做语义推断）（Priority: P2）

**Goal**: 枚举高置信度 `$.use(Tag)` 使用点；动态/歧义/黑盒形态宁可漏并显式 reasonCodes。  
**Independent Test**: fixture 中同时包含“可解析 Tag”与“动态 Tag”，输出只收录前者，后者进入 rawMode 或 reasonCodes。

- [ ] T022 [US3] 识别 `yield* $.use(<expr>)` 的使用点并输出 `ServiceUse` entry（含 tagSymbol/name）`packages/logix-anchor-engine/src/internal/scanServiceUse.ts`
- [ ] T023 [US3] 解析 TagSymbol → `Context.Tag("<literal>")` 以填充 `serviceIdLiteral`（失败则 reasonCodes）`packages/logix-anchor-engine/src/internal/resolveServiceId.ts`
- [ ] T024 [P] [US3] 构造包含动态/间接 Tag 的 fixture `packages/logix-anchor-engine/test/fixtures/repo-service-use/*`
- [ ] T025 [P] [US3] 单测：可解析 Tag 输出 `serviceIdLiteral`，动态 Tag 不误报 `packages/logix-anchor-engine/test/Parser/Parser.serviceUse.serviceIdLiteral.test.ts`
- [ ] T026 [P] [US3] 单测：条件分支/闭包内 use 默认降级（宁可漏）`packages/logix-anchor-engine/test/Parser/Parser.serviceUse.branch-degrade.test.ts`

---

## Phase 6: Workflow Anchors（WorkflowDef/stepKey 纳入 AnchorIndex） (Priority: P1)

**Goal**: 识别 Platform-Grade `FlowProgram.make/fromJSON({ ... })` 的 WorkflowDef 定义点，并提供：`callById(serviceIdLiteral)` 的可枚举使用点、缺失 `steps[*].key` 的插入点、重复 key 的冲突定位。  
**Independent Test**: fixture 中包含 1 个可解析 workflow、1 个子集外 workflow；输出确定性；缺失 key 输出 `missing.workflowStepKey`；重复 key 输出 `duplicate_step_key`。

- [ ] T029 [P] 构造 workflow fixture：Platform-Grade WorkflowDef（缺失 key + 重复 key + callById(serviceIdLiteral)）`packages/logix-anchor-engine/test/fixtures/repo-workflow-def/*`
- [ ] T030 [US?] 识别 `FlowProgram.make/fromJSON({ ... })` 定义点并输出 WorkflowDef entry `packages/logix-anchor-engine/src/internal/scanWorkflowDef.ts`
- [ ] T031 [US?] 扫描 workflow steps，输出 `WorkflowCallUse`（serviceIdLiteral）与 `missing.workflowStepKey` 插入点 `packages/logix-anchor-engine/src/internal/scanWorkflowSteps.ts`
- [ ] T032 [P] 单测：workflow serviceIdLiteral 与缺失 stepKey 插入点稳定 `packages/logix-anchor-engine/test/Parser/Parser.workflowDef.anchors.test.ts`
- [ ] T033 [P] 单测：重复 stepKey 被识别并输出冲突定位（reason: `duplicate_step_key`；不产生插入点）`packages/logix-anchor-engine/test/Parser/Parser.workflowDef.duplicate-stepKey.test.ts`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T027 [P] 文档回链：在 quickstart 补齐“输出字段如何解读/如何作为 082 输入”`specs/081-platform-grade-parser-mvp/quickstart.md`
- [ ] T028 质量门：跑通引擎包单测 + workspace typecheck（记录最小通过口径）`packages/logix-anchor-engine/package.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 3（US1）完成即可作为 MVP：平台可枚举锚点索引 + RawMode 降级
- Phase 4（US2）为 079/082 的“只改缺失字段”提供稳定插入点
- Phase 5（US3）为 079（services 补全）提供可确定 `serviceId` 输入（宁可漏不乱补）

---

## Phase 7: 既有文档措辞同步（延后到本需求收尾阶段）

- [ ] T034 同步平台 SSoT：补齐 Platform-Grade Parser/RawMode/Workflow stepKey 的统一口径与导航入口 `docs/ssot/platform/**`（仅措辞/导航对齐）
