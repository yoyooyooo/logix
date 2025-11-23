# Logic Rule DSL 设计 (Logic Rule DSL Specification)

> **Status**: Definitive (v2.4 Hybrid Mode)
> **Date**: 2025-11-23
> **Scope**: Kernel Core Logic Primitives

## 1. 愿景 (Vision)

Logic Rule DSL 是 Kernel 的**“逻辑原语层”**。它提供了一套声明式的、可组合的算子体系，用于替代手写 `Effect.gen`。

**目标**：
1.  **AI-Ready**: 提供结构化的配置模板 (`api.rule`)，让 AI 只需“填空”即可生成健壮逻辑。
2.  **Type-Safe**: 通过 `LogicApi` 工厂方法，确保所有路径引用和 Action 派发都是类型安全的。
3.  **Introspectable**: 逻辑结构在运行时可被解析，支持生成可视化流程图和深度 Trace。

## 2. 核心 API: `api.rule`

`api.rule` 是定义业务逻辑的标准入口。它接收一个配置对象，返回一个 `LogicRule`。

### 混合模式 (Hybrid Mode)

为了平衡**可视化能力**与**开发灵活性**，`do` 属性支持两种形式：

1.  **DSL Mode (推荐)**: 使用 `api.pipe` 构建。支持可视化、序列化和 AI 生成。
2.  **Effect Mode (高级)**: 直接返回 `Effect`。适合手写复杂逻辑，但不支持可视化。

```typescript
// 模式 A: DSL (AI Friendly & Visualizable)
api.rule({
  trigger: api.on.change(s => s.query),
  do: api.pipe(
    api.ops.debounce(300),
    api.ops.fetch(...)
  )
});

// 模式 B: Native Effect (Human Friendly & Flexible)
api.rule({
  trigger: api.on.action('complex/logic'),
  do: Effect.gen(function*() {
    yield* Effect.sleep('300 millis');
    const user = yield* api.services.user.get();
    if (user.isAdmin) {
      yield* api.ops.set(s => s.adminMode, true);
    }
  })
});
```

## 3. 算子体系 (Operator Taxonomy)

### 3.1 Trigger Builders (`api.on`)

定义逻辑流的起点和初始上下文 (Context)。

*   `api.on.change(selector)`: 监听状态变化。Context = `{ value, oldValue, path }`。
*   `api.on.action(type)`: 监听动作。Context = `{ payload, meta }`。
*   `api.on.input(key)`: 监听外部流 (WebSocket, Timer)。Context = `{ event }`。
*   `api.on.combine([t1, t2])`: 组合多个触发器。Context = `{ values[] }`。

### 3.2 Operation Builders (`api.ops`)

定义核心业务逻辑。Operation 接收 Context，执行 Effect，并传递结果给下一个 Operation。

#### Data Fetching (数据获取)

*   **`api.ops.fetch(effectFn)`**
    *   **行为**: 执行一个异步 Effect（通常是 API 调用）。
    *   **Context**: 接收上游 Context，将其传递给 `effectFn`。
    *   **Output**: Effect 的成功结果。
    *   **Error**: 如果 Effect 失败，Pipeline 中断，错误被抛出到 `error$` 流。
    *   **Loading**: 自动管理 Loading 状态（如果配置了关联的 Loading Path）。
    ```typescript
    api.ops.fetch(ctx => api.services.user.get(ctx.userId))
    ```

*   **`api.ops.poll(config)`**
    *   **行为**: 启动一个轮询任务。通常用于 `on.mount` 或 `on.action` 触发。
    *   **Config**: `{ interval: number, task: Effect }`。
    *   **Output**: 每次轮询的结果流。

#### Computation (计算与转换)

*   **`api.ops.map(fn)`**
    *   **行为**: 同步转换/映射 Context 数据。
    *   **Context**: 接收上游 Context。
    *   **Output**: `fn` 的返回值。
    ```typescript
    api.ops.map(ctx => ctx.value * 2)
    ```

