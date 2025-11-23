---
title: 工程结构意图 (Code Structure Intent)
status: draft
version: 3
---

> 本文定义了 v2 架构下的工程结构模型：如何将抽象的 Intent 映射为具体的物理文件，特别是双运行时架构下的产物落点。

## 1. 核心定义

Code Structure Intent 回答：**“意图最终变成了哪些文件？放在哪里？”**

它连接了 Intent 模型与物理文件系统。在 v2 架构中，由于引入了双运行时（Effect/Logix Engine），文件结构变得更加分层和模块化。

## 2. 标准目录结构 (Standard Directory Layout)

基于 `best-practice` 和 v2 架构，建议采用**领域驱动 (DDD)** 风格的分层结构，以支持企业级复杂度：

```text
src/features/order/
├── domain/                 # 领域层 (纯契约，无副作用实现)
│   ├── Order.schema.ts     # Entity Schema (Data Intent)
│   └── OrderApi.ts         # Service Interface / Tag 定义
├── infrastructure/         # 基础设施层 (副作用实现)
│   └── OrderApiLive.ts     # Service Implementation (Http/RPC Call)
├── application/            # 应用层 (流程与状态)
│   ├── flows/              # 后端 Effect 流程 (Behavior Intent)
│   │   └── submit-order.flow.ts
│   └── stores/             # 前端 Logix 状态 (Interaction Intent)
│       └── order.store.ts
├── components/             # 表现层 (View Intent)
│   ├── OrderTable.tsx
│   └── OrderForm.tsx
└── index.ts                # 模块出口 (导出 RuntimeLayer)
```

这种结构清晰地分离了**契约 (Domain)** 与 **实现 (Infrastructure)**，天然契合 Effect-ts 的 `Tag` vs `Layer` 模式。

## 3. 运行时产物落点 (Runtime Artifacts)

根据 `runtimeTarget` 的不同，Behavior & Flow Intent 会生成不同的文件：

### 3.1 Target: Effect Flow Runtime
- **落点**：`src/features/*/application/flows/*.flow.ts`
- **内容**：
  - 导出一个或多个 Effect 程序函数。
  - 引用 `domain/*` 中的 Tag 定义（Env 依赖）。
  - 纯粹的业务逻辑，无 UI 依赖。

### 3.4 Env 与 Layer 的自动化

平台在出码时会自动处理 Effect 的依赖注入：
- **Tag 定义**：在 `domain/OrderApi.ts` 中生成 `Context.Tag`。
- **Layer 实现**：在 `infrastructure/OrderApiLive.ts` 中生成 `Layer.effect`。
- **Runtime 聚合**：在 `index.ts` 中自动生成 `OrderFeatureLayer`，通过 `Layer.mergeAll` 聚合该模块所有服务的 Live 实现，供根运行时使用。

### 3.2 Target: Logix Engine
- **落点**：`src/features/*/stores/*.store.ts`
- **内容**：
  - `makeStore` 配置对象。
  - `logic` 数组中包含编译后的 `watch` / `onSignal` 规则。
  - 引用 `*.schema.ts` 中的数据定义。

### 3.3 Hybrid Flow (胶水代码)
- **落点**：通常内联在 `*.store.ts` 的 Logic 规则中，或者作为独立的 `src/features/*/glue/*.ts` 文件。
- **内容**：
  - 负责调用后端 Flow API。
  - 管理 Loading / Error 状态。
  - 处理数据格式转换。

## 4. UI 映射策略

在平台的“自由画布”视图中，Code Structure Intent 表现为**模块图 (Module Graph)**：

1.  **文件树视图**：传统的 IDE 侧边栏文件树。
2.  **架构拓扑图**：
    - 展示 Feature 模块之间的依赖关系。
    - 展示 Store、Flow、Component 之间的引用关系。
    - 用户可以拖拽文件节点来重构目录结构（Refactor）。

## 5. 自动化与 Plan

Code Structure Intent 通常不需用户手动编写，而是由 **Plan Generator** 根据其他 Intent 自动生成：

1.  用户定义了 `Order` 实体和 `submitOrder` 流程。
2.  Plan Generator 分析依赖，自动规划出 `order.schema.ts`, `order.store.ts`, `submit-order.flow.ts` 等文件路径。
3.  用户在“预览视图”中确认文件列表，点击“生成”落地到磁盘。
