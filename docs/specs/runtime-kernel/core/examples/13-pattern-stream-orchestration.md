# Pattern: Stream Orchestration & Flow Coordination

> **Scenario**: 协同保存 (Auto Save vs Manual Save)
> **Focus**: 流式编排、并发控制、瞬态事件源、结构化并发

## 1. The Challenge (痛点)

在 B2B 复杂表单中，我们经常面临多条逻辑流同时操作同一资源的场景。最典型的就是 **“自动保存”与“手动保存”的协同**：

1.  **Auto Save**: 监听内容变化，防抖 2秒，静默执行（不阻塞 UI，失败不弹窗）。
2.  **Manual Save**: 用户点击按钮，立即执行，显示 Loading，成功/失败都有 Toast 反馈。
3.  **Coordination (协同)**:
    *   如果 Auto Save 正在排队或执行，用户点击了 Manual Save，应该 **立即取消** Auto Save，优先执行 Manual Save。
    *   如果 Manual Save 正在执行，Auto Save 应该暂停触发。

如果使用传统的 `watch` + `if (isSaving)` 状态判断，代码会变得极其脆弱且难以维护（“面条代码”）。我们需要一种 **声明式** 的方式来编排这些流。

## 2. The Solution: Stream-First Logic

Kernel 引入了 **Stream Orchestration** 模式。不同于 `watch` 关注“状态的变化”，Stream 关注“事件的流动”。

核心概念：
*   **Inputs (瞬态输入)**: 类似于 RxJS 的 Subject，用于接收不存储在 State 中的瞬态事件（如点击、信号）。
*   **Orchestration (编排)**: 利用 `Stream.merge` 组合多个触发源，利用 `switchMap` / `exhaustMap` 管理并发。

## 3. Implementation

### 3.1 Schema & Inputs Definition

```typescript
const EditorSchema = Schema.Struct({
  content: Schema.String,
  lastSavedAt: Schema.Number,
  isSaving: Schema.Boolean
});

// 定义瞬态输入源 (不持久化到 State)
interface EditorInputs {
  saveBtnClick: void; // 纯信号
}
```

### 3.2 Store Logic

```typescript
const store = makeStore({
  schema: EditorSchema,
  initialValues: { content: '', lastSavedAt: 0, isSaving: false },
  
  // 声明 Inputs，Kernel 会自动创建对应的 Subject/Stream
  inputs: ['saveBtnClick'],

  logic: ({ state$, inputs, set, services }) => [
    
    // Stream Orchestration Pipeline
    // 将 "自动流" 和 "手动流" 汇聚成一条 "保存流"
    Stream.merge(
      
      // Stream 1: Auto Save Trigger
      // 来源：状态变化
      state$.pipe(
        Stream.map(s => s.content),
        Stream.changes, // distinctUntilChanged
        Stream.debounce("2 seconds"), // 防抖
        Stream.map(content => ({ type: 'auto' as const, content }))
      ),

      // Stream 2: Manual Save Trigger
      // 来源：外部点击
      inputs.saveBtnClick.pipe(
        // 手动保存时，需要获取当前最新的 content
        Stream.mapEffect(() => 
          Effect.map(state$.get, s => ({ type: 'manual' as const, content: s.content }))
        )
      )
    ).pipe(
      // Core Orchestration: SwitchMap
      // 关键：当新事件到来时，switchMap 会自动向旧的 Effect 发送中断信号 (Interrupt)
      // 这意味着：
      // 1. 如果 Auto Save 正在防抖，会被取消。
      // 2. 如果 Auto Save 正在发请求，请求会被 Abort。
      // 3. Manual Save 总是能立即插队执行。
      Stream.switchMap(({ type, content }) => 
        Effect.gen(function*() {
          // 1. UI 反馈 (仅 Manual)
          if (type === 'manual') yield* set('isSaving', true);

          // 2. 执行保存 (统一逻辑)
          const api = yield* services.EditorApi;
          yield* api.save(content).pipe(
            // 错误处理分流
            Effect.catchAll(err => 
              type === 'manual' 
                ? services.Toast.error(err.message) 
                : Effect.logError('Auto save failed', err)
            )
          );

          // 3. 成功反馈
          yield* set('lastSavedAt', Date.now());
          if (type === 'manual') {
            yield* set('isSaving', false);
            yield* services.Toast.success('Saved successfully');
          }
        })
      ),

      // 必须调用 run 才能让流跑起来
      // runDrain 返回一个 Effect，Kernel 会在初始化时 fork 它
      Stream.runDrain
    )
  ]
});
```

## 4. Lifecycle & Runtime (生命周期)

这个模式之所以“完美”，是因为它与 Kernel 的生命周期深度绑定：

1.  **Start (启动)**: 当 `makeStore` 被调用时，Kernel 会创建一个独立的 `Scope`。`logic` 返回的 `Stream.runDrain` Effect 会被 `Runtime.runFork` 到这个 Scope 中。此时，定时器开始工作，监听器挂载。
2.  **Running (运行)**: 
    *   用户输入 -> `state$` 变 -> Auto Stream 计时。
    *   用户点击 -> `inputs.saveBtnClick` 发出 -> Manual Stream 触发 -> `switchMap` 取消 Auto Stream -> 执行保存。
3.  **Dispose (销毁)**: 当组件卸载调用 `store.dispose()` 时，Kernel 关闭 `Scope`。
    *   所有正在运行的 Fiber 收到中断信号。
    *   正在进行的 HTTP 请求被 Abort (如果 Client 支持)。
    *   定时器被清除。
    *   **开发者不需要手动 unsubscribe 任何东西。**

## 5. Why this is "Perfect"?

| Feature | Traditional (Watch + State) | Stream Orchestration |
| :--- | :--- | :--- |
| **Concurrency** | 手写 `if (loading) return`，难以处理取消 | `switchMap` / `exhaustMap` 一键切换策略 |
| **Cohesion** | 逻辑散落在多个 `watch` 中 | 触发源与执行逻辑在一条管道中清晰可见 |
| **Resource** | 容易忘记清理定时器 | Scope 自动管理，零内存泄漏 |
| **AI Friendly** | AI 需生成复杂的命令式逻辑 | AI 只需生成 "Trigger A + Trigger B -> Action" 的声明式管道 |
