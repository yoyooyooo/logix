---
title: 前端意图六层模型 (The Six Layers Model)
status: archived
version: 2
---

> **注意**：本文档描述的是 v2 版本的架构设计，已被 v3 的“三位一体”模型取代。保留此文档仅供历史参考。

## 1. 模型总览

在 v2 版本中，我们将前端意图拆解为六个独立的层级，试图穷尽所有开发细节：

1.  **Layout Intent (布局)**：页面的分区结构。
2.  **View & Component Intent (视图)**：区域内的具体组件模式。
3.  **Interaction Intent (交互)**：用户操作与 UI 反馈或信号触发的绑定。
4.  **Behavior & Flow Intent (行为)**：业务信号的处理流程。
5.  **Data & State Intent (数据)**：实体定义与状态存储。
6.  **Code Structure Intent (工程结构)**：模块拆分与文件路径。

## 2. 详细定义

### 2.1 Layout Intent
*   **关注点**：页面骨架。
*   **Schema**：`regions`, `layoutType`。
*   **问题**：与 View 层割裂，导致需要通过 ID 互相引用。

### 2.2 View & Component Intent
*   **关注点**：组件填充。
*   **Schema**：`slot`, `patternId`, `props`。

### 2.3 Interaction Intent
*   **关注点**：事件绑定。
*   **Schema**：`source`, `event`, `triggerSignal`。
*   **问题**：将“点击”与“触发”强行剥离，导致逻辑碎片化。

### 2.4 Behavior & Flow Intent
*   **关注点**：业务逻辑。
*   **Schema**：`signals`, `flows`。
*   **设计**：区分了 `frontend-kernel` 和 `effect-flow-runtime` 两个目标。

### 2.5 Data & State Intent
*   **关注点**：数据模型。
*   **Schema**：`entities`, `apis`, `stateSources`。

### 2.6 Code Structure Intent
*   **关注点**：文件组织。
*   **Schema**：`files`, `modules`。
*   **问题**：这是实现细节，不应作为意图暴露给用户。
