# Intent-Driven AI Coding v2 (Archived)

> **Status**: Archived / Superseded by v3
> **Date**: 2025-11-20 ~ 2025-11-23

## 核心理念

v2 尝试通过**“全切面解构”**来控制 LLM 生成代码的复杂度。它提出了**“六层意图模型”**，试图穷尽前端工程的所有细节。

## 废弃原因

虽然实现了极高的关注点分离，但导致了**过度工程化 (Over-engineering)**：

1.  **概念碎片化**：用户需要在 6 个概念间跳跃，认知负担过重。
2.  **实现泄漏**：`Code Structure` 等层级暴露了不必要的实现细节。
3.  **逻辑割裂**：`Interaction` 层将 UI 事件与业务逻辑强行分开，导致维护困难。

## 遗产

v2 的部分思想被 v3 继承：

*   **Intent/Pattern/Plan** 的分离思想。
*   **Flow DSL** 的雏形。
*   **Data & State** 的定义方式。

详见 `docs/specs/intent-driven-ai-coding/v3/00-architecture-decision-records.md`。
