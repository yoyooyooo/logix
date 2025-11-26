---
title: 行为/流程意图 (Behavior & Flow Intent)
status: draft
version: 3
---

> **[定位澄清]** 本文档描述的是 Logic Intent 的 **抽象模型**，主要服务于平台的可视化与代码生成。在 v3 架构中，**代码是唯一事实源 (Code is Truth)**。本文定义的图状 DSL (Nodes/Edges) 最终会编译为（或从中解析出）标准的 Effect-Native 代码，而不是在运行时被直接解释。
> 
> ---
> 
> 本文定义了 v3 架构下的核心行为模型：基于 DAG 的逻辑编排、强类型的 Signal 驱动、以及双运行时（Effect/Logix Engine）的分发机制。

## 1. 核心定义

Behavior & Flow Intent 回答：**“当业务信号发生时，系统如何响应？”**

它不仅仅是线性的步骤链，而是**剥离了技术实现细节的、可被机器执行的业务逻辑蓝图**。在平台中，它扮演着“业务剧本”与“技术实现”之间的双面胶角色。

### 1.1 关键特性

1.  **Signal 驱动 (Signal-Driven)**：Flow 不直接监听 UI 事件，而是监听业务信号（Signal）。UI 事件通过 Interaction Intent 转化为 Signal，从而实现 UI 与逻辑的彻底解耦。
2.  **图状编排 (Graph-based)**：底层采用 DAG（有向无环图）结构，支持串行、并行、竞态、分支与汇聚，足以表达企业级复杂业务。
3.  **双运行时 (Dual Runtime)**：同一份 Flow Intent 可根据 `runtimeTarget` 编译为服务端 Effect 程序或前端 Logix 规则。

## 2. 模型详解

### 2.1 Signal Intent：强类型的业务契约

Signal 是连接 Interaction（触发源）与 Flow（处理器）的标准化协议。

```typescript
interface SignalIntent {
  id: string
  name: string // e.g. "submitOrder"
  description?: string
  // 必须引用 Data Schema，保证 Payload 类型安全
  payloadSchemaId?: string // e.g. "OrderSubmissionPayload"
}
```

### 2.2 Flow Intent：基于图的逻辑编排

为了支撑复杂编排并与 React Flow 等可视化工具无缝映射，Flow DSL 采用 **Nodes + Edges + Groups** 的扁平化图结构。

```typescript
interface FlowIntent {
  id: string
  name: string
  description?: string
  
  // 触发源：监听哪个 Signal
  triggerSignalId: string
  
  // 运行时目标
  runtimeTarget: 'effect-flow-runtime' | 'logix-engine'

  // 图结构定义
  nodes: Record<string, FlowNode>
  edges: FlowEdge[]
  
  // 入口节点
  startNodeId: string
}

type FlowNode = 
  | ServiceCallNode   // 调用服务 (Effect.promise/call)
  | BranchNode        // 条件分支 (Effect.match / matchEffect)
  | WaitNode          // 等待信号/时间 (Effect.sleep/race)
  | StateMachineNode  // 嵌入复杂状态机 (XState/Workflow)
  | ReturnNode        // 结束并返回
  | ErrorHandlerNode  // 错误处理边界

interface FlowEdge {
  id: string
  source: string
  target: string
  type?: 'default' | 'true' | 'false' | 'error'
}

// 可视化分组 (对应 Effect 组合子作用域)
interface FlowGroup {
  id: string
  type: 'parallel' | 'race' | 'tryCatch'
  childrenNodeIds: string[] // 包含哪些节点
}
```

## 3. 编译逻辑：从 DAG 到 Effect

Flow DSL 的图结构与 Effect-ts 的组合子（Combinators）存在天然的同构映射关系。编译器通过拓扑排序和模式匹配，将 DAG “直译”为 Effect 代码。

| DAG 逻辑结构 | Effect 组合子 | 说明 |
| :--- | :--- | :--- |
| **串行边 (Sequence)** | `Effect.flatMap` / `yield*` | 节点 B 依赖节点 A，编译为 `taskA.pipe(flatMap(() => taskB))` |
| **并行分组 (Parallel Group)** | `Effect.all([...])` | 多个节点无依赖且被框在并行组内，编译为 `Effect.all([taskA, taskB])` |
| **竞态分组 (Race Group)** | `Effect.race(...)` | 多个节点被框在竞态组内，编译为 `Effect.race(taskA, taskB)` |
| **错误边 (Error Edge)** | `Effect.catchAll(...)` | 节点/组的 Error Handle 连出的边，编译为 `task.pipe(catchAll(err => errorHandler))` |
| **条件分支 (Branch)** | `Effect.if` / `match` | 菱形节点的 True/False 边，编译为条件逻辑 |

