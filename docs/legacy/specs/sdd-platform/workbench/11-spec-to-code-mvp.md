---
title: 11 · MVP：从 Live Spec 到可运行代码的最小竖切
status: draft
version: 2025-12-12
value: core
priority: now
related:
  - ./00-overview.md
  - ./ui-ux/03-spec-studio.md
  - ./05-intent-pipeline.md
  - ./01-module-traits-integration.md
  - ./02-full-duplex-architecture.md
  - ./08-alignment-lab-and-sandbox.md
---

# MVP：从 Live Spec 到可运行代码的最小竖切

> 目标：用 **一个具体场景** 跑通「需求 → Live Spec → Intent/Blueprint → Module & Traits → 本地代码 → Sandbox 运行与验收」的最小闭环，为后续平台化演进提供“可示范、可回放”的样板。

## 1. 场景与边界

- 场景选择：沿用 sandbox-runtime 的 **省市区联动 RegionSelector** 作为唯一竖切用例。  
- 用户角色：  
  - 需求录入者（PM/架构师）：只在 Spec Studio 中写需求、看演示与验收结果；  
  - 开发：在本地仓库实现 Module/Logic/Traits，使用 Dev Server 与 Sandbox。  
- 技术边界（MVP 不做的）：  
  - 不做多 Feature、多页面、多模块编排；  
  - 不做双向 Doc↔Code 完全同步（先单向 Doc→Code，代码改动只标记“Outdated”）；  
  - 不做复杂 UI 拖拽，仅使用简单语义组件与线框预览。

## 2. 步骤一：Spec Studio v0.1（Live Spec 入口）

**目标**：提供一个最小可用的 Live Spec 编辑器，让需求录入者（PM/架构师）能用“写文档 + 插卡片”的方式把 RegionSelector 需求说清楚，并形成结构化 Spec。

- 功能范围：  
  - 富文本编辑（基于 BlockNote/Tiptap），支持标题/段落/列表；  
  - 三类 Block：  
    - Entity Block：定义 `RegionSelector` 相关实体（如 `Province`/`City` 简化版）；  
    - Scenario Block：至少 1 条 Given/When/Then（选择省份 → 城市列表更新）；  
    - 可选 Logic Block：用“自然语言 + 简单表达式”描述联动规则。  
  - Outline 视图：列出本 Spec 中出现的 Entity / Scenario，方便 Dev/AI 定位。  
- 输出契约：  
  - 保存后形成 `FeatureSpec` + `ScenarioSpec`（结构化 JSON），作为 Intent Pipeline 的输入；  
  - 每个 Block 具备稳定 `id`，为后续 Doc→Code → Alignment 回写提供锚点。

## 3. 步骤二：Intent Pipeline v0.1（Spec → Intent/Blueprint）

**目标**：从 Live Spec 出发，自动/半自动得到一份“够用”的 Intent/Blueprint 草稿。

- 功能范围：  
  - 从 Entity Block 生成：  
    - 最小的 Domain/Module Intent 节点（如 `RegionSelectorModule` 的 state 草稿）；  
  - 从 Scenario Block 生成：  
    - 一条 RegionSelector 的 ScenarioSpec 实体（已挂 storyId/stepId）；  
    - 初步的 Logic/Intent 节点（“当省份变化时，刷新城市列表”）。  
  - Blueprint 视图（文本/简单图形均可）：  
    - 1 个 Screen（RegionSelector 页面） + 1 个 Module + 1 个 Resource（地区接口）。  
- 输出契约：  
  - `FeatureBlueprint`（仅包含 RegionSelector 的 Screen/Module/Resource 骨架）；  
  - 初步的 `ModuleIntentNode` / `LogicIntentNode`（只需要跑通一个联动链路）。

## 4. 步骤三：Module & Traits v0.1（蓝图 → Module 图纸）

**目标**：基于 Blueprint/Intent，把 RegionSelector 的 Module 图纸和 Traits 骨架固定下来。

