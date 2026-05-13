---
description: "Task list for 035-module-reference-space (reference space: PortSpec / TypeIR + CodeAsset)"
---

# Tasks: Module Reference Space（035：模块引用空间事实源）

**Input**: `specs/035-module-reference-space/spec.md`
**Prerequisites**: `specs/035-module-reference-space/plan.md`（required）, `specs/035-module-reference-space/research.md`, `specs/035-module-reference-space/data-model.md`, `specs/035-module-reference-space/contracts/`, `specs/035-module-reference-space/quickstart.md`

**Tests**: 本特性会成为 032/033/034/036 的引用空间事实源；至少需要 contracts/schema 预检 + 导出确定性/截断/降级策略的单测，避免平台侧出现并行推断。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [ ] T001 补齐 035 contracts README（schemas + key 空间 + 预算/截断语义）到 `specs/035-module-reference-space/contracts/README.md`
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
- [ ] T019 [US3] 文档：明确 SchemaAST 只作实现材料、不外泄为平台事实源到 `specs/035-module-reference-space/research.md`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T020 [P] 文档回链：在 036 阅读小抄补齐 PortSpec/TypeIR 的“引用空间裁判”定位到 `specs/036-workbench-contract-suite/reading-cheatsheet.md`
- [ ] T021 Run `specs/035-module-reference-space/quickstart.md` 的步骤自检并补齐缺口到 `specs/035-module-reference-space/quickstart.md`

---

## Phase 7: User Story 1 - 资产保存管线（CodeAsset：normalize/deps/digest/budgets）🎯 MVP

**Goal**: 保存资产时得到：`normalizedIr + deps + digest`，并能基于 035 的引用空间做静态校验；黑盒资产不得“偷跑”。
**Independent Test**: 给定一个可解析子集表达式，保存后 deps 自动推导；给定 blackbox 表达式，必须显式提供 deps 才能保存。

- [ ] T022 [US1] 定义 CodeAsset 的保存入口（source → normalizedIr/deps/digest）到 `packages/logix-sandbox/src/assets/saveCodeAsset.ts`
- [ ] T023 [US1] 定义 normalizedIr 的两态：parseable 子集 vs blackbox（需显式 deps/能力/预算）到 `packages/logix-sandbox/src/assets/normalize.ts`
- [ ] T024 [US1] 定义 deps 提取器（PortAddress/exports/services/config）与地址校验到 `packages/logix-sandbox/src/assets/extractDeps.ts`
- [ ] T025 [US1] 定义稳定 digest（仅由 normalizedIr 稳定派生；禁止时间/随机）到 `packages/logix-sandbox/src/assets/digest.ts`
- [ ] T026 [US1] 定义 budgets/capabilities 的默认值与裁剪策略到 `packages/logix-sandbox/src/assets/budgets.ts`
- [ ] T027 [P] [US1] 单测：同一 source 反复保存得到相同 digest（确定性）到 `packages/logix-sandbox/test/assets/digest.determinism.test.ts`
- [ ] T028 [P] [US1] 单测：blackbox 资产缺失 deps 时被拒绝并可解释到 `packages/logix-sandbox/test/assets/blackbox.require-deps.test.ts`
- [ ] T029 [P] [US1] 单测：deps 提取/校验与 035 PortAddress schema 对齐到 `packages/logix-sandbox/test/assets/deps.extract.test.ts`

---

## Phase 8: User Story 1 - parseable 子集解析 + 引用越界静态拒绝

**Goal**: 在可解析子集内自动提取 deps；并将 PortSpec/TypeIR 作为允许引用空间输入，静态拒绝越界引用。
**Independent Test**: 可解析子集表达式自动推导 deps；越界引用（不在 PortSpec/TypeIR）被拒绝并给出修复建议。

- [ ] T030 [US1] 定义“可解析子集”的最小语法边界与 normalizedIr 形状到 `packages/logix-sandbox/src/assets/normalized-ir.ts`
- [ ] T031 [US1] 实现最小解析器（只覆盖子集；其余自动降级为 blackbox）到 `packages/logix-sandbox/src/assets/parse.ts`
- [ ] T032 [US1] 将 PortSpec/TypeIR（035）作为允许引用空间输入，静态拒绝越界引用到 `packages/logix-sandbox/src/assets/validateRefs.ts`
- [ ] T033 [P] [US1] 单测：可解析子集表达式自动推导 deps 到 `packages/logix-sandbox/test/assets/parseable.deps.test.ts`
- [ ] T034 [P] [US1] 单测：越界引用（不在 PortSpec/TypeIR）被拒绝并给出修复建议到 `packages/logix-sandbox/test/assets/validateRefs.oob.test.ts`

---

## Phase 9: User Story 4 - Sandbox 可控预览：确定性、预算、可解释失败（Priority: P2）

**Goal**: 资产可在 sandbox 受控执行：超时/超预算/非确定性违规可解释。
**Independent Test**: 构造死循环/超大输出/随机调用等用例，预览会被拦截并返回结构化错误分类。

- [ ] T035 [US4] 定义资产预览执行壳（timeout/maxBytes/允许能力）到 `packages/logix-sandbox/src/assets/preview.ts`
- [ ] T036 [US4] 定义失败分类与最小可解释错误（fieldPath + reason + hint）到 `packages/logix-sandbox/src/assets/errors.ts`
- [ ] T037 [P] [US4] 单测：超时/超预算/违规能力的错误分类稳定到 `packages/logix-sandbox/test/assets/preview.errors.test.ts`
- [ ] T038 [US4] Workbench 样例：在 UI 中展示 preview 结果与错误摘要到 `examples/logix-sandbox-mvp/src/editor/AssetPreviewPanel.tsx`

---

## Phase 10: User Story 2 - 资产可审阅、可 diff、可被 agent 自动改写（Anchor/Diff）

**Goal**: 资产具备可审阅 diff、可逆锚点与 agent 可重写边界。
**Independent Test**: 两版本 asset 的 diff 输出稳定；agent 仅改写 source 后，digest/deps/预算变化可被 036 验收闭环识别。

- [ ] T039 [US2] 定义可逆锚点写入策略（spec/story/block 指针 + 生成指纹）到 `packages/logix-sandbox/src/assets/anchor.ts`
- [ ] T040 [US2] 定义 asset diff（基于 normalizedIr/deps/digest；稳定输出）到 `packages/logix-sandbox/src/assets/diff.ts`
- [ ] T041 [P] [US2] 单测：asset diff 对排序/等价变换不产生噪音到 `packages/logix-sandbox/test/assets/diff.stable.test.ts`
- [ ] T042 [US2] 将 CodeAssetRef（digest）接入 033 IntentRule mapping 引用（示例）到 `examples/logix-sandbox-mvp/src/stage/assets/intent-rule.with-mapping.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1（平台补全/校验 + 资产保存）优先；US2（diff/CI + 资产 diff）与 US3（扩展/预算）可并行
- 本特性依赖 031 artifacts 槽位存在（PortSpec/TypeIR 作为 artifacts keys 导出）；CodeAsset 的引用校验依赖 PortSpec/TypeIR（TypeIR 缺失/截断时必须降级为 key-level 校验）
