---
description: "Task list for 034-expression-asset-protocol (CodeAsset / Deps / Digest / Anchor)"
---

# Tasks: Expression Asset Protocol（034：表达式/校验资产协议）

**Input**: `specs/034-expression-asset-protocol/spec.md`  
**Prerequisites**: `specs/034-expression-asset-protocol/plan.md`（required）, `specs/034-expression-asset-protocol/research.md`, `specs/034-expression-asset-protocol/data-model.md`, `specs/034-expression-asset-protocol/contracts/`, `specs/034-expression-asset-protocol/quickstart.md`

**Tests**: 本特性会成为 033（IntentRule mapping）与 036（Agent 闭环）的共同依赖；至少需要 contracts/schema 预检 + 归一化/依赖提取/预算裁剪/错误分类的单测，避免“资产保存口径”漂移。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [ ] T001 补齐 034 contracts README（schemas + blackbox 语义 + 版本策略）到 `specs/034-expression-asset-protocol/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（034 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.034.CodeAssetContracts.test.ts`

---

## Phase 2: Foundational（资产保存管线：normalize/deps/digest/budgets）

**⚠️ CRITICAL**: 本阶段完成前，不开始 sandbox 预览执行（US2）或 agent 改写（US3）。

- [ ] T003 定义 CodeAsset 的保存入口（source → normalizedIr/deps/digest）到 `packages/logix-sandbox/src/assets/saveCodeAsset.ts`
- [ ] T004 定义 normalizedIr 的两态：parseable 子集 vs blackbox（需显式 deps/能力/预算）到 `packages/logix-sandbox/src/assets/normalize.ts`
- [ ] T005 定义 deps 提取器（PortAddress/exports/services/config）与地址校验到 `packages/logix-sandbox/src/assets/extractDeps.ts`
- [ ] T006 定义稳定 digest（仅由 normalizedIr 稳定派生；禁止时间/随机）到 `packages/logix-sandbox/src/assets/digest.ts`
- [ ] T007 定义 budgets/capabilities 的默认值与裁剪策略到 `packages/logix-sandbox/src/assets/budgets.ts`
- [ ] T008 [P] 单测：同一 source 反复保存得到相同 digest（确定性）到 `packages/logix-sandbox/test/assets/digest.determinism.test.ts`
- [ ] T009 [P] 单测：blackbox 资产缺失 deps 时被拒绝并可解释到 `packages/logix-sandbox/test/assets/blackbox.require-deps.test.ts`
- [ ] T010 [P] 单测：deps 提取/校验与 035 PortAddress schema 对齐到 `packages/logix-sandbox/test/assets/deps.extract.test.ts`

---

## Phase 3: User Story 1 - 平台可安全编辑表达式并自动推导 deps（Priority: P1）🎯 MVP

**Goal**: 平台保存资产时得到：`normalizedIr + deps + digest`，并能基于 035 的引用空间做静态校验。  
**Independent Test**: 给定一个可解析子集表达式，保存后 deps 自动推导；给定 blackbox 表达式，必须显式提供 deps 才能保存。

- [ ] T011 [US1] 定义“可解析子集”的最小语法边界与 normalizedIr 形状到 `packages/logix-sandbox/src/assets/normalized-ir.ts`
- [ ] T012 [US1] 实现最小解析器（只覆盖子集；其余自动降级为 blackbox）到 `packages/logix-sandbox/src/assets/parse.ts`
- [ ] T013 [US1] 将 PortSpec/TypeIR（035）作为允许引用空间输入，静态拒绝越界引用到 `packages/logix-sandbox/src/assets/validateRefs.ts`
- [ ] T014 [P] [US1] 单测：可解析子集表达式自动推导 deps 到 `packages/logix-sandbox/test/assets/parseable.deps.test.ts`
- [ ] T015 [P] [US1] 单测：越界引用（不在 PortSpec/TypeIR）被拒绝并给出修复建议到 `packages/logix-sandbox/test/assets/validateRefs.oob.test.ts`

---

## Phase 4: User Story 2 - Sandbox 可控预览：确定性、预算、可解释失败（Priority: P2）

**Goal**: 资产可在 sandbox 受控执行：超时/超预算/非确定性违规可解释。  
**Independent Test**: 构造死循环/超大输出/随机调用等用例，预览会被拦截并返回结构化错误分类。

- [ ] T016 [US2] 定义资产预览执行壳（timeout/maxBytes/允许能力）到 `packages/logix-sandbox/src/assets/preview.ts`
- [ ] T017 [US2] 定义失败分类与最小可解释错误（fieldPath + reason + hint）到 `packages/logix-sandbox/src/assets/errors.ts`
- [ ] T018 [P] [US2] 单测：超时/超预算/违规能力的错误分类稳定到 `packages/logix-sandbox/test/assets/preview.errors.test.ts`
- [ ] T019 [US2] Workbench 样例：在 UI 中展示 preview 结果与错误摘要到 `examples/logix-sandbox-mvp/src/editor/AssetPreviewPanel.tsx`

---

## Phase 5: User Story 3 - 资产可审阅、可 diff、可被 agent 自动改写（Priority: P3）

**Goal**: 资产具备可审阅 diff、可逆锚点与 agent 可重写边界。  
**Independent Test**: 两版本 asset 的 diff 输出稳定；agent 仅改写 source 后，digest/ deps/预算变化可被 contract suite 验收。

- [ ] T020 [US3] 定义可逆锚点写入策略（spec/story/block 指针 + 生成指纹）到 `packages/logix-sandbox/src/assets/anchor.ts`
- [ ] T021 [US3] 定义 asset diff（基于 normalizedIr/deps/digest；稳定输出）到 `packages/logix-sandbox/src/assets/diff.ts`
- [ ] T022 [P] [US3] 单测：asset diff 对排序/等价变换不产生噪音到 `packages/logix-sandbox/test/assets/diff.stable.test.ts`
- [ ] T023 [US3] 将 CodeAssetRef（digest）接入 033 IntentRule mapping 引用（示例）到 `examples/logix-sandbox-mvp/src/stage/assets/intent-rule.with-mapping.json`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T024 [P] 文档回链：补齐“parseable vs blackbox”的降级语义与治理建议到 `specs/034-expression-asset-protocol/research.md`
- [ ] T025 Run `specs/034-expression-asset-protocol/quickstart.md` 的步骤自检并补齐缺口到 `specs/034-expression-asset-protocol/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1（资产保存）优先；US2（预览执行）与 US3（diff/anchor）可并行
- US1/US3 的引用校验依赖 035 的 PortSpec/TypeIR；在 TypeIR 缺失/截断时必须降级为 key-level 校验（由 036 统一裁决）