- 功能范围：  
  - 在 `examples/logix/src/scenarios/region-cascade.ts`（现有样本）基础上定义/演进 `RegionSelectorModule`：  
    - state：包含 `province` / `city` / `options` 等字段；  
    - actions：如 `setProvince` / `setCity`；  
    - traits（最小集）：  
      - 一个 `source` Trait：根据 `province` 加载 `cityOptions`；  
      - 可选 `link` Trait：当 `province` 变化时重置 `city`。  
  - Traits 层输出 StateTraitProgram/Graph：  
    - 仅需覆盖上述字段与依赖关系。  
- 输出契约：  
  - Module 图纸（state/actions/traits）被确认为 RegionSelector 主样本；  
  - StateTraitGraph 可被 Devtools/Sandbox 导出，用于 Alignment。

## 5. 步骤四：Dev Server & 出码 v0.1（Intent/Module → 本地代码）

**目标**：实现从 Spec/Blueprint 到仓库内 TS 代码的“单向出码”，并能从代码反向刷新 IR。

- 功能范围：  
  - `logix dev` 能：  
    - 识别当前仓库中的 RegionSelectorModule 文件（或生成骨架）；  
    - 从 Intent/Blueprint 生成或更新：  
      - Module state/schema 定义；  
      - traits 对象骨架（含必要的 `StateTrait.source` / `link` 调用）；  
      - 与 Scenario 对应的最小测试文件（可选）。  
  - 同步策略（MVP）：  
    - Spec → Code：支持“生成/更新 RegionSelectorModule”；  
    - Code → Spec：仅更新 IR 用于可视化，文档标记为“Outdated”即可，不做自动回写。  
- 输出契约：  
  - 仓库中有一份可编译的 RegionSelector 代码（Module + Traits + 简单 Logic）；  
  - Dev Server 能导出对应的 IntentRule/StateTraitGraph，供下一步 Sandbox 使用。

## 6. 步骤五：Sandbox & Alignment v0.1（Code → 可视化验收）

**目标**：在浏览器中以最简单方式跑通 RegionSelector 场景，并用红/绿信号反馈给用户。

- 功能范围：  
  - `@logixjs/sandbox` 中的 MVP 路线：  
    - Worker 内加载 RegionSelector 代码（使用 Mock Env / Mock HTTP）；  
    - 主线程提供一个线框 UI（可点击选择省份/城市）；  
    - 运行一次 Scenario：模拟用户选择一个省份，检查城市列表是否更新。  
  - Alignment 视图（极简版）：  
    - 以 Spec Studio 中的 Scenario Block 为入口，点击“运行”；  
    - 展示：  
      - 该 Scenario 是否通过（绿勾/红叉）；  
      - 如失败，列出简单诊断（例如“cityOptions 未包含预期城市”）。  
- 输出契约：  
  - RunResult 至少包含：tickSeq 锚定的事件流（Trace；必要时包含 Tape）+ StateSnapshot/Patch + Static IR anchors（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）；  
  - AlignmentReport 针对单个 Scenario 给出通过/失败 + 文本诊断，并将状态回写到对应 Scenario Block。

## 7. 验收标准（MVP Done 的定义）

当且仅当满足以下条件，可以认为“从 Live Spec 到可运行代码”的 MVP 竖切已打通：

1. 需求录入者（PM/架构师）能在 Spec Studio 中用实体块 + 场景块描述 “省市区联动” 需求，无需写任何代码或配置变量名；  
2. 开发能从这份 Spec 出发，在本地得到一份可编译的 RegionSelector 模块代码（state/actions/traits 至少一条 source/link）；  
3. 在 Playground/Sandbox 中，需求录入者/开发能一键运行该 Scenario，看到联动生效与否的红/绿反馈；  
4. 若逻辑不符合 Spec，Alignment 视图至少能给出一条可读的诊断（指向某个字段/Trait/步骤），而不是纯堆栈/日志。

> 后续阶段可以在此基础上扩展：多场景、多模块、更多 Trait/Intent 类型、双向 Doc↔Code、Universe/Galaxy 视图等，但不应扩大本 MVP 的交付范围。
