---
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: draft
version: 11 (Effect-Native)
---

> 本文档描述 Logic Intent (Behavior) 的运行时实现。实现层以 **Store / Logic / Flow** 三大运行时原语为基础，结合 `Control`、`Effect.Service`、`Config` 等能力构成统一的 Logic Runtime。具体类型以 `@logix/core`（`packages/logix-core/src`）为准，PoC 以 `examples/logix` 为准。

## 1. 核心理念：One Logic, Any Runtime

Logic Intent 的 Impl 层是基于 Effect 的 **Bound API (`$`) 与 `Flow` API** 风格的代码：

- Store：通过 Schema 定义 State/Action 形状，并由领域模块的运行时容器提供 `getState / actions / changes$ / ref` 等能力。
  - **Smart Dispatchers**：直接通过 `actions.updateUser(payload)` 调用，替代旧的 `dispatch({ _tag, ... })`。
- Logic：通过 Bound API（`$`）获取上下文。
  - **Unified Trigger**：统一使用 `$.onState(selector)` / `$.onAction(predicate)` / `$.on(stream)` 替代分散的 `whenState/whenAction`。
- Flow：围绕 `actions$ / changes$` 提供有限的时序与并发算子（如 `debounce / throttle / run*`）。
- Control：提供结构化的控制流算子（如 `match / try / all`）。

长逻辑本身以 pattern-style 的 `(input) => Effect` 函数存在，可以直接被 Logic 调用，也可以在平台层被资产化。

### 1.1 Flow 术语消歧 (Terminology)

在不同文档中，`Flow` 一词曾被用来指代不同层级的概念，这里统一约定：

- `Logix Flow`：特指前端 Logix Engine 内部的时间轴 / 并发原语集合，即 `runtime-logix/core/03-logic-and-flow.md` 中的 `Flow.Api`（`fromAction / fromState / debounce / run*` 等）。代码层面通过 `flow.*` 命名空间访问。
- `Effect Flow Runtime`：特指运行在 BFF / Server 侧的 Effect 驱动业务流程运行时（例如 `.flow.ts` 中编排的跨系统长流程）。为了避免歧义，后续文档中更倾向使用 **Flow Runtime** 或 **ServerFlow Runtime** 来称呼它，而不直接写 `Flow`。
- `Flow DSL`：指 YAML/JSON 级别的编排描述（历史概念），用于 Flow 结构的抽象表达，便于 Intent 与工具链进行结构化对齐。

后续涉及“Flow”的文档应显式使用上述术语之一，并在首次出现时指明是 `Logix Flow` 还是 `Flow Runtime`，避免再出现混用。

## 2. 动态性与热更新 (Dynamism & HMR)

为了支持“全双工编排”和极致的开发体验 (DX)，Logix Runtime 必须具备动态加载与热替换能力。

### 2.1 Direct Execution (开发态)

在开发环境中，Logix 直接运行 TypeScript 编译后的 JS 代码。**不再有中间层的 JSON 解释器**。这实现了 **Native Performance**。

### 2.2 HMR 策略：安全重启与状态协调

Logix 的 HMR 建立在 Effect 强大的 **Scope (资源作用域)** 机制之上，采用“基线兜底 + 渐进增强”的策略。

### 6.3 心智模型：Session 即事务 (Mental Model: Session as Transaction)

从计算机科学角度看，Session 本质上是一个 **长活的交互式事务 (Long-Lived Interactive Transaction)**，它在 UI 层实现了类似数据库 ACID 的特性：

-   **Isolation (隔离性)**：Session 内的 Draft State 对外部 Module 不可见，避免了“脏读” (Dirty Read)。
-   **Atomicity (原子性)**：Session 只有“提交 (Result Action)”和“销毁 (Rollback)”两种终态。中间步骤的取消会自动清理所有临时状态，无需手动 GC。

> **Future Roadmap (v4)**: 在未来版本中，我们计划利用 Effect-TS 的 **STM (Software Transactional Memory)** 模块来物理实现这一抽象，提供更强的原子性保证。但在 v3 阶段，`Scope` + `Ref` 是性价比最高的工程实现。

#### 2.2.1 基线策略：安全重启 (Baseline: Safe Restart)

这是 Logix HMR 的默认行为，确保了**绝对的安全性**（无内存泄漏、无僵尸逻辑）。

*   **机制**:
    1.  **Teardown**: 当 Logic 变更时，Runtime 调用旧 Fiber 的 `Scope.close()`。Effect 运行时保证所有挂起的资源（Timer, Socket, File Handle）被强制且优雅地关闭。
    2.  **Reboot**: 使用新定义启动新 Fiber。
    3.  **Data Retention**: **Store 中的数据状态 (Data State) 100% 保留**。用户填写的表单、加载的数据不会丢失。
*   **体验**: 逻辑流程会重置（例如倒计时重新开始），但业务数据不丢。这对于绝大多数调试场景已足够完美。

#### 2.2.2 高级策略：三级状态协调 (Advanced: Tri-Level Reconciliation)

