---
title: 架构演进与决策记录 (Architecture Decision Records)
status: living
---

> 本文档记录了 Intent-Driven AI Coding 平台架构演进过程中的关键决策。详细设计与历史背景请参考各版本的具体文档。

## ADR-003: 收敛为“三位一体”模型 (v3)

*   **日期**: 2025-11-23
*   **状态**: **Accepted (Active)**
*   **决策**: 
    基于奥卡姆剃刀原则，将意图收敛为 **UI / Logic / Domain** 三大维度，引入 **Spec/Impl 双模态**，并确立平台为前端开发者的“意图显影引擎”。
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
    提出 "Intent" 概念作为自然语言与代码的中间层，引入 Pattern 和 Plan。
*   **理由**: 
    解决传统低代码灵活性不足与直接写代码缺乏规范的问题。
