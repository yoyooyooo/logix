---
description: "Task list for 035-module-reference-space (reference space: PortSpec / TypeIr / PortAddress)"
---

# Tasks: Module Reference Space（035：模块引用空间事实源）

**Input**: `specs/035-module-reference-space/*`  
**Prerequisites**: `specs/035-module-reference-space/plan.md`（required）

> 说明：CodeAsset/Deps/Digest/Anchor 已拆分为 034：`specs/034-code-asset-protocol/`。

## Phase 1: Contracts（P0）

- [x] T001 固化 035 schemas（PortAddress/ModulePortSpec/TypeIr）`specs/035-module-reference-space/contracts/schemas/*`
- [x] T002 [P] 增加 contracts 预检测试（035 schemas JSON 可解析 + $ref 可解析）`packages/logix-core/test/Contracts/Contracts.035.PortSpecTypeIrContracts.test.ts`

## Phase 2: Foundational（导出 PortSpec/TypeIr + 接入 artifacts 槽位）

- [x] T003 PortAddress TS 工具函数（parse/format/normalize）`packages/logix-core/src/internal/reflection/ports/portAddress.ts`
- [x] T004 PortSpec 导出器（actions/events/outputs/exports）`packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts`
- [x] T005 TypeIr 导出器（best-effort + 可截断）`packages/logix-core/src/internal/reflection/ports/exportTypeIr.ts`
- [x] T006 接入 031 artifacts 槽位（默认注册到 Module.make）`packages/logix-core/src/Module.ts`
- [x] T007 TypeIr 预算/截断语义（maxNodes/maxDepth）`packages/logix-core/src/internal/reflection/ports/typeIrBudget.ts`

## Phase 3: Tests（确定性/截断/失败不阻塞）

- [x] T008 单测：PortSpec 导出确定性 `packages/logix-core/test/PortSpec/PortSpec.determinism.test.ts`
- [x] T009 单测：TypeIr 超预算截断可解释 `packages/logix-core/test/TypeIr/TypeIr.truncation.test.ts`
- [x] T010 单测：projector 失败不阻塞其它 artifacts `packages/logix-core/test/TypeIr/TypeIr.projector-failure.test.ts`

## Phase 4: Workbench Consumers（最小可复用 API）

- [x] T011 Workbench 侧最小“引用空间查询 API”`packages/logix-sandbox/src/workbench/ports/query.ts`
- [x] T012 [P] 单测：引用空间查询对截断 TypeIr 降级仍可用 `packages/logix-sandbox/test/ports/query.degrade.test.ts`

## Phase 5: Diff（P2）

- [x] T013 PortSpec diff（breaking/risky/noise-free）`packages/logix-sandbox/src/workbench/ports/diffPortSpec.ts`
- [x] T014 TypeIr diff（best-effort；截断时降级）`packages/logix-sandbox/src/workbench/ports/diffTypeIr.ts`
- [x] T015 [P] 单测：PortSpec diff 的破坏性判定 `packages/logix-sandbox/test/ports/diffPortSpec.breaking.test.ts`
- [x] T016 [P] 单测：TypeIr diff 在截断/缺失时降级 `packages/logix-sandbox/test/ports/diffTypeIr.degrade.test.ts`

## Phase 6: Docs（P1）

- [x] T020 文档回链：036 阅读小抄对齐 035/034 边界 `specs/036-workbench-contract-suite/reading-cheatsheet.md`
- [x] T021 quickstart 自检与口径对齐 `specs/035-module-reference-space/quickstart.md`

