---
title: 20 · 信息架构与导航（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./10-requirements-and-mvp.md
  - ./22-rule-grid-and-validation.md
  - ./23-live-spec-and-scenario-editor.md
  - ../sdd-platform/05-intent-pipeline.md
  - ../intent-studio-ux/00-overview.md
  - ../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md
  - ../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md
  - ../sandbox-runtime/35-playground-product-view.md
---

# 20 · 信息架构与导航（Platform Workbench PRD）

## 1. Workbench 的“信息架构”目标

- 让用户永远知道：我在看哪个 Project/Feature/Scenario/Module/Run
- 让用户随时能跳转：Spec ↔ Rule ↔ Code ↔ Trace（四端对齐）
- 让复杂性按层次暴露：Universe（拓扑）→ Galaxy（规则/编排）→ Planet（代码/实现）

> 对齐原则：`../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md` 的 Universe/Galaxy/Planet 分层 + “配置优于连线，代码优于图形”。

## 2. 顶层导航树（建议）

以“项目”为容器（Project‑Scoped Workbench），顶层导航建议按产物类型组织，而不是按技术实现组织：

- **Dashboard**：项目总览（最近 Feature、红灯 Scenario、风险信号）
- **Features（Specs）**
  - Feature 列表
  - Feature 详情（Live Spec、Pipeline、Scenarios、蓝图、对齐历史）
- **Modules（Universe）**
  - 模块拓扑（域/模块/依赖）
  - Module 详情（导出、依赖、规则聚合、运行观测）
- **Rules（IntentRule Explorer）**
  - 按 Module/Feature/Scenario 过滤的规则表
  - 规则编辑 + 生成代码（MVP‑2 的核心页面）
  - Intent Studio（决策表/网格形态，PM 侧高频编辑模式）
- **Playground（Alignment Lab）**
  - 场景选择 + 运行 + 观测 + 对齐报告（MVP‑0/1 的核心页面）
- **Patterns**
  - Pattern 目录/注册表
  - Pattern 详情（契约、配置表单、验证、发布）
- **Runs / Reports**
  - Run 历史、对齐报告历史、回放
- **Settings**
  - 环境/Mock/权限/集成（Dev Server、Auth 等）

## 3. 页面模型（最小闭环下的页面职责）

### 3.0 Live Spec（SPECIFY 的主界面）

必须回答：

- “需求”与“验收用例”是否写清楚？（Feature/Scenario/Steps）
- 每个结构化块是否具备稳定锚点（blockId/stepId），以便后续对齐与回写？
- 当前 Spec 处于什么状态（draft/in_review/signed_off），谁签了什么？

> Intent Pipeline 的 Stage 0 对齐：`../sdd-platform/05-intent-pipeline.md`。

### 3.1 Feature 详情页（Spec 为中心）

必须回答：

- 这个 Feature 解决什么？有哪些 Scenarios？
- 当前版本的对齐状态：哪些绿、哪些红、为什么红？
- 这条链路的产物：Blueprint / RuleSet / Code Anchors（可跳转）

### 3.1.1 Feature Pipeline（Stage 0–3 的流水线视图）

必须回答：

- Stage 0–3 目前卡在哪？（Raw Requirement / Domain / Schema / Logic）
- 每一阶段的产物是否“可追溯”：能回跳到上游来源、能下钻到下游落点
- 哪些是 AI 建议、哪些已被人类确认（Sign‑off 粒度）

### 3.2 Scenario 详情页（可运行单元）

必须回答：

- Given/When/Then（或 Step 列表）是什么？
- 关联的 IntentRuleSet 是什么？
- 最近几次运行的 RunResult/AlignmentReport 如何？

### 3.3 Module 详情页（架构与治理）

必须回答：

- 我依赖谁？谁依赖我？跨域边界在哪里？
- 我有哪些关键规则（聚合 IntentRule）？哪些是跨模块规则？
- 最近运行中我触发过哪些规则？有哪些高频错误？

### 3.4 Rule Explorer（Plan → Code）

必须回答：

- 一条规则的 source/pipeline/sink 是什么？（R-S-T）
- 规则是 L1/L2/L3 哪一类？是否在“可解析子集”内？
- 修改规则后，生成代码如何？解析回 IR 是否一致？

### 3.4.1 Intent Studio（PM 高密度规则编辑）

必须回答：

- PM 是否能用“决策表/网格”快速表达联动规则（不依赖画布/连线）？
- 校验引擎是否能稳定给出确定性错误（冲突/循环）与可选建议（遗漏补全）？

> 交互原则对齐：`../intent-studio-ux/00-overview.md`。

### 3.5 Playground（Run → Explain → Align）

必须回答：

- 按 Scenario 运行后的 State/Logs/Trace 是什么？
- 哪条规则触发了/没触发？与 Spec 的差异在哪里？

## 4. 跨视图导航（强约束）

以下跳转是“平台解释力”的硬指标：

- Spec → Run：从 Feature/Scenario 一键进入对应 Playground 运行/回放
- Spec → Rule：从 Scenario 直接过滤到相关 IntentRuleSet
- Rule → Code：从规则行跳到 TS 落点（文件/符号/链条）
- Trace → Rule：从 Trace span 反查 ruleId/intentId 并跳到规则/代码
- Universe → Rule：从模块节点直接列出“跨模块联动”规则（治理入口）
- Pipeline → Anchors：从 Pipeline 任意阶段都能跳到“来源需求片段 / 生成的规则 / 代码落点 / 运行证据”

> 注：上述跳转依赖稳定锚点（artifactId/ruleId/intentId/runId），这部分在 `31-data-model-and-contracts.md` 定义。
