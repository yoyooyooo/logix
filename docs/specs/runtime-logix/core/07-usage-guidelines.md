# 使用指南与最佳实践 (Usage Guidelines & Best Practices)

> **Status**: Draft (v2.3 Unified Action)
> **Date**: 2025-11-23
> **Layer**: Application Layer

本文档旨在指导开发者如何正确、优雅地使用 Logix 构建应用。核心在于明确 **State (数据)** 与 **Action (意图)** 的边界，以及如何利用 **Rule DSL** 编写逻辑。

## 1. 核心原则 (Core Principles)

### 1.1 Action for Intent (意图即动作)
*   **原则**: 凡是代表“发生了什么”或“用户想做什么”的，必须定义为 Action。
*   **场景**: 点击按钮、提交表单、刷新列表、通知消息、打开弹窗。
*   **反例**: 不要设置一个 `isSubmitting` 状态来触发提交逻辑。应该派发 `SUBMIT` Action。

### 1.2 State for Data (数据即状态)
*   **原则**: 凡是代表“当前是什么样子”的，必须定义为 State。
*   **场景**: 表单的值、加载中状态 (`isLoading`)、错误信息、列表数据。
*   **反例**: 不要用 Action 来传递表单输入的每一个字符（除非是实时搜索），直接更新 State。

### 1.3 UI is Dumb (UI 是哑的)
*   **原则**: UI 组件只负责渲染 State 和派发 Action。严禁在组件中编写业务逻辑（如 API 调用、跳转判断）。
*   **模式**: `onClick={() => dispatch({ type: 'refresh' })}`。

## 2. 最佳实践模式 (Patterns)

### 2.1 数据加载 (Data Fetching)

**推荐模式**: Action 驱动加载，State 承载结果。

```typescript
// 1. 定义 Action
type Actions = { type: 'refresh' } | { type: 'loadMore' };

// 2. 逻辑响应
api.rule({
  trigger: api.on.action('refresh'),
  do: api.pipe(
    api.ops.set(s => s.isLoading, true),
    api.ops.fetch(ctx => api.services.api.fetchList()),
    api.ops.branch({
      success: api.ops.batch(
        api.ops.set(s => s.items, ctx => ctx.result),
        api.ops.set(s => s.isLoading, false)
      ),
      failure: api.ops.set(s => s.isLoading, false)
    })
  )
});
```

### 2.2 表单提交 (Form Submission)

**推荐模式**: Action 触发流程，State 记录过程状态。

```typescript
api.rule({
  trigger: api.on.action('submit'),
  do: api.pipe(
    // 1. 标记状态
    api.ops.set(s => s.meta.isSubmitting, true),
    
    // 2. 执行校验
    api.ops.fetch(validateForm),
    api.ops.filter(ctx => ctx.isValid),

    // 3. 提交
    api.ops.fetch(ctx => api.services.api.submit(ctx.values)),
    
    // 4. 成功反馈
    api.ops.actions.submitSuccess()
  )
});
```

### 2.3 字段联动 (Field Linkage)

**推荐模式**: 使用 `change` 触发器监听 State 变化。

```typescript
// 当国家变化时，重置省份
// 这里不需要 Action，因为这是数据之间的内在约束
api.rule({
  trigger: api.on.change(s => s.country),
  do: api.ops.set(s => s.province, null)
});
```

## 3. 跨 Rule 共享状态 (Sharing State Between Rules)

在 `rules` 数组配置模式下，每个 Rule 都是独立的配置对象，无法通过闭包变量隐式共享状态。这是 Logix 有意为之的设计，旨在确保逻辑的**可观测性**和**可调试性**。

当需要在不同 Rule 之间传递信息时，请遵循以下范式：

### 3.1 持久化状态共享 (Persistent State)

如果共享的数据是业务状态的一部分（如“当前是否正在输入”、“上次滚动位置”），应将其提升到 Store 的 `State` 中。

**推荐做法**:
1.  在 `stateSchema` 中定义字段（如 `ui.isTyping`）。
2.  Rule A 使用 `api.ops.set` 更新该字段。
3.  Rule B 使用 `api.on.change` 监听该字段。

