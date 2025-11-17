---
description: "Task list for 036-workbench-contract-suite (Contract Suite / Integrated Verdict)"
---

# Tasks: Workbench Contract Suite（036：031-035 统一验收入口 + Agent 工具面）

**Input**: `specs/036-workbench-contract-suite/spec.md`  
**Prerequisites**: `specs/036-workbench-contract-suite/plan.md`（required）, `specs/036-workbench-contract-suite/research.md`, `specs/036-workbench-contract-suite/data-model.md`, `specs/036-workbench-contract-suite/contracts/`, `specs/036-workbench-contract-suite/quickstart.md`

**Tests**: 本特性会引入治理层纯函数（normalize/verdict/context-pack）并被 Workbench/CI/Agent 复用；至少补齐 contracts/schema 预检 + verdict/降级规则单测，避免两套口径漂移。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [ ] T001 [P] 增加 contracts 预检测试（036 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.036.WorkbenchContractSuiteContracts.test.ts`

---

## Phase 2: Foundational（归一化工件 + Verdict/ContextPack 纯函数）

**⚠️ CRITICAL**: 本阶段完成前，不开始 Workbench UI（US1）或 CI diff（US2）。

- [ ] T002 定义治理层核心数据结构与归一化入口（纯函数；禁止读 runtime 私有结构）到 `packages/logix-sandbox/src/contract-suite/model.ts`
- [ ] T003 定义 artifacts 归一化（key/version → availability/status + digest/summary）到 `packages/logix-sandbox/src/contract-suite/normalize.ts`
- [ ] T004 定义 Integrated Verdict 计算（PASS/WARN/FAIL + reasons + per-artifact 状态）到 `packages/logix-sandbox/src/contract-suite/verdict.ts`
- [ ] T005 定义 ContextPack 生成（facts + constraints + target；按预算裁剪）到 `packages/logix-sandbox/src/contract-suite/context-pack.ts`
- [ ] T006 将 `facts.inputs.uiKitRegistry` 作为可选输入接入 ContextPack（pro 默认、ui/dev 可见、base 默认隐藏）到 `packages/logix-sandbox/src/contract-suite/context-pack.ts`
- [ ] T007 [P] 补齐纯函数单测：降级模型（缺失/截断/失败）与 verdict 聚合到 `packages/logix-sandbox/test/contract-suite/verdict.test.ts`
- [ ] T008 [P] 补齐纯函数单测：ContextPack 可选 inputs（含 uiKitRegistry）与预算裁剪到 `packages/logix-sandbox/test/contract-suite/context-pack.test.ts`

---

## Phase 3: User Story 1 - 一键集成验收（Priority: P1）🎯 MVP

**Goal**: 一键触发 trial-run → 归一化 → verdict，并能导出工件。  
**Independent Test**: 代表性模块跑通（允许降级），产出可序列化工件与可解释 verdict。

- [ ] T009 [US1] 在 Workbench 增加 “Contract Suite” 入口：触发 trial-run + normalize + verdict 到 `examples/logix-sandbox-mvp/src/contract-suite/index.tsx`
- [ ] T010 [US1] Workbench 展示与导出：verdict/reasons/artifacts（按 key/version），并可下载 JSON 到 `examples/logix-sandbox-mvp/src/contract-suite/VerdictPanel.tsx`
- [ ] T011 [P] [US1] 最小集成测试：代表性模块跑通并产出可序列化工件到 `examples/logix-sandbox-mvp/test/contract-suite.smoke.test.ts`

---

## Phase 4: User Story 2 - 版本化治理与 diff（Priority: P2）

**Goal**: 两版本工件可稳定 diff，输出 breaking/risky 结论，供 CI gate。  
**Independent Test**: 同一输入重复导出确定性；两版本对比输出稳定且可审阅。

- [ ] T012 [US2] 在 CI 侧提供统一入口（Node 脚本或 package API）：产出/存档工件 + gate 到 `scripts/contract-suite/run.ts`
- [ ] T013 [US2] 集成 Diff：复用 Manifest diff（025）与 artifacts/ports/typeIR diff 作为 verdict 输入到 `packages/logix-sandbox/src/contract-suite/normalize.ts`
- [ ] T014 [P] [US2] 回归用例：确定性 + breaking/risky 判定稳定到 `packages/logix-sandbox/test/contract-suite/diff-determinism.test.ts`

---

## Phase 5: User Story 3 - Workbench 可迁移（Priority: P3）

**Goal**: Workbench 只消费 JSON 工件（可替换宿主/模块集合），不读取 runtime 私有结构。  
**Independent Test**: 用离线 JSON 工件也能渲染 verdict 与原因（不依赖 worker/session）。

- [ ] T015 [US3] 支持从本地 JSON 工件导入并渲染（不触发 trial-run）到 `examples/logix-sandbox-mvp/src/contract-suite/ImportArtifacts.tsx`
- [ ] T016 [US3] 文档/迁移说明：明确“AST 仅为编辑载体，IR/工件为裁判”的边界到 `specs/036-workbench-contract-suite/research.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1（Workbench 一键验收）优先；US2（CI diff）与 US3（离线导入）可并行推进
