---
title: 意图驱动的声明式 AI 编码体系 · 总览（v1 快照）
status: archived
version: v1
supersededBy: ../v3
---

> 本文是 intent-driven-ai-coding v1 的精简快照，仅用于对照理解早期思路与 v3 的差异。  
> 当前一切规范与实现以 `v3` 为准，这里描述的概念如果与 v3 冲突，一律以 v3 为准。

## 1. v1 当时的前提假设

- **LLM 优先**：认为没有 LLM，这套 Intent/Pattern/Template 体系只是增加负担；真正目标是给 LLM 一条稳定“跑道”。  
- **意图先于代码**：希望开发者只需把业务讲清楚，平台+LLM 将其转成结构化 Intent，然后再自动衔接模式与代码骨架。  
- **行为层单独建模**：区分“状态/缓存”与“行为编排”，尝试用 Flow DSL + Effect 程序为复杂行为建立独立事实源。

这些假设在 v3 中大多被保留，只是承载方式从「一堆 YAML + 文档」变成了「Intent/Flow DSL + Logix Engine」的统一运行时视角。

## 2. v1 的核心主张（对比 v3）

- **三元分层：Intent / Pattern / Template**  
  - Intent：表达业务目标与场景结构；  
  - Pattern：表达“这类场景通常怎么解”；  
  - Template：表达在具体技术栈下的落地形式。  
  - v3 中，这三者更多被折叠进「Intent + Flow DSL + 代码/文件结构约定」中，不再单独维护大量 YAML。

- **行为层 SSoT 放在 Effect 程序上**  
  - v1 很强调“Flow AST → Effect 程序是行为真身”，代码骨架只是投影；  
  - v3 里这一点由 Logix/Effect 运行时正式承接，不再停留在“规划层”。

## 3. 需要从 v1 记住的东西

- Intent 不只是“配置”，而是 LLM 和人类共同维护的**结构化需求载体**；  
- Pattern 不只是示例代码，而是“可被选择与比较的策略集合”；  
- Flow/Effect 程序是行为的最终事实源，平台/LLM 应围绕它做约束与可视化，而不是围绕散落的 Hook 与 useEffect。

其余细节（具体字段、YAML 结构等）都应以 v3 中的最新设计为准。

