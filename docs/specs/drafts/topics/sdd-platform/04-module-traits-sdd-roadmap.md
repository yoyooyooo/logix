---
title: 04 · Module Traits 在 SDD 平台中的路线图
status: draft
version: 2025-12-12
value: core
priority: next
related:
  - ../module-traits-sdd-roadmap/00-overview.md
  - ./01-module-traits-integration.md
---

# Module Traits 在 SDD 平台中的路线图

> 本文将 `specs/001-module-traits-runtime` 及 `topics/module-traits-sdd-roadmap/00-overview.md` 的讨论统一纳入 `sdd-platform` 主题下，聚焦一个问题：  
> 在 Module 图纸（state + actions + traits）已经定型的前提下，平台侧如何从 L0/L1 Intent 走到 Runtime Alignment Lab，并在中间补齐必要的契约。

## 1. 上游：从 Intent 到 Module 图纸

结合 `01-module-traits-integration.md` 的场景化讨论，本节收敛出三类关键产物：

- `TraitHint`：Spec Agent/Architect Agent 从 `ScenarioSpec` 步骤中推断出对字段能力的需求（computed/source/link），并附带 reasoning 文本；  
- `Module Blueprint`：在 PLAN 阶段确定的 Module 骨架，包含 state/actions/traits 的结构草稿与人类确认过的 Trait 分配；  
- `IntentRule ↔ Trait Anchor`：在 Logic/Flow 层，IntentRule 中的 Source/Sink 必须显式引用 Trait/State 路径，确保 Flow 与字段能力保持同步。

平台上的推荐流程：

1. 在 Spec Studio 结晶 Feature/Scenario 后，由 Architect Agent 扫描 Steps，生成 `TraitHint[]` 并呈现在 Blueprint 编辑器中；  
2. 架构师基于 Hint 与现有 Module 资产，确认/调整 `Module Blueprint`；  
3. Blueprint 通过 Codegen Agent 生成 `StateTraitSpec` 草稿，并落地为 Module 图纸中的 `traits` 段。

## 2. 下游：从 Program 到 Alignment Lab

在 001 spec 中，已经约定：

- `StateTrait.build` 将 `state + traits` 编译为 `StateTraitProgram`（含 Graph/Plan）；  
- `StateTrait.install` 在 Runtime 中消费 Program，将能力编译为 watcher / Flow / Middleware wiring。

平台要补齐的是：

- **Resource/Query 契约**：  
  - 用 `ResourceSpec` 定义服务层 contract 与 Layer/Middleware 组合；  
  - 强制 `StateTrait.source` 引用已注册的 `resourceId`，并通过 `key(state)` 建立与 Domain Intent 的联系。  
- **Alignment Lab 集成**：  
  - 在 Sandbox 运行 Scenario 时，同时导出 `StateTraitGraph`、EffectOp 时间线与每步 State Snapshot；  
  - 将这些结果与 `ScenarioSpec.Then` 及 Trait 期望进行结构/行为/状态三重对比，得出 AlignmentReport。  
- **Trait 改动治理**：  
  - 基于 Graph Diff 生成 `TraitDelta`，再由平台驱动 Intent/Blueprint 的更新，而不是直接在代码中“偷偷”改 traits。

## 3. 与平台总图的关系

- 在 `sdd-platform/00-overview.md` 中定义的四阶段 SDD 流程不变，Module Traits 只是贡献了 **Module 图纸与字段能力这一条“结构化真理层”**；  
- `01-module-traits-integration.md` 负责解释 Traits 在平台中的定位与心智模型，本文件则聚焦“缺口与路线图”；  
- `topics/module-traits-sdd-roadmap/00-overview.md` 现被视为本文件的前身，后续更新建议直接在 `sdd-platform` 主题下进行。

## 4. 后续工作指引

- 规范层：  
  - 在 `docs/specs/intent-driven-ai-coding/v3` 中补充 `TraitHint`、`Module Blueprint` 与 AlignmentReport 的概念定义；  
  - 在 `docs/specs/runtime-logix/core` 中补充 IntentRule ↔ Trait Anchor、ResourceSpec/Query 契约与 StateTraitProgram 导出格式。  
- 实现层：  
  - 在 `@logix/core` 中完善 StateTrait Graph/Plan/Program 的导出接口；  
  - 在 `@logix/sandbox` 中实现基于 ScenarioSpec 的 Alignment Lab，并输出 TraitDelta。  
- 平台层：  
  - 在 Spec Studio/Architecture Canvas 中，提供 TraitHint/Blueprint/Graph Diff 的可视化入口；  
  - 将 TraitDelta 与 SDD 的 TASKS 阶段集成，自动生成“同步 Intent/Blueprint/Code”的任务。

## 5. 平台能力收益（视角整理）

结合 001 spec 与当前草案，StateTrait 在平台侧至少带来四类直接收益，可以作为 SDD 平台规划时的“设计约束”：

- **可视化与架构洞察**：通过 `StateTrait.build` 输出的 `StateTraitGraph`，Studio 可以在 Module 内画出字段级拓扑图，并在 Universe 视图中基于 `link/source` 边还原跨模块的数据流向，而不必从命令式 Effect 代码中“猜关系”。  
- **全双工编辑（Full-Duplex Editing）**：字段能力被集中在 `Module.make(..., { traits })` 的静态对象字面量中，Parser 易于识别与回写，Studio 在画布上增删连线或切换 `computed/source/link` 本质上只是对该对象做局部 AST patch，天然适合作为 Low-Code ↔ Pro-Code 的桥。  
- **玻璃盒调试（Glass-Box Debugging）**：`StateTraitPlan` 与 EffectOp 元数据结合后，DevTools 能将字段更新与具体 Trait 规则关联起来——时间线不再只是 `state:update`，而是“哪个 Trait 因何依赖触发了更新”，并支持按 `resourceId + key` 聚合查看远程数据加载行为。  
- **AI 协同与代码生成**：对 AI 来说，`traits` 是结构固定、参数有限的 DSL 目标，远比直接生成长链 Effect 流安全可靠；再加上 ScenarioSpec ↔ StateTraitSpec / StateTraitGraph 的映射，平台可以在静态层面检查“需求中提到的字段能力是否已有对应 Trait”，为 Alignment Lab 与自愈循环提供强锚点。
