# Implementation Plan: Module Stage Blueprints（033：Module 舞台语义蓝图）

**Branch**: `033-module-stage-blueprints` | **Date**: 2025-12-26 | **Spec**: `specs/033-module-stage-blueprints/spec.md`  
**Input**: `specs/033-module-stage-blueprints/spec.md`

## Summary

033 的目标是把“场景画布编排语义模型”落成可长期存储、可 diff、可 codegen、可试运行验收的蓝图体系：

- 语义蓝图（Scenario/Stage）与投影蓝图（UI/Layout）彻底解耦（与 032 对齐）
- Module 实例必须具备稳定 `instanceId`（作为 runtime 实例锚点注入）
- 跨模块交互只允许通过“事件 → 动作”的语义边表达，并拥有稳定 `ruleId`（用于回放/高亮对齐）
- 动态列表回填必须基于 `rowRef`（稳定 `$rowId`），禁止 index 语义渗漏
- 正常运行不解释蓝图：蓝图通过 codegen 生成模块代码；验收通过 031/036 的 trial-run 工件闭环完成

本特性会用统一协议域 `@logixjs/module.*` 固化语义层的核心资产：

- `@logixjs/module.stageBlueprint@v1`：语义蓝图（节点=ModuleInstance，边=IntentRule）
- `@logixjs/module.intentRule@v1`：事件→动作连线（ruleId + endpoints + mapping refs）
- `@logixjs/module.rowRef@v1`：动态列表稳定定位（rowPath + rowId）

> 说明：映射/条件等表达式资产由 034 定义；端口/类型事实源由 035 定义；试运行工件槽位由 031 定义；统一验收口径由 036 定义。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/form`、`@logixjs/sandbox`  
**Storage**: N/A（蓝图与资产作为可序列化 JSON，可由平台决定落盘方式）  
**Testing**: Vitest（协议/归一化/diff 建议以纯函数 + 单测为主）  
**Target Platform**: Node.js（codegen/CI）+ 现代浏览器（Workbench/Studio）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**:
- 运行时热路径零成本：蓝图只在编辑/出码/验收路径被消费（NFR-001）
**Constraints**:
- 稳定标识：`instanceId/rowId/ruleId` 不得默认随机化（constitution）
- 统一最小 IR：验收与解释链路只认 trial-run 工件（031/036），蓝图只是输入事实源之一（不是 runtime 私有结构）
**Scale/Scope**:
- P1 先固化“代表性场景”的最小闭环：父弹框列表 → 打开子弹框 → 提交回填（见 spec）

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 033 负责 Intent/Scenario/Stage 的“语义事实源”与 codegen 输入；运行时事实与回放由 trial-run 工件（Manifest/StaticIR/Evidence/Artifacts）提供并作为裁判（031/036）。
- **依赖/修改的 SSoT（docs-first）**
  - 031 TrialRun artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
  - 032 UI 投影边界：`specs/032-ui-projection-contract/spec.md`
  - 035 模块引用空间事实源（PortSpec/TypeIR + CodeAsset 协议）：`specs/035-module-reference-space/spec.md`
  - IR 全链路（IrPage→TrialRun）：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
- **IR & anchors（统一最小 IR + 稳定锚点）**
  - `ruleId` 必须可映射到动态 Trace（后续由 runtime/Devtools 建立锚点映射），避免 UI 只靠位置高亮造成漂移。
- **Deterministic identity**
  - blueprint 的 `instanceId/ruleId/rowId` 必须可注入/可重建；不得默认 `Math.random()/Date.now()`。
- **Transaction boundary**
  - 所有跨模块写入必须在动作语义中收敛为“事务内写回”；禁止 UI/资产绕过语义边直接跨模块写 SubscriptionRef。
- **Diagnosability**
  - 语义边执行失败必须可解释（至少包含 source/sink、rowRef、映射摘要、失败分类）。
- **Breaking changes**
  - 蓝图协议演进通过 `@logixjs/module.*@vN` 版本化；破坏性变更以迁移说明替代兼容层。
- **质量门槛（Pass 定义）**
  - 产物落地时：`pnpm typecheck`、`pnpm lint`、`pnpm test`（后续 tasks 阶段执行）

## Phases

### Phase 0（Research）：把“画布节点/连线/回填”抽成最小完备模型

- 明确画布层可配置的核心概念（节点/边/资产），并明确哪些信息必须从 artifacts 推导（禁止手工配置 PortSpec/TypeIR 这类事实源）。
- 明确 id 模型：`scenarioId/instanceId/ruleId/rowId` 的生成、稳定性与迁移策略。
- 明确 codegen 的最小契约：蓝图如何变成“可运行模块集合”，以及如何把锚点回写到 runtime 诊断事件中（以便 036 做 Integrated Verdict）。

### Phase 1（Design & Contracts）：固化 StageBlueprint/IntentRule/RowRef schema

- 在 `specs/033-module-stage-blueprints/contracts/schemas/` 固化：
  - `stage-blueprint.schema.json`（`@logixjs/module.stageBlueprint@v1`）
  - `intent-rule.schema.json`（`@logixjs/module.intentRule@v1`）
  - `row-ref.schema.json`（`@logixjs/module.rowRef@v1`）
- 在 `data-model.md` 固化：
  - 节点类型（ModuleInstance）与端口引用方式（引用 035 的 PortSpec key 空间）
  - 语义边模型（event→action + mapping asset refs）
  - 动态列表 rowRef 语义与失败策略
- 在 `quickstart.md` 写清：
  - “代表性场景”的最小 blueprint 示例（语义层，不含 UI）
  - 如何用 trial-run 工件验收“连线确实生效且可解释”（外链 031/036）

### Phase 2（准备进入 `$speckit tasks`）

- 将蓝图 schema、codegen 入口、Workbench 样例与合同守卫拆成可执行任务。

## Project Structure

### Documentation（本特性）

```text
specs/033-module-stage-blueprints/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── schemas/
```

### Source Code（预计相关目录；不在本阶段承诺实现）

```text
packages/
├── logix-core/                      # runtime（不解释蓝图）
├── logix-sandbox/                   # Workbench 执行壳
└── [planned] logix-workbench/       # （可选）平台级蓝图/合同守卫工具面（偏纯函数）

examples/logix-sandbox-mvp/
└── src/
    └── [planned] stage/             # 代表性场景（语义蓝图 + 最小投影视图）
```

**Structure Decision**：

- 033 的“蓝图归一化/判定/降级”优先做成纯函数（可单测、可用于 CI 与 Agent 工具面），UI 只是消费者。

## Complexity Tracking

无。若后续为了“源码级双向编辑”引入 TS AST/formatter，只允许作为编辑载体，不允许成为验收事实源。
