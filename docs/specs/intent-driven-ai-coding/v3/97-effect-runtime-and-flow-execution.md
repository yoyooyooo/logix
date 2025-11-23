---
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: draft
version: 2 (Refined)
---

> 本文档描述了 Logic Intent (Behavior) 的运行时实现。在 v3 模型下，我们不再显式区分前端/后端运行时目标，而是采用统一的 **Flow DSL** 作为逻辑真理，由编译器根据上下文自动分发。

## 1. 核心理念：One Flow, Any Runtime

Logic Intent 的 Impl 层是 **Flow DSL**。它是一种声明式的、图状的业务逻辑描述。

*   **统一表达**：无论是“前端表单校验”还是“后端订单创建”，都使用同一套 DSL 描述（Trigger -> Steps -> Effects）。
*   **环境无关**：Flow DSL 只描述“做什么 (What)”，不描述“在哪里做 (Where)”。

## 2. Flow DSL v3 结构

```typescript
interface FlowDSL {
  id: string;
  // 触发源：监听信号
  trigger: {
    signalId: string; // e.g. 'submitOrder'
  };
  
  // 逻辑编排 (DAG)
  nodes: Record<string, FlowNode>;
  edges: FlowEdge[];
}

type FlowNode = 
  | ServiceCallNode   // 调用领域服务 (Inventory.check)
  | StateUpdateNode   // 更新状态 (UIState.isSubmitting)
  | BranchNode        // 逻辑分支
  | EmitSignalNode    // 发射新信号
```

## 3. 运行时分发 (Runtime Dispatch)

虽然 DSL 是统一的，但代码执行环境是物理分离的（浏览器 vs 服务器）。平台编译器负责这种映射。

### 3.1 自动分发策略

编译器分析 Flow 中的节点类型：

*   **纯前端逻辑**：如果 Flow 只包含 `StateUpdateNode` (UI 状态) 和简单的 `BranchNode`。
    *   -> **编译目标**：Frontend Kernel Logic (运行在浏览器主线程)。
*   **纯后端逻辑**：如果 Flow 包含敏感的 `ServiceCallNode` (如支付、数据库写)。
    *   -> **编译目标**：Effect Flow Runtime (运行在 Server/BFF)。
*   **混合逻辑**：如果 Flow 既更新 UI 又调后端。
    *   -> **编译目标**：Frontend Kernel (负责 UI 更新) + Remote Call (调用后端 Flow)。

### 3.2 Effect-TS 的角色

无论是在前端 Kernel 还是后端 Runtime，我们都推荐使用 **Effect-TS** 作为底层的执行引擎。

*   **统一原语**：使用 `Effect` 处理异步、错误、重试和资源管理。
*   **统一 Layer**：通过依赖注入 (Layer) 屏蔽环境差异。例如 `LogService` 在前端调用 `console.log`，在后端调用 `Winston`。

## 4. 示例：混合 Flow 的编译

**Flow DSL**:
```yaml
Trigger: onSignal('submit')
Step 1: Update UI (loading = true)
Step 2: Call Service (Order.create)
Step 3: Update UI (loading = false)
Step 4: Emit Signal (navigate: success-page)
```

**编译产物 (Frontend Kernel)**:
```typescript
// 自动生成的 Kernel Logic
rule({
  trigger: onSignal('submit'),
  do: Effect.gen(function* () {
    yield* set('loading', true);
    try {
      // 远程调用后端 Flow
      yield* callRemote('Order.create', ...);
      yield* emit('navigate', 'success-page');
    } finally {
      yield* set('loading', false);
    }
  })
})
```

## 5. 总结

用户无需关心 `runtimeTarget`。他们只需编排逻辑。平台负责将这段逻辑“显影”到正确的物理环境中执行。
