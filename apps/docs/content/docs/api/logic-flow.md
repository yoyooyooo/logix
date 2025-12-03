---
title: "Logic Flow API"
description: 详解 Logix 的响应式流处理 API。
---




Logic Flow 是 Logix 处理异步业务逻辑的核心机制。为了满足不同层次的需求，Logix 提供了两层 API：

1.  **Fluent Intent DSL (High-Level)**: 推荐使用的声明式 API，如 `$.onAction`, `$.onState`。它语义清晰，自动处理了流的创建和生命周期管理。
2.  **Flow API (Low-Level)**: 底层流式 API，如 `$.flow.fromState`。它暴露了原始的 `Stream` 能力，通常仅作为“逃生舱”使用。

## 1. Fluent Intent DSL (推荐)

Fluent Intent DSL 是编写业务逻辑的首选方式。

### `$.onAction`

监听 Action 派发。支持多种方式收窄 Action 类型：

```typescript
// 1. 按名称 (Action Map Key)
$.onAction("submit").run(...)

// 2. 按谓词 (Type Guard)
$.onAction((a): a is SubmitAction => a.type === 'submit').run(...)

// 3. 按 Schema
$.onAction(SubmitActionSchema).run(...)

// 4. 按 Action 构造器/常量
$.onAction(Actions.submit).run(...)
```

### `$.onState`

监听状态变化。它是 `$.flow.fromState` 的 DSL 封装，语义更直观。

```typescript
// 监听 user.id 变化
$.onState(s => s.user.id).run(...)

// 监听多个字段 (Tuple)
$.onState(s => [s.page, s.pageSize] as const).run(...)
```

### `$.on`

监听任意 `Stream` 源。

```typescript
$.on(externalStream$).run(...)
```

### `andThen`（DX 糖，可选）

在 Fluent DSL 上，你也可以使用 `andThen` 作为“智能后续操作”：

```typescript
// 根据 prev + payload 计算 next State
$.onState(s => s.count).andThen((prev, value) => ({
  ...prev,
  lastValue: value,
}))

// 只做副作用（不写 State）
$.onAction("submit").andThen(() =>
  Effect.gen(function* () {
    const api = yield* $.use(ApiService)
    yield* api.track("submit")
  }),
)
```

> 说明：`andThen` 主要用于提升手写业务/LLM 生成代码的可读性。对于需要依赖平台解析/可视化的规则，仍推荐优先使用规范的 `.update/.mutate/.run*` 形态。

## 2. Flow API (底层)

`$.flow` 命名空间下提供了更底层的流操作能力。在大多数业务场景中，你应该优先使用 Fluent Intent DSL。

### `$.flow.fromState`

等价于 `$.onState`，但返回的是原始 Stream，需要手动组合。

```typescript
const keyword$ = $.flow.fromState(s => s.keyword);
```

> `$.flow.fromState` 与 `$.onState` 在语义上保持一致：前者返回原始 Stream，后者返回 Fluent Builder。

### 流式操作符 (Operators)

Logix 暴露了一组常用的 Stream 操作符，可用于 DSL 或 Flow API 返回的流：

-   **`debounce(ms)`**: 防抖。
-   **`throttle(ms)`**: 节流。
-   **`filter(fn)`**: 过滤。
-   **`map(fn)`**: 转换。

```typescript
$.onAction("input")
  .map(a => a.payload)
  .filter(text => text.length > 3)
  .debounce(300)
  .run(...)
```

## 3. 执行策略 (Run Strategies)

决定了当事件到达时，如何调度和执行副作用 Effect。这些策略适用于所有 Logic DSL 和 Flow API。

### `run` (Sequential)

**默认策略**。串行执行。前一个 Effect 完成后，才会执行下一个。
适用于大多数需要保证顺序的业务逻辑。

```typescript
// 依次处理
$.onAction("log").run(doLog)
```

### `runParallel` (Unbounded)

**并行执行**。对每个事件启动一个新的 Fiber，互不等待。
适用于高吞吐、无顺序要求的场景（如埋点上报）。

```typescript
// 并发上报
$.onAction("track").runParallel(sendTracking)
```

### `runLatest` (Switch)

**最新优先**。新事件到达时，如果上一个 Effect 还在执行，则打断（Interrupt）它，立即执行新的。
适用于搜索、Tab 切换等“以最新状态为准”的场景。

```typescript
// 搜索：取消旧请求
$.onAction("search").runLatest(fetchResults)
```

### `runExhaust` (Ignore)

**阻塞防重**。当上一个 Effect 还在执行时，忽略后续到达的事件。
适用于表单提交等“防止重复操作”的场景。

```typescript
// 提交：防重
$.onAction("submit").runExhaust(submitForm)
```

## 4. 长期 Watcher (`runFork`)

在某些场景下（尤其是手动管理 Fiber 时），你可能需要显式地 Fork 一个长期运行的 Watcher。

-   **`runFork`**: 等价于 `Effect.forkScoped($.onAction(...).run(...))`。
-   **`runParallelFork`**: 等价于 `Effect.forkScoped($.onAction(...).runParallel(...))`。

这些方法返回的是 `Effect<void>`，执行后会在当前 Scope（通常是 ModuleRuntime Scope）中启动后台 Fiber。

在实践中，可以用两个维度来选择具体的 API：

- **是否阻塞当前 Logic**：  
  - 不带 `Fork` 的 `run*`：把这条 watcher 当成 Logic 本身的主体来跑，很少在业务中直接使用；  
  - 带 `Fork` 的 `run*Fork`：在 ModuleRuntime 的 Scope 里挂一条长期 watcher，是日常推荐写法。
- **单个 watcher 内的并发模型**：  
  - `run`：同一条 watcher 内严格串行；  
  - `runLatest`：始终只保留最新一次触发；  
  - `runExhaust`：首个执行完成前忽略后续触发；  
  - `runParallel` / `runParallelFork`：显式无界并发。

一个常见的业务写法是：

```ts
// 串行 watcher：监听 inc，并顺序更新状态
yield* $.onAction("inc").runFork(
  Effect.gen(function* () {
    yield* $.state.mutate(s => {
      s.count += 1
    })
  }),
)
```

如果你需要“高吞吐但不改状态”的场景（例如埋点），再显式选择 `runParallel` / `runParallelFork` 即可。

## 5. 补充说明：推荐用 Fluent DSL 表达联动

常见的「监听 Action/State → 更新当前 Store 状态」场景，推荐统一使用 Fluent DSL：

```typescript
// Action → State
yield* $.onAction("reset").update((_prev, _action) => initialState)

// State → State
yield* $.onState(s => s.page).mutate((draft, _page) => {
  draft.selectedId = null
})
```

这类写法在语义上等价于早期的 `andUpdateOnAction/andUpdateOnChanges` Helper，但在逻辑结构和平台解析上更直观。***
