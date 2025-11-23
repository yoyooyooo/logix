---
title: LLM 协同视角下的意图驱动工作流（v1 快照）
status: archived
version: v1
supersededBy: ../v3
---

> 说明：本篇保留的是 v1 时代对「LLM 在整条流水线中扮演什么角色」的早期理解。  
> 当前设计与实现一律以 v3 为准；这里仅作为对照材料，用来对比 v3 的 Logix/Flow 方案，以及挖掘仍可融合的细节。

## 1. Intent 作为 LLM 的结构化 Prompt

在 v1 视角下，Intent 的核心价值是：为 LLM 提供一份**结构化、可解析的需求描述**，而不是散文式 prompt。

- 对 LLM 来说，Intent 是“写代码前的事实源”，包含：目标 (goals)、场景结构 (scene)、领域实体与接口 (domain)、已选模式 (patterns) 等。  
- 对人类来说，Intent 是需求共识文档，既可以纯文本讨论，也可以在 UI 中编辑。
- v3 延续了这个思路，只是将 Intent 更紧地与 Flow DSL / Logix Engine 绑定，弱化了纯 YAML 为中心的形态。

## 2. 四类一等工件（v1 的世界观）

从 v1 的 LLM 视角看，平台只需要让模型理解和操作四类“硬资产”：

1. **Intent（意图说明）**  
   - 描述业务目标、场景结构、领域实体与接口。  
   - 作为“我要做什么”的事实源，是后续步骤的输入。

2. **Pattern（模式）**  
   - 描述“某类场景一贯怎么解”的复用套路：适用场景、组成角色 (roles)、数据契约、参数 Schema 等。  
   - 约束 LLM 不要随意“发明新架构”，而是在既有模式库内选型。

3. **Template Meta（模板元数据）**  
   - 描述某个模式在当前工程栈里的实现方式：  
     - 实现了哪些 roles；  
     - 需要哪些参数；  
     - 会生成/修改哪些文件。  
   - LLM 不直接写源码，而是选模板 + 填参数。

4. **Plan + Execution Log（出码计划与执行日志）**  
   - Plan：列出即将创建/修改/删除的文件及其来源（patternId/templateId/params 等）。  
   - Log：记录真实执行的动作与 diff，方便回溯与增量重构。  
   - v3 中这部分更多迁移到统一的“Flow/Effect 运行时 + 出码引擎”视角，但“Plan 作为中间层”的思想依然有参考价值。

## 3. v1 定义的四阶段流水线（精简版）

v1 把 LLM 协同的整个过程拆成四个阶段，这在 v3 中仍有参考意义，只是具体承载物不同：

1. **阶段一：自然语言 → Intent 草稿**  
   - 输入：开发者用自然语言描述业务场景（例如订单 CRUD）。  
   - LLM 角色：Intent Builder——根据约定的 Intent Schema 补齐结构化 YAML/JSON（goals/scene/domain/patterns 草稿）。  
   - v3 对应：Intent 编辑视图 + 与 Flow/Schema 的双向同步。

2. **阶段二：Intent → Pattern 组合**  
   - 输入：已成型的 Intent（尤其是 scene + domain 部分）。  
   - LLM 角色：Pattern Advisor——在既有模式库中匹配合适的模式组合，并给出配置初稿。  
   - v3 对应：更多折叠进 Flow/Logix 的“典型场景 DSL”与模板选型逻辑中。

3. **阶段三：Pattern → Plan 草稿**  
   - 输入：Intent + 已选 Pattern。  
   - LLM 角色：Plan Drafter——根据 Pattern.roles 与模板元数据，生成一份“将要改动哪些文件”的 Plan。  
   - 价值：结构化地表达“出码打算做什么”，方便人类审阅和工具校验。

4. **阶段四：执行 Plan + 增量重构**  
   - 执行时，模板决定文件结构，LLM 只在标记为 slot 的局部位置生成代码；  
   - 需求变更时，通过 Intent diff → Plan diff → 局部代码 diff 的链路，驱动增量修改，而不是重写整个特性。

v3 在实现上更偏向以 Logix Engine / Flow DSL 为统一运行时，但这条“Intent → Pattern → Plan → Code/Flow”的分阶段思路，仍可以作为设计和评估新方案时的参考视角。

