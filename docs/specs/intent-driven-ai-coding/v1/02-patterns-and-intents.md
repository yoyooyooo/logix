---
title: 模式库与意图资产（v1 精简版）
status: archived
version: v1
supersededBy: ../v3
---

> 本文仅保留 v1 时代对 Pattern / Intent 的核心定义，作为与 v3 的概念对照。当前 Pattern/Intent 规范以 `v3` 为准。

## 1. Pattern 在 v1 里的定义

在 v1 中，一个 Pattern 被理解为：

- 来自真实业务的“高频套路”，在多个场景中复用；  
- 对应一整套 UI 结构 + 状态拆分 + 数据流写法，而不是单个组件；  
- 同时给出“适用场景 / 不适用场景 / 常见反模式”。

简化后的心智模型：

- **组件**：解决“某个局部 UI 怎么长”的问题；  
- **Pattern**：解决“一类场景整体该怎么拆和编排”的问题；  
- **Template**：Pattern 在具体技术栈下的一次性落地。

v3 中不再强调独立的 Pattern YAML，但仍沿用「先选解法，再落地代码」的思路，只是承载位置转移到 Flow/Intent/Logix 组合上。

## 2. Intent 在 v1 里的角色

v1 把 Intent 视为：

- **结构化的需求说明**：包含目标 (goals)、场景结构 (scene)、领域模型 (domain)、已选模式 (patterns) 等；  
- **LLM 的 Prompt 容器**：便于模型基于统一 Schema 生成 Pattern 建议、Plan 草稿与代码骨架；  
- **团队的共识文档**：可视化地展现“这个 feature 想做什么”和“采用了哪些通用套路”。

在 v3 中，Intent 进一步收敛到与 Flow/Schema/Logix 更密切的绑定：  
场景结构、行为步骤、数据契约更倾向于直接落在 Flow DSL 与运行时代码上，而不是大块 YAML。

## 3. v1 对后续版本仍有参考价值的点

- 明确区分“业务意图（Intent）”与“工程解法（Pattern）”，避免二者混在一张配置里；  
- 为 Pattern 维护「适用性说明 + roles + dataContract」的做法，有助于未来在 v3 中继续沉淀“可选解法集合”；  
- 把 Intent/Pattern/Template/Plan 都视为 LLM 可读写的一等资产，而不是单向生成物。

