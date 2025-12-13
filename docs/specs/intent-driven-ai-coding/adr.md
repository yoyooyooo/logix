---
title: 架构演进与决策记录 (Architecture Decision Records)
status: living
---

> 本文档记录了 Intent-Driven AI Coding 平台架构演进过程中的关键决策。详细设计与历史背景请参考各版本的具体文档。

## ADR-003: 收敛为“三位一体”模型 (v3)

*   **日期**: 2025-11-23
*   **状态**: **Accepted (Active)**
*   **决策**: 
	    基于奥卡姆剃刀原则，将意图收敛为 **UI / Logic / Module** 三大维度（早期文档中曾用 “Domain”，现统一为 “Module”），引入 **Spec/Impl 双模态**，并确立平台为前端开发者的“意图显影引擎”。
*   **理由**: 
    v2 的六层模型过度工程化，概念碎片化严重。新模型更符合“意图驱动”本质，且支持从单人到团队的渐进式协作。
*   **参考**: [v3 规范总览](./v3/01-overview.md)

## ADR-002: 确立“六层意图”模型 (v2)

*   **日期**: 2025-11-20
*   **状态**: **Superseded by ADR-003**
*   **决策**: 
    将前端意图拆解为 Layout, View, Interaction, Behavior, Data, Code Structure 六个独立层级。
*   **理由**: 
    试图通过全切面解构来控制 LLM 生成代码的复杂度。虽然废弃，但其对“关注点分离”的探索具有历史参考价值。
*   **参考**: [v2 详细设计与背景](./v2/00-architecture-decision-records.md)

## ADR-001: 意图驱动开发 (v1)

*   **日期**: 2025-10-01
*   **状态**: **Superseded by ADR-002**
*   **决策**: 
    提出 "Intent" 概念作为自然语言与代码的中间层，引入 Pattern 和 Plan，尝试用「意图 → 模式 → 模板 → 代码」串起 AI 协同出码流水线。
*   **原始意图（v1 视角）**: 
    - **LLM 优先**：假设没有今天的 LLM，这套 Intent/Pattern/Template 体系只是额外负担；真正目标是给 LLM 一套稳定“跑道”，让它在结构化约束内补全设计与代码，而不是自由发挥。  
    - **意图先于实现**：希望开发者只需讲清业务目标和场景结构（自然语言 + Intent），平台和 LLM 负责把它映射为 Pattern 组合、生成计划和代码骨架。  
    - **行为层单独建模**：区分“状态/缓存”和“行为编排”，尝试用 Flow DSL + AST + Effect 程序构建一个独立的行为事实源 (SSoT)，避免业务逻辑散落在各处 useEffect/事件处理器中。  
    - **IMD / best-practice 作为“供体”**：把现有组件库和实践仓库视为模式/模板的知识库，而不是不可改动的规范；Intent/Pattern/Flow 是一等公民，IMD/best-practice 为它们服务。
*   **与后续版本的关系**: 
    - v2 在此基础上把 Intent 进一步拆成六层，强调“全切面解构”；  
    - v3 则回到“意图聚合”的方向，用 UI / Logic / Module 三维 + Logix Runtime 承载 v1 的大部分原始诉求，同时弱化大块 YAML/多层 Intent 的复杂度。