### 3.2 瞬态意图通知 (Transient Actions)

如果共享的只是一个瞬间的通知（如“校验完成”、“请求失败”），不需要持久化，应使用 `Action`。

**推荐做法**:
1.  在 `actionSchema` 中定义内部 Action（如 `INTERNAL_VALIDATED`）。
2.  Rule A 使用 `api.ops.actions.internalValidated()` 派发。
3.  Rule B 使用 `api.on.action('INTERNAL_VALIDATED')` 监听。

### 3.3 复杂算法中间态 (Algorithmic State)

如果需要共享的是某个复杂算法的中间变量（如防抖定时器、滑动窗口累加器），且完全与 UI 无关。

**推荐做法**:
不要拆分成多个 Rule。应该封装一个自定义 **Operator**，在 Operator 内部闭包中维护状态。

```typescript
// ✅ 正确做法：封装 Operator
const myThrottle = (ms) => {
  let lastTime = 0; // 状态封装在 Operator 内部
  return (ctx) => Effect.gen(function*() {
    // ...
  })
}
```

## 4. 多 Store 协作 (Multi-Store Collaboration)

Logix 鼓励 **Micro-Stores (微状态)** 架构，即每个业务领域（User, Form, List）拥有独立的 Store，而不是像 Redux/Zustand 那样构建一个巨大的单体 Store。

### 4.1 为什么不推荐 Slice 模式？
*   **类型复杂**: 单体 Store 需要维护巨大的泛型定义。
*   **性能瓶颈**: 任何局部更新都会触发全局通知。
*   **逻辑耦合**: Slice 之间容易出现隐式依赖。

### 4.2 推荐模式: Reactive Glue (响应式胶水)

利用 Effect-TS 的 Stream 能力，通过 `api.on.input` 将不同 Store 连接起来。

```typescript
// Store A: 用户信息
const userStore = makeStore({ ... });

// Store B: 订单列表
const orderStore = makeStore({
  // 将 Store A 的 State Stream 作为 Input 注入
  inputs: {
    user$: userStore.state$
  },
  rules: (api) => [
    api.rule({
      // 监听注入的 Input Stream
      trigger: api.on.input('user$'),
      do: api.pipe(
        // 当用户 ID 变化时，自动刷新订单
        api.ops.filter(user => !!user.id),
        api.ops.fetch(ctx => api.services.orders.fetch(ctx.user.id))
      )
    })
  ]
});
```

### 4.3 推荐模式: Context Composition

使用 React Context 将多个独立的 Store 组合在一起注入给组件树。

```typescript
const PageContext = createContext({
  user: userStore,
  form: formStore
});
```

## 5. 逻辑拆分原则 (Logic Splitting)

*   **按功能聚合**: 一个 Rule 应该完整描述一个业务功能（如“自动保存”）。不要把一个功能的逻辑拆散到多个 Rule 里，除非它们之间有明确的异步依赖。
*   **保持扁平**: 尽量避免 Rule 之间的深度依赖链（A 触发 B，B 触发 C，C 触发 D）。这会让调试变得极其困难。尽量使用 State 作为中心黑板，各 Rule 独立响应 State 变化。

## 6. 命名规范 (Naming Conventions)

### 6.1 Action Naming
使用 **动词+名词** 的形式，推荐使用 `domain/action` 的命名空间格式，或简单的驼峰命名。
*   `auth/login`
*   `form/submit`
*   `list/refresh`

### 6.2 State Accessors
使用强类型的 Accessor 函数，避免字符串路径。
*   `s => s.user.profile.name`
*   `s => s.ui.isLoading`

## 7. 调试指南

1.  **追踪 Action**: 在 DevTools 中查看 Action 序列，这是业务发生的“剧本”。
2.  **检查 State**: 查看 Action 触发后的 State Diff，确认结果是否符合预期。
3.  **死循环排查**: 如果控制台报错 `LoopDetected`，检查是否在 `watch` 回调中派发了导致该字段再次变化的 Action。
