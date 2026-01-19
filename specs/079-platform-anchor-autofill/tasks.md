---
description: "Task list for 079-platform-anchor-autofill (conservative write-back policy)"
---

# Tasks: 保守自动补全 Platform-Grade 锚点声明（079：单一真相源）

**Input**: `specs/079-platform-anchor-autofill/spec.md`  
**Prerequisites**: `specs/079-platform-anchor-autofill/plan.md`（required）, `specs/079-platform-anchor-autofill/research.md`, `specs/079-platform-anchor-autofill/data-model.md`, `specs/079-platform-anchor-autofill/contracts/`, `specs/079-platform-anchor-autofill/quickstart.md`

**Tests**: 本特性会写回源码锚点字段（高风险），且强约束“宁可漏不乱补/只补未声明/幂等/最小 diff”；必须补齐契约预检 + 关键跳过原因与幂等回归。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]/[US4]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（契约固化 + 预检）

- [ ] T001 补齐 079 contracts 的 schema 目录与 README（AutofillReport@v1 + reason codes + stepKey autofill contract）`specs/079-platform-anchor-autofill/contracts/README.md`
- [ ] T002 [P] 固化 AutofillReport@v1 JSON schema（Slim/确定性/可 diff）`specs/079-platform-anchor-autofill/contracts/schemas/autofill-report.schema.json`
- [ ] T003 [P] 固化 reason codes schema（enum，forward-only）`specs/079-platform-anchor-autofill/contracts/schemas/autofill-reason-codes.schema.json`
- [ ] T003.1 [P] 固化 Workflow stepKey autofill contract（v1 规则；对齐 075）`specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`
- [ ] T004 [P] 增加 contracts 预检测试（079 schemas JSON 可解析 + $ref 可解析）`packages/logix-anchor-engine/test/Contracts/Contracts.079.AutofillContracts.test.ts`

---

## Phase 2: Foundational（Autofill Policy 骨架：输入/决策/报告）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何具体写回候选生成（US1/US2 依赖稳定的 decision/report 骨架）。  
**Checkpoint**: 给定最小 AnchorIndex 输入，能输出确定性的 AutofillReport（report-only），且 reason codes 可枚举。

- [ ] T005 定义 Autofill 对外入口（输入 AnchorIndex@v1 + mode + budgets）`packages/logix-anchor-engine/src/Autofill.ts`
- [ ] T006 [P] 定义 policy 领域模型（Decision/SkipReason/Report，与 079 contracts 对齐）`packages/logix-anchor-engine/src/internal/autofill/model.ts`
- [ ] T007 [P] 固化“宁可漏不乱补”的判定工具函数（already_declared/unsafe_to_patch/unresolvable_service_id…）`packages/logix-anchor-engine/src/internal/autofill/policy.ts`
- [ ] T008 实现 AutofillReport 汇总与稳定排序（summary.reasons 稳定排序；changes 稳定排序）`packages/logix-anchor-engine/src/internal/autofill/report.ts`
- [ ] T009 [P] 单测：AutofillReport 输出确定性（稳定排序/同输入一致）`packages/logix-anchor-engine/test/Autofill/Autofill.report.determinism.test.ts`

---

## Phase 3: User Story 1 - 依赖锚点补全（services/imports）（Priority: P1）

**Goal**: 对缺失依赖锚点声明的模块生成高置信度候选，并通过 082 产出 PatchPlan/WriteBackResult（report/write）。  
**Independent Test**: 对“缺失 services 且存在高置信度 use”样例，report-only 产生可审阅计划；write-back 后幂等且只改缺失字段。

- [ ] T010 [P] [US1] fixture：缺失 services 且存在 `yield* $.use(Tag)` 的 Platform-Grade 模块 `packages/logix-anchor-engine/test/fixtures/repo-autofill-services/*`
- [ ] T011 [US1] 从 AnchorIndex 聚合“模块→服务使用证据”（高置信度 `$.use(Tag)` + WorkflowDef `callById(serviceIdLiteral)`；动态/歧义跳过）`packages/logix-anchor-engine/src/internal/autofill/collectServiceUses.ts`
- [ ] T012 [US1] 生成 `services` 字段写回候选（默认 `port = serviceId`；稳定排序；去重）`packages/logix-anchor-engine/src/internal/autofill/buildServicesPatch.ts`
- [ ] T013 [P] [US1] 单测：同一模块内多处 use 去重且 keys 稳定排序 `packages/logix-anchor-engine/test/Autofill/Autofill.services.dedup-sort.test.ts`
- [ ] T014 [P] [US1] 单测：动态/歧义 use 不生成候选（宁可漏）`packages/logix-anchor-engine/test/Autofill/Autofill.services.degrade.test.ts`
- [ ] T015 [US1] （可选，report-only）装配依赖锚点（imports）仅做偏离报告，不自动写回 `packages/logix-anchor-engine/src/internal/autofill/importsDeviation.ts`

---

## Phase 4: User Story 2 - 定位锚点补全（dev.source）（Priority: P1）

**Goal**: 对缺失定位锚点的模块补齐 `dev.source`，用于 Devtools 跳转与解释链路；避免进入结构 digest。  
**Independent Test**: 对缺失 dev.source 的模块，写回后可在 Manifest 中被反射导出；重复运行幂等。

