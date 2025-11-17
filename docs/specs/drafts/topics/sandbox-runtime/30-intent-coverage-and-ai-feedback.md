---
title: Intent Coverage & AI Feedback · Outline
status: draft
version: 2025-12-08
value: draft
priority: later
---

# Intent Coverage & AI Feedback · Outline

> 本稿作为占位，串联「ScenarioSpec / UI_INTENT / TraceSpan / RunResult / AlignmentReport」在平台侧做覆盖率、回归 Diff 与 AI 反馈的整体思路，细节将在后续版本中细化。

## 1. 覆盖率模型（Scenario / Step / IntentRule）

- 覆盖粒度：  
  - 场景级：ScenarioSpec 是否至少有一次成功运行；  
  - Step 级：ScenarioSpec 内每个 Step 是否在某次 run 中被命中（基于 UI_INTENT.meta.storyId/stepId）；  
  - 规则级（后续）：IntentRule 是否被触发（基于 Trace/log 中的 ruleId）。  
- 基本指标：  
  - `scenarioCoverage`: 已覆盖 / 总场景数；  
  - `stepCoverage`: 每场景已命中 Step 数 / 总 Step 数；  
  - `ruleCoverage`: 触发过的规则数 / 总规则数。

## 2. RunResult 对比与行为 Diff（回归视角）

- 对比对象：两次或多次 RunResult（包括 UI_INTENT 序列 / TraceSpan / HTTP 请求 / stateSnapshot）。  
- 行为 Diff 维度：  
  - UI_INTENT：新增/缺失/顺序变化的 Step（结合 meta.storyId/stepId/label）；  
  - HTTP：新增/缺失请求、URL 或参数变化；  
  - stateSnapshot：关键字段的变更（采用白名单或 Spec 中定义的关注字段）。  
- 输出形式：  
  - 面向 PM 的自然语言总结（例如“现在选广东后，不再加载深圳城市列表”；“新版本多了一次 /sandbox.region/api/xxx 请求”）；  
  - 面向 AI/开发的结构化差异列表，供后续诊断与 patch 生成使用。

## 3. AlignmentReport 与任务联动（规划）

- AlignmentReport 作为连接 Spec 与 RunResult 的桥梁，包含：  
  - scenarioId / runId / sourceVersion；  
  - `passed: boolean`；  
  - `violations`: { ruleId | specRef, message, severity, relatedTraces }[]；  
  - 覆盖统计（见第 1 节）。  
- 任务联动：  
  - 对于未通过或存在严重 violations 的 Step/Rule，平台可以直接提供「创建任务/缺陷」按钮：  
    - 例如：“Step 2：选择省份广东时，UI Intent 未触发 / options 不正确”；  
  - 任务对象中附带 ScenarioSpec 片段 + RunResult 关键信息，减少人工复述。

## 4. 仪表盘与版本视角

- 仪表盘：  
  - 显示核心场景（RegionSelector、下单、风控等）在最近构建中的通过率与 Step 覆盖情况；  
  - 对于曾经通过、后来失败的场景，以红点/趋势图标记。  
- 版本对齐：  
  - ScenarioSpec 带版本号，RunResult 标记 `sourceVersion`；  
  - 支持在 Playground/Studio 中选择“以 Spec v1.2 回放当前代码”，查看哪些 Step 不再满足原版验收条件。

> 目前 RegionSelector MVP 只实现了最小的 Step 覆盖视图（基于 UI_INTENT.meta.storyId/stepId），上述覆盖率/对齐/仪表盘能力作为后续阶段的规划约束，为现在的协议与实现保留演进空间。

