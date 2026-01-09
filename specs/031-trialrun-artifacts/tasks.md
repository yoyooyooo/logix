---
description: "Task list for 031-trialrun-artifacts (TrialRunReport.artifacts + RulesManifest artifact)"
---

# Tasks: TrialRun Artifacts（031：artifacts 槽位 + RulesManifest 首用例）

**Input**: `specs/031-trialrun-artifacts/spec.md`  
**Prerequisites**: `specs/031-trialrun-artifacts/plan.md`（required）, `specs/031-trialrun-artifacts/research.md`, `specs/031-trialrun-artifacts/data-model.md`, `specs/031-trialrun-artifacts/contracts/`, `specs/031-trialrun-artifacts/quickstart.md`

**Tests**: 本特性触及 `@logixjs/core` 反射/试跑按需路径与跨宿主 JSON 工件输出；需要至少补齐 contracts/schema 预检 + 导出/失败/冲突/预算的单测，避免 Workbench/CI 口径漂移。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（Contracts & 预检骨架）

- [x] T001 补齐 031 contracts README（schema 清单 + keys）到 `specs/031-trialrun-artifacts/contracts/README.md`
- [x] T002 [P] 增加 contracts 预检测试（031 schemas JSON 可解析 + $ref 可解析）到 `packages/logix-core/test/Contracts/Contracts.031.TrialRunArtifacts.test.ts`

---

## Phase 2: Foundational（artifacts 槽位能力：导出/冲突/失败/预算骨架）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何 kit-specific 导出（US1/US2）。

- [x] T003 定义 artifacts 领域模型与类型入口（ArtifactKey/ArtifactEnvelope/TrialRunArtifacts）到 `packages/logix-core/src/internal/observability/artifacts/model.ts`
- [x] T004 定义 artifact 导出者接口（按 moduleId/inspectionCtx 输出 JsonValue）到 `packages/logix-core/src/internal/observability/artifacts/exporter.ts`
- [x] T005 定义 artifacts 收集器：冲突检测、单项失败不阻塞、稳定排序到 `packages/logix-core/src/internal/observability/artifacts/collect.ts`
- [x] T006 将 TrialRunReport.artifacts 接入反射链路（trialRunModule 组装 report）到 `packages/logix-core/src/internal/observability/trialRunModule.ts`
- [x] T007 为 artifacts 导出增加预算/截断“骨架语义”（maxBytes + truncated + actualBytes）到 `packages/logix-core/src/internal/observability/artifacts/collect.ts`
- [x] T008 [P] 单测：key 冲突失败可行动（包含 key + exporterId）到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.conflict.test.ts`
- [x] T009 [P] 单测：单项失败不阻塞（error envelope + 其它 artifact 仍输出）到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.partial-failure.test.ts`
- [x] T010 [P] 单测：预算截断标记稳定（truncated + budgetBytes + digest 可选）到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.budget.test.ts`

---

## Phase 3: User Story 1 - 平台侧能看到 RulesManifest（Priority: P1）🎯 MVP

**Goal**: `/ir` 一次检查即可看到 `@logixjs/form.rulesManifest@v1`（含 warnings），且不使用表单 rules 时不报错。  
**Independent Test**: `examples/logix-sandbox-mvp` 的 `/ir` 页面展示 artifacts，并能下载 JSON；同输入重复导出一致。

- [x] T011 [US1] 在 form kit 实现 RulesManifest artifact 导出（复用 028 schema）到 `packages/logix-form/src/internal/form/artifacts.ts`
- [x] T012 [US1] 将 form artifact 导出者接入 artifacts 收集链路（注册到 trial-run）到 `packages/logix-form/src/internal/form/impl.ts`
- [x] T013 [US1] 让 sandbox workbench 的 trial-run 输出携带 artifacts 并可导出到 `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- [x] T014 [US1] 在 `/ir` 增加通用 artifacts viewer（按 artifactKey 分组 + 复制/下载）到 `examples/logix-sandbox-mvp/src/ir/ArtifactsPanel.tsx`
- [x] T015 [P] [US1] 集成回归：含 rules 的代表性模块导出 `@logixjs/form.rulesManifest@v1` 到 `examples/logix-sandbox-mvp/test/ir.rulesManifest.test.ts`
- [x] T016 [P] [US1] 集成回归：无 rules 模块导出时 `artifacts` 缺省/为空且 UI 不报错到 `examples/logix-sandbox-mvp/test/ir.noArtifacts.test.ts`

---

## Phase 4: User Story 2 - Feature Kit 可扩展导出补充 IR（Priority: P2）

**Goal**: kit 侧无需改动 core 业务逻辑即可挂接 artifact 导出（OCP）。  
**Independent Test**: 增加一个 dummy exporter，只改 kit 自己的文件即可出现在 TrialRunReport.artifacts。

- [x] T017 [US2] 提供 kit 注册入口（显式扩展点，禁止全局单例偷挂）到 `packages/logix-core/src/internal/observability/artifacts/registry.ts`
- [x] T018 [US2] 将 registry 接入 trial-run 组装上下文（按 moduleId 收集 exporters）到 `packages/logix-core/src/internal/observability/trialRunModule.ts`
- [x] T019 [P] [US2] 单测：dummy exporter 通过 registry 挂接后可在 report.artifacts 出现到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts`
- [x] T020 [US2] 文档：kit 维护者如何新增 artifact key + schema + exporter 到 `specs/031-trialrun-artifacts/quickstart.md`

---

## Phase 5: User Story 3 - Artifact 可预算、可截断、可 diff（Priority: P3）

**Goal**: 输出确定性、预算可控、diff 噪音低。  
**Independent Test**: 同一模块重复导出一致；超预算可预测截断；JSON diff 主要反映语义差异。

- [x] T021 [US3] 统一体积估算与稳定 digest（仅基于 JsonValue 稳定派生）到 `packages/logix-core/src/internal/observability/artifacts/digest.ts`
- [x] T022 [US3] 将 digest/稳定排序接入 artifacts collect（避免 key 顺序/数组顺序噪音）到 `packages/logix-core/src/internal/observability/artifacts/collect.ts`
- [x] T023 [P] [US3] 单测：同输入多次导出 artifacts 的确定性到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts`
- [x] T024 [P] [US3] 单测：超预算截断后仍可 JSON diff（不会破坏 envelope 结构）到 `packages/logix-core/test/TrialRunArtifacts/Artifacts.truncation-diff.test.ts`

---

## Phase 6: Polish & Cross-Cutting

- [x] T025 [P] 文档回链：在 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md` 增补 artifacts 槽位说明
- [x] T026 Run `specs/031-trialrun-artifacts/quickstart.md` 的步骤自检并补齐缺口到 `specs/031-trialrun-artifacts/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- Phase 2 完成后：US1 可先做 MVP；US2/US3 可并行推进
- US1 完成即可作为 036 Contract Suite 的最小 artifacts 输入，后续其它 artifact keys 复用同一槽位
