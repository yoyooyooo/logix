---
title: 模式系统设计 (Pattern System Design)
status: draft
version: 7 (Comprehensive-Final)
---

> **核心理念**：Pattern 是**“黑盒积木 (Black-Box Block)”**，也是**“高阶 Effect 生成器”**。它是平台资产管理的最小单元。在画布上，我们只关心它的**接口 (Config)** 和 **连接 (Topology)**；在代码中，我们关心它的**类型契约**与**逻辑闭包**。

## 1. Pattern 资产定义

在 v3 架构中，Pattern 不再是静态配置，而是标准的 TypeScript 代码资产。

### 1.1 `definePattern` (The Contract)

这是将普通函数转化为平台资产的唯一入口。

```typescript
import { definePattern } from "@logix/pattern";
import { Schema } from "@effect/schema";

export const ReliableFetch = definePattern({
  // 1. 身份元数据
  id: "std/network/reliable-fetch",
  version: "1.0.0",
  icon: "cloud-sync",
  tags: ["network", "retry"],
  
  // 2. 配置契约 (决定了 Wizard 表单)
  config: Schema.Struct({
    service: Schema.String,
    method: Schema.String,
    retry: Schema.Number.pipe(Schema.default(3))
  }),
  
  // 3. 逻辑实现 (决定了运行时行为)
  // 画布默认不展开此函数，视为黑盒
  body: (config) => Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    yield* dsl.retry(
      { times: config.retry },
      dsl.call(config.service, config.method, {})
    );
  })
});
```

## 2. Pattern 的形态分类

### 2.1 原子 Pattern (Atomic Pattern)
只包含单一功能的逻辑片段，通常用于替代基础算子。
*   **示例**: `Debounce`, `Retry`, `Poll`。
*   **画布表现**: 小型的功能节点。

### 2.2 场景 Pattern (Scenario Pattern)
包含完整交互闭包的微应用。它通常会创建局部状态和信号。
*   **示例**: `ModalFormWorkflow` (包含 Open/Close 信号, Loading 状态, 表单提交逻辑)。
*   **画布表现**: 大型容器节点，暴露 Signal 端口。

## 3. 高级特性：AI Slot (智能填空槽)

为了支持“结构化框架 + 智能化填充”，Pattern 可以在内部定义 `aiSlot`，将部分逻辑的实现权交给 LLM 和用户。

### 3.1 定义 Slot (Architect View)

```typescript
export const DataProcess = definePattern({
  // ...
  body: (config) => Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    const rawData = yield* dsl.getPayload();
    
    // 定义一个 AI 填空槽
    const cleanData = yield* dsl.aiSlot({
      id: "data-cleaning",
      prompt: { 
        label: "数据清洗规则", 
        placeholder: "例如：过滤掉金额小于 0 的订单" 
      },
      context: {
        inputs: { rawData }, // 告诉 LLM 可用变量
        output: Schema.Array(OrderSchema) // 告诉 LLM 期望输出
      }
    });
    
    yield* dsl.call("Api", "save", cleanData);
  })
});
```

### 3.2 探测机制：Spy DSL (Platform View)

平台如何获取 `aiSlot` 的定义？不是通过静态分析，而是通过 **“模拟执行 (Dry Run)”**。

1.  **Inject Spy**: 平台注入一个特殊的 `SpyDSL` 实现。它不执行真实逻辑，而是“捕获”所有 `aiSlot` 调用。
2.  **Run**: 使用当前 Config 运行 Pattern 的 `body` 函数。
3.  **Capture**: `SpyDSL` 记录下所有被触发的 Slot 元数据，返回给 Wizard。

**优势**：
*   **支持动态性**: 如果 Slot 在 `if (config.enableAI)` 分支内，只有当用户开启开关时，Wizard 才会显示对应的 AI 输入框。
*   **无需复杂 Parser**: 直接利用 JS 引擎解析动态逻辑。

### 3.3 填充 Slot (User/LLM View)

1.  **交互**: 用户在 Wizard 中输入自然语言：“只保留 VIP 用户的订单”。
2.  **生成**: 平台调用 LLM，结合 `context` 和用户意图，生成代码。
3.  **结果**: 生成的代码被插入到 Pattern 实例中 (通常作为黑盒代码块)。

## 4. AI 协同工作流 (AI Collaborative Workflow)

为了解决“标准 Pattern 无法满足 10% 特殊需求”的痛点，平台提供基于 AI 的渐进式微调能力。

