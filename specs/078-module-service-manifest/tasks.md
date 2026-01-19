---
description: "Task list for 078-module-service-manifest (servicePorts in ModuleManifest IR)"
---

# Tasks: Module↔Service 关系纳入 Manifest IR（078：servicePorts）

**Input**: `specs/078-module-service-manifest/spec.md`  
**Prerequisites**: `specs/078-module-service-manifest/plan.md`（required）, `specs/078-module-service-manifest/research.md`, `specs/078-module-service-manifest/data-model.md`, `specs/078-module-service-manifest/contracts/`, `specs/078-module-service-manifest/quickstart.md`

**Tests**: 涉及 `packages/logix-core` 的反射/试运行/差异门禁；必须补齐回归防线：确定性（stable sort）、schema/contract 对齐、diff 行为、TrialRun 缺失诊断的端口级定位。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Contracts & SSoT（平台可消费的 IR 口径固化）

- [ ] T001 创建 078 contracts README（入口导航 + schema 清单 + 不变量）`specs/078-module-service-manifest/contracts/README.md`
- [ ] T002 [P] 固化 `ServicePort` JSON schema（Slim/确定性）`specs/078-module-service-manifest/contracts/schemas/module-manifest-service-port.schema.json`
- [ ] T003 [P] 固化 `ModuleManifest@078` JSON schema（新增 servicePorts；保留现有字段）`specs/078-module-service-manifest/contracts/schemas/module-manifest.schema.json`
- [ ] T004 在平台 SSoT 回写 `ModuleManifest.servicePorts` 的资产定义与 schema 引用 `docs/ssot/platform/assets/00-assets-and-schemas.md`

---

## Phase 2: Foundational（ServiceId 单点实现 + 反射导出）

**Checkpoint**: `Reflection.extractManifest` 输出包含 `servicePorts`（稳定排序、JSON-safe），且 `manifestVersion` bump + digest 可门禁化。

- [ ] T005 定义 `ServiceId` 单点 helper（按 078 contract 优先级）`packages/logix-core/src/internal/serviceId.ts`
- [ ] T006 [P] 对齐现有 Tag→string 逻辑：让 `internal/root.ts::tagIdOf` 复用 `serviceIdOf` `packages/logix-core/src/internal/root.ts`
- [ ] T007 [P] 对齐现有 Tag→string 逻辑：让 `internal/runtime/AppRuntime.ts::getTagKey` 复用 `serviceIdOf` `packages/logix-core/src/internal/runtime/AppRuntime.ts`
- [ ] T008 在 `Module.make` 定义参数中支持可选服务端口声明：`services` value 允许 `{ tag, optional?: true }` `packages/logix-core/src/Module.ts`
- [ ] T009 在 `ModuleManifest` 增加 `servicePorts` 字段（含 optional），并实现 `resolveServicePorts`（来源 `module.services`，稳定排序/去重/空值治理）`packages/logix-core/src/internal/reflection/manifest.ts`
- [ ] T010 bump `manifestVersion`（从 `067` → `078`）并将 `servicePorts` 纳入 digestBase `packages/logix-core/src/internal/reflection/manifest.ts`
- [ ] T011 [P] 单测：`extractManifest` 导出 `servicePorts` 且稳定排序 `packages/logix-core/test/internal/Reflection/Manifest.ServicePorts.test.ts`
- [ ] T012 [P] 单测：`extractManifest` digest 会随 `servicePorts` 变化而变化（门禁锚点）`packages/logix-core/test/internal/Reflection/Manifest.ServicePorts.Digest.test.ts`

---

## Phase 3: User Story 3 - Diff/Gate（servicePorts 变更可被稳定捕获） (Priority: P2)

**Goal**: `Reflection.diffManifest` 对 `servicePorts` 的新增/删除/变更给出稳定、可机器解析的差异项。  
**Independent Test**: before/after manifests 的 port/serviceId 变化能输出明确 changes（含 pointer 与 details），verdict 可门禁化。

- [ ] T013 [US3] 在 manifest diff 中新增 `servicePorts` 比较逻辑（新增/删除/ServiceId 变更/端口名变更）`packages/logix-core/src/internal/reflection/diff.ts`
- [ ] T014 [P] [US3] 单测：新增 port → INFO；删除/ServiceId 变更 → BREAKING（或按 plan.md 裁决）`packages/logix-core/test/internal/Reflection/ManifestDiff.ServicePorts.test.ts`

---

## Phase 4: User Story 2 - Trial Run 对齐（端口级缺失定位） (Priority: P1)

**Goal**: 试运行不依赖业务代码路径，也能给出 `moduleId + port + serviceId` 的缺失诊断。  
**Independent Test**: 模块声明 services 但未提供 Layer 时，TrialRun 报告能给出缺失端口清单；提供 Layer 后缺失清单为空；重复运行结果稳定。

- [ ] T015 [US2] 在 trial-run 装配阶段执行“声明端口 → root-level resolve”检查并产出 `servicePortsAlignment`（区分 required/optional，JSON-safe）`packages/logix-core/src/internal/observability/trialRunModule.ts`
- [ ] T016 [P] [US2] 单测：缺失 required 服务时 `servicePortsAlignment.missingRequired` 以端口级定位 `packages/logix-core/test/observability/Observability.trialRunModule.servicePortsAlignment.missing-required.test.ts`
- [ ] T017 [P] [US2] 单测：缺失 optional 服务不导致 hard-fail，但报告 `missingOptional`（若实现）`packages/logix-core/test/observability/Observability.trialRunModule.servicePortsAlignment.missing-optional.test.ts`
- [ ] T018 [P] [US2] 单测：提供 Layer 后 `missingRequired/missingOptional` 为空且输出稳定 `packages/logix-core/test/observability/Observability.trialRunModule.servicePortsAlignment.provided.test.ts`

---

## Phase 5: Devtools（解释入口与 UI 展示） (Priority: P2)

- [ ] T019 定义 dev-only 查询入口（moduleId→servicePorts；禁止替代 Manifest/TrialRun 工件）`packages/logix-core/src/Debug.ts`
- [ ] T020 在 Devtools UI 展示 servicePorts（模块视图 + ServiceId 聚合视图）`packages/logix-devtools-react/src/**`

---

## Phase 6: Docs（用户文档与 runtime SSoT 回链）

- [ ] T021 [P] 更新 `quickstart.md`：对齐真实 API 路径与最小验收步骤 `specs/078-module-service-manifest/quickstart.md`
- [ ] T022 [P] 既有文档措辞同步（延后到本需求收尾阶段）：更新 runtime SSoT 参考文档，固化 `services`/`servicePorts`/TrialRun 对齐口径 `docs/ssot/runtime/logix-core/**`
- [ ] T023 [P] 既有文档措辞同步（延后到本需求收尾阶段）：更新用户文档，在 inspection 文档中补充 `servicePorts`（避免引入内部术语）`apps/docs/content/docs/api/core/inspection.cn.md`
- [ ] T024 [P] 同步 `KernelPorts` 口径：补充 “KernelPorts 也是 service ports，必须具备稳定 ServiceId，并进入 TrialRun 对齐链路” 的说明与示例 `specs/078-module-service-manifest/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1（contracts）→ Phase 2（manifest/serviceId）为前置；Phase 2 完成后即可满足 US1（平台可枚举 servicePorts）。
- Diff（Phase 3）与 TrialRun（Phase 4）建议在 Phase 2 后并行推进，但 TrialRun 依赖 `serviceIdOf` 的统一口径。