在基线策略之上，针对追求极致体验的场景，Runtime 尝试进行更细粒度的状态保留（Optional）：

1.  **Level 1: 参数级热更 (Hot Parameter Swap)**
    *   当仅修改节点的**配置参数**（如 `debounce` 时间）时，不重启 Fiber，仅更新 `FiberRef`。正在运行的逻辑（如倒计时）无缝切换参数。

2.  **Level 2: 结构兼容性重构 (Structural Reconciliation)**
    *   当节点结构微调时，重启 Fiber，但尝试将旧的**执行状态** (Execution State) 映射给新 Fiber。

3.  **Level 3: 显式迁移 (Explicit Migration)**
    *   当逻辑质变时，允许开发者提供 `migrate(oldState)` 函数进行手动迁移。

### 2.3 Vite HMR 集成

平台提供 Vite 插件，监听 `.logic.ts` 的变更，自动触发上述协调流程。

## 3. 图码同步原理 (Code <-> Graph)

平台利用 **Static Analysis (静态分析)** 实现代码与画布的无损同步。

*   **Code -> Graph**: Parser 提取 `Flow` 调用链，构建内存图结构。
*   **Graph -> Code**: 修改图结构后，利用 `ts-morph` 精准修改对应的 AST 节点。

### 3.1 混合可视化 (Hybrid Visualization)

运行时支持三种级别的可视化呈现：

1.  **White Box (Managed)**: 标准 DSL 节点。完全可视化，支持拖拽、参数配置。
2.  **Gray Box (Ejected)**: 结构已知但参数被人工修改的节点。显示为“已修改”，仅允许查看代码或重置。
3.  **Black Box (Raw)**: 纯手写的 Effect 代码块。在图中显示为代码编辑器组件，支持直接编写 TS 代码。

## 4. 运行时分发 (Runtime Dispatch)

编译器分析 Logic 中的节点类型，自动决定代码生成的目标环境：

*   **Logix Engine (前端)**：纯 UI 逻辑。
*   **Effect Flow Runtime**：纯后端逻辑。
*   **Hybrid**：混合逻辑（Logix 负责 UI + Remote Call）。

## 5. Effect-TS 的角色

无论是在前端 Logix 还是后端 Runtime，我们都推荐使用 **Effect-TS** 作为底层的执行引擎。

## 6. 高级模式：瞬时交互 (Advanced Pattern: Ephemeral Interaction)

> **解决痛点**：防止交互过程中的临时状态（如拖拽坐标、向导步骤）污染持久化的 Module State。

我们引入 **Draft (草稿)** 原语来标准化这一模式。Draft 本质上是一个 **拥有独立生命周期 (Scope) 和私有状态 (Ref) 的微型 Module**。

### 6.1 核心特征

1.  **Micro Store**：拥有自己的 `state` 和 `actions`，但仅在 Draft 期间存在。
2.  **Scoped Lifecycle**：
    - **Start**：由主 Module 触发（`$.draft.start`）。
    - **Interaction**：接管部分或全部 UI 交互权。
    - **Commit/Rollback**：最终产出 Result Action 或销毁，状态自动清理。
3.  **Transaction Semantics**：提供类似事务的隔离性 (Isolation) 和原子性 (Atomicity)。

### 6.2 API 设计 (Draft API)

Draft 的定义方式与 Module 几乎一致，但更加轻量：

```typescript
// 1. 定义 Draft (Schema-First)
const WizardDraft = Logix.Module.make('WizardDraft', {
  // Draft 内部的临时状态
  state: Schema.Struct({ step: Schema.Number, draftData: DataSchema }),
  // Draft 启动时需要的上下文（只读，作为初始状态的一部分或 Context）
  actions: Schema.Union(
      Schema.Struct({ _tag: Schema.Literal('next') }),
      Schema.Struct({ _tag: Schema.Literal('cancel') }),
  )
});

// 2. 在主 Module 中使用
Module.logic(($) => Effect.gen(function* () {
  // 启动 Draft
  yield* $.onAction('startWizard').run((orderId) =>
    $.draft.start(WizardDraft, { orderId })
  );

  // 提交 Draft (Transactional Commit)
  yield* $.onAction('submitWizard').run(() =>
    $.draft.commit(WizardDraft).pipe(
      // 提交成功后，将结果回写到主 Module
      Effect.andThen((result) => $.actions.updateOrder(result))
    )
  );
}));
```

### 6.3 心智模型：Draft 即事务 (Mental Model: Draft as Transaction)

从计算机科学角度看，Draft 本质上是一个 **长活的交互式事务 (Long-Lived Interactive Transaction)**：

-   **Isolation (隔离性)**：Draft State 对外部 Module 不可见，避免了“脏读”。
-   **Atomicity (原子性)**：Draft 只有“提交”和“销毁”两种终态。即使在第 9 步取消，所有临时状态也会自动回滚（内存释放）。

> **Future Roadmap**: 未来将结合 Effect STM 提供物理级别的事务支持。