这种映射保证了：**只要 Flow 图是合法的，生成的 Effect 代码就是健壮的、并发安全的、资源可管理的。**

## 4. 运行时分发 (Runtime Dispatch)

Flow Intent 是逻辑蓝图，具体的执行由 `runtimeTarget` 决定：

### 4.1 Target: Effect Flow Runtime (服务端/BFF)
- **适用场景**：跨系统调用、长流程、需要强一致性/审计/重试的场景（如订单创建、支付回调）。
- **产物**：`.flow.ts` 文件。
- **实现**：完整的 Effect-ts 程序，运行在 Node.js 容器中，通过 Layer 注入基础设施。

### 4.2 Target: Logix Engine (前端)
- **适用场景**：贴近 UI 的交互逻辑、字段联动、乐观更新、本地校验（如表单级联、即时搜索）。
- **产物**：Logix Store `logic` 配置。
- **实现**：
  - 简单逻辑编译为 `Logic` 规则。
  - 复杂 DAG 逻辑编译为 Logix 内部的微型 Effect Runner 调用（Logix 集成精简版 Effect 运行时）。

### 4.3 Hybrid Flow (混合运行时)
- **概念**：一个 Flow 可能横跨前后端。例如：前端校验 -> 后端提交 -> 前端更新状态。
- **实现**：平台自动将 Flow 切分为“前端段”和“后端段”，并生成中间的胶水代码（API 调用、Loading 状态管理、错误回滚）。

#### 编译实例：从画布到代码

场景：**“点击保存按钮 -> 校验表单 -> 提交数据 -> 成功后关闭弹窗并刷新列表”**

**1. 画布意图 (Intent)**
- **UI 节点**: `SaveButton`, `EditModal`, `OrderList`
- **逻辑节点**: `SubmitFlow` (包含校验、提交 API)
- **连线**: 
  - `SaveButton` -> `SubmitFlow` (Trigger)
  - `SubmitFlow` (Success) -> `EditModal` (Close)
  - `SubmitFlow` (Success) -> `OrderList` (Refresh)

**2. 编译产物 A: 前端 Logix (`order.store.ts`)**
```typescript
// 自动生成的 Logix Logic
logic: (api) => [
  // 1. Interaction: 点击按钮 -> 触发 submit 信号
  // UI组件的onClick处理器会调用: dispatch({ _tag: 'submit' })


  // 2. Behavior: 收到 submit 信号 -> 调用后端 Flow
  flow.fromAction(a => a._tag === 'submit').pipe(
    flow.run(
    Effect.gen(function*() {
      yield* ops.set('isSubmitting', true);
      // 自动生成的胶水代码：调用后端 Effect Flow
      yield* runFlow('submitOrderFlow', { ...ops.get() });
      yield* ops.set('isSubmitting', false);
            yield* dispatch({ _tag: 'submitSuccess' });
    }).pipe(
      Effect.catchAll(err => ops.set('error', err))
    )
  ),

  // 3. UI Effect: 收到 success 信号 -> 关闭弹窗 & 刷新列表
  flow.fromAction(a => a._tag === 'submitSuccess').pipe(
    flow.run(
      // 这里的UI操作可以通过更新状态来触发，或调用一个UI服务
      state.mutate(draft => { 
        draft.showModal = false; 
        draft.needsRefresh = true; 
      })
    )
  )
]
```

**3. 编译产物 B: 后端 Effect (`submit-order.flow.ts`)**
```typescript
// 纯粹的业务逻辑，不含 UI 细节
export const submitOrderFlow = (input: OrderInput) => 
  Effect.gen(function*() {
    yield* validateOrder(input);
    const order = yield* OrderService.create(input);
    yield* NotificationService.sendCreated(order);
    return order;
  });
```

## 5. UI 映射策略

为了平衡易用性与专业性，Flow Intent 在 UI 上支持**渐进式表达**：

1.  **列表视图 (The Checklist)**：默认视图。将线性的 DAG 渲染为简单的步骤列表，隐藏复杂的分支和并行细节。适合 80% 的 CRUD 场景。
2.  **画布视图 (The Canvas)**：高级视图。完整渲染 Nodes + Edges + Groups。适合处理并行、竞态、复杂错误处理等场景。

用户可以在两种视图间无缝切换，底层数据始终保持为同一份 DAG 结构。