- [ ] T016 [P] [US2] fixture：缺失 dev/source 的 Platform-Grade 模块 `packages/logix-anchor-engine/test/fixtures/repo-autofill-devsource/*`
- [ ] T017 [US2] 生成 `dev: { source: { file, line, column } }` 写回候选（从 AnchorIndex 的 module span 派生）`packages/logix-anchor-engine/src/internal/autofill/buildDevSourcePatch.ts`
- [ ] T018 [P] [US2] 单测：dev.source 写回 valueCode 稳定且 JSON-safe `packages/logix-anchor-engine/test/Autofill/Autofill.devSource.valueCode.test.ts`

---

## Phase 5: User Story 3 - 高置信度门槛 + 可解释报告（Priority: P1）

**Goal**: 所有“跳过/降级/失败”必须有结构化 reason codes；默认 report-only；write-back 必须显式开关。  
**Independent Test**: 对一组混合输入（可写/不可写/已声明），报告能稳定输出 written/skipped/failed 与 reasons 统计。

- [ ] T019 [US3] 将 AutofillPolicy 输出映射为 082 PatchPlan 操作列表（AddObjectProperty）`packages/logix-anchor-engine/src/internal/autofill/toPatchOperations.ts`
- [ ] T020 [US3] 串联 082：根据 mode 生成 PatchPlan@v1，并在 write 模式执行 WriteBackResult@v1 `packages/logix-anchor-engine/src/Autofill.ts`
- [ ] T021 [P] [US3] 单测：report-only 不写文件但输出拟修改摘要 `packages/logix-anchor-engine/test/Autofill/Autofill.report-only.test.ts`
- [ ] T022 [P] [US3] 单测：write-back 幂等（第二次产生 0 diff）`packages/logix-anchor-engine/test/Autofill/Autofill.idempotent.test.ts`

---

## Phase 6: User Story 4 - 已显式声明不被自动改写（Priority: P2）

**Goal**: 任何已显式声明的锚点字段不得被自动写回覆盖（含 `services: {}`）。  
**Independent Test**: 输入包含显式声明时，write-back 改动数为 0，且报告标记为 already_declared。

- [ ] T023 [P] [US4] fixture：显式 `services: {}` 与显式 `dev: { source: ... }` 的模块 `packages/logix-anchor-engine/test/fixtures/repo-autofill-explicit/*`
- [ ] T024 [US4] 在 policy 中强制 already_declared 判定（缺口点缺失时也必须跳过），并在 report 的 `reason.details` 附带 deviation 摘要（例如 used-but-not-declared/declared-but-not-used）`packages/logix-anchor-engine/src/internal/autofill/policy.ts`
- [ ] T025 [P] [US4] 单测：显式声明不产生任何 PatchPlan write 操作，且 deviation 摘要可解释 `packages/logix-anchor-engine/test/Autofill/Autofill.skip.explicit-declared.test.ts`

---

## Phase 7: Polish & Cross-Cutting

- [ ] T026 [P] 文档回链：补齐 quickstart 的“report→审阅→write→幂等复跑”步骤 `specs/079-platform-anchor-autofill/quickstart.md`
- [ ] T027 质量门：跑通引擎包单测 + workspace typecheck（记录最小通过口径）`packages/logix-anchor-engine/package.json`

---

## Phase 8: Workflow StepKey Autofill（对齐 075；全双工硬前置） (Priority: P1)

**Goal**: 对 Platform-Grade WorkflowDef 缺失 `steps[*].key` 的场景生成确定性补全候选，并通过 082 产出 PatchPlan/WriteBackResult；对重复 key 必须拒绝写回并可解释。  
**Independent Test**: report-only 输出缺失 key 定位与候选；write-back 后幂等；重复 key 场景不写回且 reason code=duplicate_step_key。

- [ ] T028 [P] fixture：WorkflowDef 缺失 stepKey（FlowProgram.make/fromJSON + steps array literal）`packages/logix-anchor-engine/test/fixtures/repo-autofill-workflow-stepkey/*`
- [ ] T029 从 AnchorIndex 聚合 Workflow steps 并识别缺失/重复 key `packages/logix-anchor-engine/src/internal/autofill/collectWorkflowSteps.ts`
- [ ] T030 生成 stepKey 写回候选（确定性 baseKey + 冲突后缀）`packages/logix-anchor-engine/src/internal/autofill/buildWorkflowStepKeyPatch.ts`
- [ ] T031 [P] 单测：stepKey 补全幂等与最小 diff `packages/logix-anchor-engine/test/Autofill/Autofill.workflow.stepKey.idempotent.test.ts`
- [ ] T032 [P] 单测：重复 stepKey 拒绝写回并输出 `duplicate_step_key` `packages/logix-anchor-engine/test/Autofill/Autofill.workflow.stepKey.duplicate.test.ts`

---

## Dependencies & Execution Order

- 本 spec 依赖 081（AnchorIndex）与 082（Rewriter）；建议实现顺序：081 → 082 → 079。
- Phase 1（契约）→ Phase 2（policy/report 骨架）→ US1/US2（候选生成）→ US3（串联回写）→ US4（显式声明门禁回归）。

---

## Phase 9: 既有文档措辞同步（延后到本需求收尾阶段）

- [ ] T040 同步平台 SSoT：补齐“Autofill 只补缺失字段/宁可漏不乱补/stepKey 门禁化”的统一口径与导航入口 `docs/ssot/platform/**`（仅措辞/导航对齐）
