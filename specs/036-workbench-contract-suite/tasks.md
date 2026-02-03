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

- [x] T001 [P] 增加 contracts 预检测试（036 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.036.WorkbenchContractSuiteContracts.test.ts`

---

## Phase 2: Foundational（归一化工件 + Verdict/ContextPack 纯函数）

**⚠️ CRITICAL**: 本阶段完成前，不开始 Workbench UI（US1）或 CI diff（US2）。

- [x] T002 定义治理层核心数据结构与归一化入口（纯函数；禁止读 runtime 私有结构）到 `packages/logix-workbench/src/contract-suite/model.ts`
- [x] T003 定义 artifacts 归一化（key/version → availability/status + digest/summary）到 `packages/logix-workbench/src/contract-suite/normalize.ts`
- [x] T016 派生工件注入：允许把 TrialRunReport 之外的 artifacts 合并进同一 artifacts 空间（并在失败时保留 error 摘要用于 ContextPack）`packages/logix-workbench/src/contract-suite/normalize.ts`
- [x] T004 定义 Integrated Verdict 计算（PASS/WARN/FAIL + reasons + per-artifact 状态）到 `packages/logix-workbench/src/contract-suite/verdict.ts`
- [x] T005 定义 ContextPack 生成（facts + constraints + target；按预算裁剪 + 可选 values 白名单）到 `packages/logix-workbench/src/contract-suite/context-pack.ts`
- [x] T006 `@logixjs/sandbox` 保持薄层 re-export（避免 Node/Browser 代码混用）到 `packages/logix-sandbox/src/contract-suite/*`
- [x] T007 [P] 单测：降级模型（缺失/截断/失败）与 verdict 聚合到 `packages/logix-sandbox/test/contract-suite/verdict.test.ts`
- [x] T008 [P] 单测：ContextPack 预算裁剪与可选 inputs 到 `packages/logix-sandbox/test/contract-suite/context-pack.test.ts`
- [x] T009 [P] 回归：确定性 + breaking/risky 判定稳定到 `packages/logix-sandbox/test/contract-suite/diff-determinism.test.ts`
- [x] T010 [P] 回归：ContextPack 默认携带 SchemaRegistryPack value（040）到 `packages/logix-workbench/test/contract-suite/ContextPack.schemaRegistryValue.test.ts`

---

## Phase 3: Node Entrypoints（CI/Agent 统一入口）

**Goal**: 用 Node-only 跑道把 Contract Suite 变成可脚本化/可门禁的统一入口（不依赖浏览器 UI）。

- [x] T011 [US2] 在 CI 侧提供统一 Node 入口：产出/存档工件 + gate（已收敛到 `logix contract-suite run`；不再保留独立脚本）
- [x] T012 [US2] CLI 入口：`logix contract-suite run`（085）到 `packages/logix-cli/src/internal/commands/contractSuiteRun.ts`
- [x] T013 [P] CLI 集成用例：PASS/FAIL/ContextPack（含 schema registry value）到 `packages/logix-cli/test/Integration/cli.contract-suite.run.test.ts`
- [x] T017 [P] CLI 可选链路：`logix contract-suite run --includeAnchorAutofill`（report-only）在同一条命令里注入 `PatchPlan/AutofillReport`，并写入 ContextPack 与 `--out` 目录 `packages/logix-cli/src/internal/commands/contractSuiteRun.ts`、`packages/logix-cli/src/internal/args.ts`、`packages/logix-cli/test/Integration/cli.contract-suite.run.test.ts`、`examples/logix-cli-playground/*`
- [x] T014 文档同步：更新 036/085 quickstart，固化 Node 入口与工件清单到 `specs/036-workbench-contract-suite/quickstart.md`、`specs/085-logix-cli-node-only/quickstart.md`

---

## Deferred / Moved（不阻塞 036 签收）

- [x] T015 (Moved) 浏览器 Workbench UI（展示/导出/离线导入）迁移到消费者回归面/解释粒度试验场（优先归入 `specs/086-platform-visualization-lab` 或后续新 spec），036 保持“治理层 + Node gate”职责单一。
