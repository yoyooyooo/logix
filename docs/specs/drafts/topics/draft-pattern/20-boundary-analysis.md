---
title: Draft Pattern vs Flow/Domain Boundary
status: draft
version: 1.0
---

# Draft Pattern vs Flow/Domain Boundary

> **Status**: L5 (Architecture Exploration)
> **Context**: `v3/architecture`

本草稿探讨 Draft Pattern 在 Logix 整体架构中的定位，特别是它与 Flow DSL 和 Domain Service 的边界。

## 1. The "Interaction" vs "Domain" Split

我们明确区分两种状态：

| 特性 | Interaction State (Draft) | Domain State (Store) |
| :--- | :--- | :--- |
| **生命周期** | 短活 (Ephemeral)，随交互结束而销毁 | 长活 (Long-lived)，随应用/页面存在 |
| **数据源** | 用户输入 (User Input) | 服务端数据 (Server Data) |
| **一致性** | 最终一致 (Eventually Consistent) | 强一致 (Strongly Consistent) |
| **消费者** | UI 组件 (View) | 业务逻辑 (Logic/Flow) |

**边界原则**:
*   Draft **只** 负责收集和校验用户的意图。
*   Draft **不** 直接修改 Domain Store。
*   Draft 通过 `commit()` 产出一个 **Command** (或 Action Payload)。
*   Flow/Domain 消费这个 Command，执行真正的业务逻辑（API 调用、Store 更新）。

## 2. Relationship with Flow DSL

Draft 是 Flow 的一部分，还是独立于 Flow？

### 2.1 Draft as a "Micro-Flow" Container?

Draft 内部的 Logic (`$.onState(...)` / `$.onAction(...)`) 实际上是在运行一个微型的、交互式的 Flow。
*   **相似点**: 都使用 `Effect`，都响应 Event。
*   **不同点**: Draft Logic 是 **Stateful** 的 (维护 `ref`)，而标准 Flow 通常是 **Stateless** 的 (处理 Input -> Output)。

### 2.2 Integration Pattern

建议将 Draft 视为 Flow 中的一个 **Step**。

```typescript
// Main Flow
const MainFlow = Flow.make(function* ($) {
  // Step 1: Start Interaction
  const result = yield* $.draft.run(WizardDraft);
  // run() = start() + wait for commit() + destroy()

  // Step 2: Process Result (Domain Logic)
  yield* $.domain.createProject(result);
});
```

这种模式下，Draft 封装了所有复杂的交互细节，对上层 Flow 暴露为一个简单的、返回 Result 的 Effect。

## 3. Future Exploration

*   **Unified Replay**: 如果 Draft 内部也是 Event Sourcing 的，是否可以将 Draft 的操作日志合并到主 Flow 的日志中，实现完整的“交互回放”？
*   **Server-Side Draft**: 是否存在需要服务端参与的 Draft（例如：多人协同编辑一个 Draft）？这可能需要将 Draft State 同步到 Redis。