### 4.1 AI 辅助 Eject (AI-Assisted Eject)

当用户需要修改 Pattern 内部逻辑时，不再是简单的“炸开代码”，而是通过 AI 进行**语义化重构**。

*   **交互**: 用户点击 "Eject & Refine" -> 输入指令：“在重试请求中添加 X-Retry-Count 头”。
*   **流程**:
    1.  **Expand**: 平台在内存中展开 Pattern 代码。
    2.  **Prompt**: 将展开的代码 + 用户指令发送给 LLM。
    3.  **Refine**: LLM 返回修改后的代码。
    4.  **Replace**: 平台用新代码替换原 Pattern 节点 (降级为 Code Block)。

### 4.2 自然语言配置 (NL Configuration)

用户可以通过自然语言直接填充 Wizard 表单。

*   **交互**: 在 Wizard 底部输入：“重试 5 次，超时 10 秒”。
*   **流程**: LLM 解析意图 -> 映射到 Config Schema -> 自动填充表单项。

## 5. Pattern Playground (核心练兵场)

Playground 是架构师开发、验证 Pattern 的核心环境，也是连接“意图”与“落地”的信任构建器。

### 5.1 界面布局
*   **Editor**: 编写 `definePattern` 源码。
*   **Preview**: 实时预览生成的 Wizard 表单。
*   **Console**: 模拟运行控制台。

### 5.2 模拟运行 (Simulation Run)
利用 Effect 的 Layer 机制，Playground 内置 `MockRuntimeLayer`，支持在无后端环境下跑通逻辑。

*   **Mock Call**: 拦截 `dsl.call`，返回预设的 Mock Data。
*   **State Viz**: 实时展示 `dsl.set` 导致的状态树变化。
*   **AI Test**: 自动生成边界测试用例 (e.g. 网络连续失败 3 次)，验证 Pattern 的鲁棒性。

## 6. 画布表现 (Canvas Representation)

### 6.1 L2 编排视图 (The Orchestration View)
这是 Pattern 的主战场。

*   **形态**: 一个标准的方块节点 (Block Node)。
*   **内容**: 图标、名称、关键摘要 (e.g. "Retry: 3")。
*   **交互**: 
    *   **配置**: 点击 -> 右侧弹出 Wizard 表单 (由 Config Schema 驱动)。
    *   **连线**: 拖拽端口 -> 建立信号流。

### 6.2 L3 详情视图 (The Detail View)
当用户双击 Pattern 节点时，平台提供降级视图：

*   **默认行为**: **Code View**。直接弹出一个只读的代码编辑器，展示 `body` 函数的源码。这是最清晰的逻辑展示。
*   **可选行为**: **Graph View**。仅当 Pattern 内部逻辑非常简单且纯粹 (纯 DSL) 时，平台尝试将其渲染为子图。但这不再是强制要求。

## 7. 治理与生命周期 (Governance & Lifecycle)

Pattern 的管理分为**本地库 (Local)** 和 **公共库 (Registry)** 两层。

### 7.1 生命周期状态机

1.  **Draft (草稿)**: 开发者在本地项目中编写的 Pattern，仅本地可见。
2.  **Review (评审)**: 提交到团队仓库，等待架构师审核。
3.  **Stable (稳定)**: 审核通过，发布到 Registry，全团队可用。AI 优先推荐。
4.  **Deprecated (废弃)**: 标记为不推荐，但保留运行时支持。AI 停止推荐，Studio 提示迁移。

### 7.2 来源分层

*   **System (Built-in)**: 平台内置的基础 Pattern (e.g., CRUD, Fetch with Loading)。
*   **Team (Remote)**: 团队沉淀的业务 Pattern (e.g., 公司统一的审批流、支付组件)。
*   **Local (Project)**: 当前项目特有的复用逻辑。

## 8. 消费与组合

### 8.1 积木式编排
开发者在画布上的工作就是“搭积木”。

*   拖入 `SearchPattern`。
*   拖入 `ListPattern`。
*   连线：`Search.onSearch` -> `List.fetch`。

### 8.2 依赖注入的可视化
如果 Pattern 声明了依赖 (`yield* _(AuditTag)`)：
*   画布会在节点上显示一个 **Dependency Badge** (依赖徽章)。
*   点击徽章，高亮显示提供该依赖的 Layer 节点（如果有）。
*   这帮助架构师理解模块间的耦合关系，而无需深入代码细节。
