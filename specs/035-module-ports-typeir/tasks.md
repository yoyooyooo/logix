---
description: "Task list for 035-module-ports-typeir (PortSpec / TypeIR as platform SSoT)"
---

# Tasks: Module Ports & TypeIR（035：端口/类型 IR 作为平台 SSoT）

**Input**: `specs/035-module-ports-typeir/spec.md`  
**Prerequisites**: `specs/035-module-ports-typeir/plan.md`（required）, `specs/035-module-ports-typeir/research.md`, `specs/035-module-ports-typeir/data-model.md`, `specs/035-module-ports-typeir/contracts/`, `specs/035-module-ports-typeir/quickstart.md`

**Tests**: 本特性会成为 032/033/034/036 的引用空间事实源；至少需要 contracts/schema 预检 + 导出确定性/截断/降级策略的单测，避免平台侧出现并行推断。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [ ] T001 补齐 035 contracts README（schemas + key 空间 + 预算/截断语义）到 `specs/035-module-ports-typeir/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（035 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.035.PortSpecTypeIrContracts.test.ts`

---

## Phase 2: Foundational（从 trial-run 导出 PortSpec/TypeIR 的基础设施）

**⚠️ CRITICAL**: 本阶段完成前，不开始平台 autocomplete/CI diff（US1/US2）。

- [ ] T003 定义 PortAddress 的 TS 工具函数（parse/format/normalize）到 `packages/logix-core/src/internal/reflection/ports/portAddress.ts`
- [ ] T004 定义 PortSpec 导出器：从最终可运行 module 形状导出 actions/events/outputs/exports 到 `packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts`
- [ ] T005 定义 TypeIR 导出器（best-effort + 可截断）：与 PortSpec 对齐输出类型摘要到 `packages/logix-core/src/internal/reflection/ports/exportTypeIr.ts`
- [ ] T006 将 PortSpec/TypeIR 挂接到 031 artifacts 槽位（key：`@logixjs/module.portSpec@v1`、`@logixjs/module.typeIr@v1`）到 `packages/logix-core/src/internal/observability/trialRunModule.ts`
- [ ] T007 定义 TypeIR 的截断与降级语义（truncated + 摘要）到 `packages/logix-core/src/internal/reflection/ports/typeIrBudget.ts`
- [ ] T008 [P] 单测：PortSpec 导出确定性（稳定排序、同输入一致）到 `packages/logix-core/test/PortSpec/PortSpec.determinism.test.ts`
- [ ] T009 [P] 单测：TypeIR 超预算截断可解释（且仍能 key-level 校验）到 `packages/logix-core/test/TypeIr/TypeIr.truncation.test.ts`

---

## Phase 3: User Story 1 - 平台基于 PortSpec/TypeIR 做 autocomplete 与引用安全（Priority: P1）🎯 MVP

**Goal**: 平台/Workbench 不读源码推断；只依赖 `@logixjs/module.portSpec@v1` + `@logixjs/module.typeIr@v1` 做补全与校验。  
**Independent Test**: 给定导出的 PortSpec/TypeIR，BindingSchema/CodeAsset 的引用越界会被静态拒绝并提示可行动修复。

- [ ] T010 [US1] 在 Workbench 增加 PortSpec/TypeIR 的通用展示与下载（按 artifactKey 分组）到 `examples/logix-sandbox-mvp/src/ir/ArtifactsPanel.tsx`
- [ ] T011 [US1] 提供一个最小“引用空间查询 API”（portSpec/typeIr → 可用 keys 列表）到 `packages/logix-sandbox/src/workbench/ports/query.ts`
- [ ] T012 [P] [US1] 单测：引用空间查询对截断 TypeIR 降级仍可用到 `packages/logix-sandbox/test/ports/query.degrade.test.ts`

---

## Phase 4: User Story 2 - 端口/类型 IR 可 diff，用于 CI 与破坏性变更检测（Priority: P2）

**Goal**: 两版本 PortSpec/TypeIR 可稳定 diff，并输出 breaking/risky 结论。  
**Independent Test**: 删除端口 key/收缩 exports/类型收窄能被识别为 breaking 或 WARN。

- [ ] T013 [US2] 定义 PortSpec diff（breaking/risky/noise-free）到 `packages/logix-sandbox/src/workbench/ports/diffPortSpec.ts`
- [ ] T014 [US2] 定义 TypeIR diff（best-effort；截断时降级）到 `packages/logix-sandbox/src/workbench/ports/diffTypeIr.ts`
- [ ] T015 [P] [US2] 单测：PortSpec diff 的破坏性判定到 `packages/logix-sandbox/test/ports/diffPortSpec.breaking.test.ts`
- [ ] T016 [P] [US2] 单测：TypeIR diff 在截断/缺失时降级到 `packages/logix-sandbox/test/ports/diffTypeIr.degrade.test.ts`

---

## Phase 5: User Story 3 - 导出链路可扩展且有预算/截断/失败语义（Priority: P3）

**Goal**: 导出链路可插拔、失败不阻塞、预算可控；并允许内部利用 SchemaAST（不外泄）。  
**Independent Test**: 添加一个额外的 type projector（内部）不改变协议边界；失败时仍产出 artifacts 但带 error envelope。

- [ ] T017 [US3] 抽象 TypeIR projector 接口（允许内部基于 SchemaAST 投影）到 `packages/logix-core/src/internal/reflection/ports/typeIrProjector.ts`
- [ ] T018 [P] [US3] 单测：projector 失败不阻塞（error envelope + 其它 artifacts 仍输出）到 `packages/logix-core/test/TypeIr/TypeIr.projector-failure.test.ts`
- [ ] T019 [US3] 文档：明确 SchemaAST 只作实现材料、不外泄为平台事实源到 `specs/035-module-ports-typeir/research.md`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T020 [P] 文档回链：在 036 阅读小抄补齐 PortSpec/TypeIR 的“引用空间裁判”定位到 `specs/036-workbench-contract-suite/reading-cheatsheet.md`
- [ ] T021 Run `specs/035-module-ports-typeir/quickstart.md` 的步骤自检并补齐缺口到 `specs/035-module-ports-typeir/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1（平台补全/校验）优先；US2（diff/CI）与 US3（扩展/预算）可并行
- 本特性依赖 031 artifacts 槽位存在（PortSpec/TypeIR 作为 artifacts keys 导出）