*   **`api.ops.filter(predicate)`**
    *   **行为**: 断言检查。
    *   **Output**: 如果 `predicate` 返回 `true`，透传 Context；否则，**静默终止**当前 Pipeline 执行。
    ```typescript
    api.ops.filter(ctx => ctx.isValid) // 不合法则停止
    ```

#### Control Flow (流程控制)

*   **`api.ops.branch({ if, then, else })`**
    *   **行为**: 条件分支。
    *   **Logic**: 执行 `if(ctx)`。为真执行 `then` Pipeline，否则执行 `else` Pipeline。
    *   **Output**: 分支执行的结果。

*   **`api.ops.pipe(...ops)`**
    *   **行为**: 串行组合。前一个 Op 的输出作为后一个 Op 的输入。

*   **`api.ops.race(...ops)`**
    *   **行为**: 并行竞态。执行多个 Op，取最先完成的那个结果。其他的会被取消。

#### State & Action (副作用)

*   **`api.ops.set(selector, value)`**
    *   **行为**: 原子写入状态。
    *   **Output**: `void` (副作用终结)。

*   **`api.ops.update(selector, updater)`**
    *   **行为**: 基于旧值的函数式更新。

*   **`api.ops.edit(recipe)`**
    *   **行为**: **草稿编辑** (基于 Mutative)。允许以 Mutable 方式修改深层状态。
    *   **场景**: 复杂的深层对象更新，如 `draft.users[0].settings.theme = 'dark'`。
    ```typescript
    api.ops.edit(draft => {
      draft.users[0].name = 'New Name'; // Immer-style
    })
    ```

*   **`api.ops.batch(ops)`**
    *   **行为**: **批处理**。将多个 State 更新合并为一次通知，避免多次渲染。
    *   **注意**: 在 `batch` 内部的 `set` 不会立即触发订阅者，直到 batch 结束。
    ```typescript
    api.ops.batch(
      api.ops.set(s => s.a, 1),
      api.ops.set(s => s.b, 2)
    )
    ```

*   **`api.ops.actions[Type](payload)`**
    *   **行为**: 派发 Action (Type-Safe)。
    *   **Output**: `void`。

#### Timing (时序控制)

*   **`api.ops.delay(ms)`**
    *   **行为**: 暂停 Pipeline 执行指定时间。

*   **`api.ops.debounce(ms)`**
    *   **行为**: 防抖。如果在 `ms` 内有新事件，取消前一次执行。
    *   **注意**: 通常放在 Pipeline 的头部。

*   **`api.ops.throttle(ms)`**
    *   **行为**: 节流。在 `ms` 内只允许一次执行。

## 4. 动态参数注入 (Dynamic Arguments)

所有 Operation 的配置参数都支持传入 **Accessor Function**，用于从 Context 中动态提取数据。

```typescript
api.ops.fetch((ctx) => 
  // 从 Context (Action Payload) 中提取 userId
  api.services.userApi.getProfile(ctx.payload.userId)
)
```

## 5. 扩展机制 (Extension)

DSL 支持通过 **Module Augmentation** 扩展自定义算子，允许领域层（如 Form）注入特定逻辑。

```typescript
// @kernel/form/dsl.ts
declare module '@kernel/core/dsl' {
  interface OperationBuilders {
    validate(schema: Schema): Operation;
  }
}

// 实现并挂载
api.ops.validate = (schema) => ...
```

## 6. 运行时实现 (Runtime Implementation)

`api.rule` 在运行时充当**编译器**的角色：

1.  **解析 Trigger**: 将 Trigger 配置转换为 Kernel 原生的 `watch` 或 `onAction` 监听器。
2.  **构建 Pipeline**: 将 `api.pipe` 定义的操作链转换为一个组合的 Effect。
3.  **执行**: 在受控的 Fiber 中执行 Pipeline。自动捕获错误。
4.  **Trace 注入**: 在整个流程中自动注入 `traceId` 和 `span`，记录逻辑执行路径。
