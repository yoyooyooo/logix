---
title: Next-Gen Killer APIs (Agent.gen, Durable Flow, Invariants)
status: draft
version: 2025-11-28
---

# Next-Gen Killer APIs: 延续 Bound API 的辉煌

回顾 `Bound API ($)` 的成功，其核心在于**“上下文的极致压缩”**——在一个闭包内隐式获得了 Store、Env 和 Effect 的所有能力。

基于 Logix v3 的演进愿景（AI Native, Organic System），我们提出三个具备同等潜力的 "Killer Features"：

## 1. `Agent.gen` —— 认知流生成器 (The Cognitive Generator)

**痛点**：目前的 ReAct Loop、Tool Calling、Memory Management 需要大量样板代码，且难以阅读。

**Killer Feature**: 将 "Agent 思考过程" 降维为类似 `Effect.gen` 的同步代码体验。

```typescript
const ResearchAgent = Agent.gen(function* ($) {
  // 1. 感知：自动获取上下文 (History, Goal)
  const goal = yield* $.goal;

  // 2. 思考：显式产生 "Thought" (会被 Trace 记录，但不输出给用户)
  yield* $.think(`I need to decompose ${goal} into sub-tasks`);

  // 3. 行动：直接调用 Tool (自动处理 Schema 校验与重试)
  // 运行时会自动处理 LLM 的 "Function Call" -> "Tool Execution" -> "Submit Result" 循环
  const searchResults = yield* $.tool(GoogleSearch, { query: goal });

  // 4. 决策：基于结果进行分支
  if (searchResults.isEmpty) {
    // 5. 交互：向用户反问 (Human-in-the-loop)
    const clarification = yield* $.ask("Search failed. Can you provide more details?");
    return yield* $.retry(clarification);
  }

  // 6. 表达：生成最终回复
  return yield* $.reply(searchResults);
});
```

**价值**：开发者像写普通业务逻辑一样写 AI Agent，完全屏蔽了底层的 LLM 对话轮次和状态维护。

## 2. `$.suspend` / `$.ask` —— 持久化人机协同 (Durable Human-in-the-Loop)

**痛点**：审批流、长任务通常需要引入 Temporal 等重型工作流引擎，或者把逻辑拆碎成多个 Event Handler。

**Killer Feature**: 在 Logix Flow 中直接“暂停”程序，等待（可能是几天后的）外部输入，然后**原地恢复**。

```typescript
const ExpenseApprovalFlow = Flow.make(
  Effect.gen(function* ($) {
    const expense = yield* $.input;

    // 自动校验逻辑
    if (expense.amount > 1000) {
      // KILLER: 程序在此处“挂起”，状态被持久化到数据库
      // 直到 Manager 在 UI 上点击“批准”，程序才从下一行继续执行
      const decision = yield* $.ask(ManagerApproval, {
        context: expense,
        timeout: "3 days"
      });

      if (decision === 'reject') {
        return yield* $.fail("Expense Rejected");
      }
    }

    yield* $.service(Finance).transfer(expense.amount);
  })
);
```

**价值**：将复杂的“异步工作流”扁平化为“同步代码”。利用 Effect 的 Fiber 序列化能力（需 Runtime 支持），实现轻量级的 Durable Execution。

## 3. `Store.invariant` —— 业务物理学 (Business Physics)

**痛点**：业务规则（如“余额不能为负”）散落在各个 Action 和 Logic 中，容易被遗漏或破坏（熵增）。

**Killer Feature**: 声明式地定义“绝对真理”，任何试图违反这些规则的 State Update 都会被 Runtime 自动拦截并回滚。

```typescript
const BankModule = Logix.Module("BankAccount", {
  state: StateSchema,
  actions: ActionSchema
})
  // 定义不变量 (Invariants)
  .invariant(s => s.balance >= 0, "Insufficient funds")
  .invariant(s => s.dailyTransferTotal <= 10000, "Daily limit exceeded")
  // 定义关联约束
  .invariant(
    s => s.status === 'active' || s.balance === 0,
    "Cannot deactivate account with remaining balance"
  );

// 无论在哪个 Logic、哪个 Button 点击事件中，
// 只要导致 balance < 0，整个事务自动失败，无需手动 check。
```

**价值**：将“防御性编程”下沉到模型层。这是对抗“逻辑熵增”的最强武器——它确保了系统的核心状态永远处于合法范围内，无论外围逻辑写得多么烂。

## 总结

| Feature | 解决的问题 | 核心隐喻 |
| :--- | :--- | :--- |
| **`Agent.gen`** | AI 逻辑的复杂性 | **"Thinking as Coding"** (像写代码一样写思考) |
| **`$.ask`** | 长流程的碎片化 | **"Pause & Resume"** (时间暂停术) |
| **`Store.invariant`** | 业务逻辑的熵增 | **"Laws of Physics"** (不可违背的物理定律) |

这三个 API 分别在 **AI 编排**、**长流程** 和 **系统稳定性** 三个维度，提供了类似 `Bound API` 的极致 DX 提升。
