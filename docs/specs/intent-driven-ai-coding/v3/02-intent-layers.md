---
title: 02 · 三位一体意图模型 (The Trinity Intent Model)
status: draft
version: 4 (Unified-API)
---

> 本文档基于“奥卡姆剃刀”原则，将原有的六层意图模型收敛为 **UI (表现)**、**Logic (逻辑)**、**Domain (领域)** 三大核心维度。每个维度都支持从 PM（模糊需求）到 Dev（精确实现）的渐进式显影。

## 1. 模型总览 (Overview)

为了消除概念冗余并对齐产品与开发视角，我们定义了三个正交的意图维度：

| 维度 | 核心职责 | 包含的原概念 | 对应资产 |
| :--- | :--- | :--- | :--- |
| **UI Intent** | **Presentation (躯壳)**<br>界面结构、组件组合与视觉交互 | Layout, View, Visual Interaction | Wireframe / Component Tree |
| **Logic Intent** | **Behavior (灵魂)**<br>业务规则、流程编排与副作用 | Interaction(Trigger), Behavior, Flow | User Story / LogicDSL |
| **Domain Intent** | **Data (记忆)**<br>业务实体、数据模型与契约 | Data, State | Concept Model / Schema |

## 2. UI Intent · 表现意图

**定义**：描述界面“长什么样”以及“如何响应视觉操作”。遵循“一切皆组件”原则。

### 2.1 双重视角

*   **PM 视角 (Low-Res)**：**线框图 (Wireframe)**
    *   关注区域划分 (Layout) 和内容占位 (Placeholder)。
    *   *例：“左边是导航栏，中间放一个订单列表。”*
*   **Dev 视角 (High-Res)**：**组件树 (Component Tree)**
    *   关注具体组件选择 (Pattern) 和属性配置 (Props)。
    *   *例：“使用 `WorkbenchLayout`，插槽 `content` 绑定 `ProTable` 组件。”*

### 2.2 视觉交互 (Visual Interaction)

*   **定义**：不涉及业务数据变更、仅改变界面状态的交互。
*   **归属**：UI Intent 内部（组件的 UI State）。
*   **示例**：展开/收起侧边栏、切换 Tab、打开 Modal、表单字段显隐联动。

### 2.3 Schema 结构示意

```typescript
interface UIIntentNode {
  id: string;
  type: string; // 组件类型或 'Placeholder'
  
  // 视觉交互与属性
  props: Record<string, any>;
  
  // 布局插槽
  slots?: Record<string, UIIntentNode[]>;
  
  // 信号发射口 (连接 Logic 的锚点)
  emits?: Record<string, string>; // e.g. { onClick: 'submitOrder' }
}
```

## 3. Logic Intent · 逻辑意图

**定义**：描述系统“如何响应信号”以及“执行什么业务流程”。遵循“信号驱动”原则。

### 3.1 双重视角

*   **PM 视角 (Low-Res)**：**用户故事 (User Story)**
    *   关注触发条件、业务规则和验收标准 (AC)。
    *   *例：“用户点击提交后，校验库存。如果库存不足，提示错误；否则创建订单。”*
*   **Dev 视角 (High-Res)**：**LogicDSL**
    *   关注信号监听、服务调用、分支判断和事务控制。
    *   *例：“`onSignal('submitOrder')` -> `dsl.call(Inventory.check)` -> `dsl.branch` ...”*

### 3.2 业务交互 (Business Interaction)

*   **定义**：涉及业务数据变更、服务调用或跨组件通信的交互。
*   **归属**：Logic Intent（作为 Trigger）。
*   **机制**：UI 组件发射信号 (Emit)，Logic 意图监听信号 (Listen)。UI 不关心信号被谁处理，实现了 UI 与逻辑的彻底解耦。

### 3.3 Schema 结构示意

```typescript
interface LogicIntentNode {
  id: string;
  
  // 触发器
  trigger: {
    type: 'onSignal' | 'onLifecycle' | 'onSchedule';
    signalId?: string;
  };
  
  // 流程编排 (Code is Truth)
  // 在 v3 中，这里不再是 JSON，而是指向源码的引用
  source: {
    file: string;
    exportName: string;
  };
  
  // 约束 (原 Constraint Intent)
  constraints?: {
    transaction: boolean;
    timeout: number;
  };
}
```

## 4. Domain Intent · 领域意图

**定义**：描述业务世界中的“概念”及其“数据结构”。遵循“通用语言 (Ubiquitous Language)”原则。

### 4.1 双重视角

*   **PM 视角 (Low-Res)**：**概念模型 (Concept Model)**
    *   关注业务名词、核心属性和业务约束。
    *   *例：“有个东西叫‘订单’，包含金额、状态。状态有待支付、已发货。”*
*   **Dev 视角 (High-Res)**：**Schema / ER**
    *   关注字段类型、数据库定义、API 契约和校验规则。
    *   *例：“`Order` 实体，`amount` 是 `Decimal(10,2)`，`status` 是枚举。”*

### 4.2 数据源 (Data Source)

*   **定义**：数据的存储与同步方式。
*   **归属**：Domain Intent 的实现细节。
*   **示例**：React Query (Server State)、Zustand (Client State)、URL Query。

### 4.3 Schema 结构示意

```typescript
interface DomainIntentNode {
  id: string;
  name: string; // 业务名词
  
  // 字段定义
  fields: Array<{
    name: string;
    type: string;
    validation?: string;
    description?: string;
  }>;
  
  // 实体关系
  relations?: Relation[];
}
```

## 5. 意图的结晶 (Crystallization)

在这个模型中，软件开发不再是“翻译”，而是“结晶”。

1.  **液态 (Liquid)**：PM 在文档或画布中输入的自然语言描述、草图。
2.  **固态 (Solid)**：Dev (或 LLM) 将其转化为精确的组件树、LogicDSL 和 Schema。

平台的核心职责是维护液态 Spec 和固态 Impl 之间的**双向映射**，确保“需求”与“代码”永远同步。
