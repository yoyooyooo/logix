---
title: 22 · 规则网格与校验引擎（IntentRule Authoring）（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./10-requirements-and-mvp.md
  - ./20-information-architecture.md
  - ./21-interaction-prototypes.md
  - ./31-data-model-and-contracts.md
  - ./32-collaboration-and-permissions.md
  - ./33-alignment-and-diagnostics.md
  - ../../../intent-driven-ai-coding/platform/README.md
  - ../../../intent-driven-ai-coding/platform/impl/README.md
  - ../intent-studio-ux/00-overview.md
  - ../sdd-platform/ui-ux/02-pm-intent-workbench.md
---

# 22 · 规则网格与校验引擎（IntentRule Authoring）（Platform Workbench PRD）

> 目标：把“PM/架构/开发在平台上写规则”的交互与数据模型收敛到一套可实现契约：
>
> - 输入形态：决策表/规则网格（Keyboard‑First）
> - 中间表示：`IntentRule`（R‑S‑T：source/pipeline/sink）
> - 校验闭环：确定性校验（硬错误）+ AI 建议（软建议）

## 1. 定位：规则网格解决什么问题

规则网格（Rule Grid）是 MVP‑2 的核心，因为它能在不引入画布复杂度的情况下打通：

- PLAN：把需求/蓝图落到可计算的规则骨架（IntentRuleSet）
- IMPLEMENT：生成标准 Fluent 写法（白盒子集）并写回仓库（经 Dev Server）
- RUN/ALIGN：把运行证据映射回 ruleId/stepId（可解释）

> 交互哲学对齐：
> - “配置优于连线，代码优于图形”：`../../../intent-driven-ai-coding/06-platform-ui-and-interactions.md`
> - “Excel 级高频录入 + 编译器思维”：`../intent-studio-ux/00-overview.md`

## 2. 统一概念：R‑S‑T + Condition + Effects

### 2.1 R‑S‑T（平台统一骨架）

- **Source**：触发源（state/action/external）
- **Strategy**：流动策略（pipeline：debounce/throttle/filter/并发策略等）
- **Target**：作用目标（mutate/dispatch/service/pattern 等）

对应到 `IntentRule`：

- `source` → Source
- `pipeline` → Strategy
- `sink` → Target

### 2.2 Condition 与 Effects 的定位

为了适配 PM 的“决策表”心智模型，网格通常会显式提供：

- **Condition**：条件表达式（本质上会被编译进 `pipeline.filter(...)` 或 sink handler 内）
- **Effects**：副作用列表（本质上会编译成 sink 的 handler 逻辑，或拆成多条 IntentRule）

本 Topic 的裁决：

- **网格层可以有 Condition/Effects 列**，但平台最终必须降解为 `IntentRule`（单一 IR）。

## 3. 网格行模型（GridRow）→ IntentRule 的映射

### 3.1 GridRow（建议形状，占位）

```json
{
  "rowId": "row_001",
  "trigger": { "context": "self", "type": "state", "field": "province" },
  "condition": { "op": "notEmpty", "args": [] },
  "strategy": [{ "op": "debounce", "args": [300] }],
  "effects": [
    { "kind": "callService", "service": "RegionApi.listCities", "args": [{ "from": "triggerValue" }] },
    { "kind": "reset", "field": "city" }
  ],
  "meta": { "ruleId": "rule_province_change_refresh_cities", "derivedFromStepId": "step_select_province" }
}
```

### 3.2 编译策略（可解释优先）

同一行 GridRow 可能需要编译为：

1. **单条 IntentRule**（首选）：effects 可在一个 sink handler 内完成
2. **多条 IntentRule**：当 effects 跨不同 target（例如同时 mutate + dispatch + service）且需要独立可观测时

约束：

- 编译后的每条 IntentRule 必须具备稳定 `ruleId`（或 `ruleId + subId`），并能回指 `rowId/stepId`（见 `derivedFrom/anchors`）。

## 4. 校验引擎（Validation Engine）

校验引擎分两层：**确定性裁决（硬错误）** 与 **非确定性建议（软建议）**。

### 4.1 硬错误（Deterministic）

硬错误必须满足：

- 可复现（同输入同输出）
- 可解释（给出“为什么错”与 anchors）
- 可阻断（阻止 publish/生成 patch/运行 gate，按策略）

建议最小集合：

1. **结构校验**
   - trigger/target 必填
   - 引用的 module/field/service 必须存在（来自模块元数据/Schema）
2. **类型/形状校验**
   - pipeline 参数类型正确（debounce 必须是 number）
   - handler 必填字段齐全
3. **冲突校验（Conflict）**
   - 同一目标字段在条件重叠区间产生矛盾效果（如 show + hide）
   - 输出：冲突对（rowId/ruleId）+ 最小反例条件（若能给出）
4. **循环依赖（Cycle）**
   - 基于 “字段依赖图（静态）+ 规则触发边（动态期望）” 做 cycle detection
5. **治理红线**
   - 违反白盒子集约束（例如试图生成不支持的算子名）
   - 违反跨模块写边界（例如无权限的跨域 dispatch）

> 算法实现可分阶段：MVP 先做图算法（cycle/简单冲突），SAT Solver 作为后续增强；但协议层先固定 diagnostics 形状（见 `40-protocols-and-apis.md`）。

### 4.2 软建议（AI Advisor）

软建议不具备裁决权，只能：

- 提示风险/最佳实践
- 提供一键修复（生成可审阅 patch）

建议最小集合：

- **遗漏补全（Omission Guard）**
  - Hidden 但未 Reset
  - Disabled 但仍 Required
- **治理建议**
  - 规则过多/过密导致可维护性风险（建议抽 Pattern 或拆 Module）
- **命名与可读性**
  - 提示补齐 rule title / ruleId 命名（但不可自动改写已签核资产）

## 5. UX 要点（高频输入）

### 5.1 三栏布局（左文‑中表‑右果）

对齐：`../intent-studio-ux/00-overview.md` 与 `../sdd-platform/ui-ux/02-pm-intent-workbench.md`

- A：输入流（粘贴 PRD/讨论片段），作为 derivedFrom 的来源之一
- B：规则网格（Rule Grid），高密度录入与批量操作
- C：体检面板（Health Check），展示硬错误与软建议，以及 payload/IR 预览

### 5.2 键盘优先（必须）

- Tab/Enter：单元格流式录入
- Cmd+Enter：新增行
- Cmd+D：向下填充（Fill Down）
- Cmd+Shift+V：粘贴并按列对齐
- Cmd+K：全局搜索（字段/模块/规则）

> 具体快捷键集合可后续再定，但“键盘优先”是不可妥协前提。

## 6. 输出与协作（与权限/审计对齐）

- Publish RuleSet → 创建 `RuleSetRevision`（append‑only）+ 审计事件
- Generate Patch → 生成 `PatchProposal`（需 review/sign‑off 才能 apply）
- Run Scenario → 产出 Run/Report，并把违规项锚定到 rowId/ruleId/stepId

> 协作与门禁见：`32-collaboration-and-permissions.md`。
