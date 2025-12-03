---
title: 'Reactive Module: The Unified Data Paradigm'
status: merged
moved_to: ../topics/query-integration/04-reactive-paradigm.md
version: 1
layer: Core Concept
related:
  - logix-reactive-schema.md
  - logix-module-computed-query.md
  - logix-query-unified-api-design.md
priority: 700
---

# Reactive Module: The Unified Data Paradigm

> **核心目标**：整合 "Reactive Schema" 的声明式表达力与 "Co-located Definition" 的类型安全性，构建统一的响应式数据范式。

## 1. 核心理念 (Core Concept)

经过对 `Reactive Schema` (L9/logix-reactive-schema) 和 `Module Computed` (L9/logix-module-computed-query) 的深度分析，我们得出结论：

**Schema 应当纯粹描述数据的"形状 (Shape)"，而 Module 应当描述数据的"来源 (Source)"。**

为了解决 TypeScript 的递归类型难题 (Recursive Type Hell)，同时保持 "Schema-Driven" 的开发体验，我们采用 **"Co-located Reactivity" (同位响应式)** 架构：

1.  **State Schema**: 定义纯数据结构 (DTO)。
2.  **Reactive Definition**: 在 Module 定义中，紧邻 State 定义数据的来源（计算、异步、流）。

这种方式既保留了声明式的优雅，又获得了完美的类型推导。

## 2. 统一 API 设计 (Unified API)

我们将 `reactive` 定义为 **"Module 内部的自动驾驶仪"**。它不仅仅是 Computed Field，而是通用的响应式流定义。

它支持两种核心模式：
1.  **State => State (Derivation)**: 派生数据，自动回填到 State 字段。
2.  **State => Action (Effect)**: 副作用，当状态变化时自动触发 Action。

```ts
// 核心包提供通用原语
import { Logix, Schema, Reactive } from '@logix/core'
// 扩展包提供 TanStack Query 集成
import { Query } from '@logix/query'

// 1. 定义纯数据形状 (The Shape)
const UserState = Schema.Struct({
  userId: Schema.String,
  firstName: Schema.String,
  // 占位字段，类型由 Schema 决定
  fullName: Schema.String,

  // 异步数据容器
  // 使用 Schema.Loadable 明确它是一个 Schema 定义
  profile: Schema.Loadable(UserProfileSchema),

  // 实时状态
  status: Schema.String
})

export const UserModule = Logix.Module('User', {
  // 2. 绑定 Schema
  state: UserState,

  actions: {
    setUserId: Schema.String,
    trackUserView: Schema.String, // 用于埋点的 Action
    showToast: Schema.String      // 用于 UI 反馈的 Action
  },

  // 3. 定义响应式流 (The Reactive Flows)
  // 统一入口，自动转化为底层的 $.flow
  reactive: {

    // [Mode 1] State => State (Derivation)
    // 键名必须匹配 State 中的字段
    // ------------------------------------------------

    // [Core] Sync Computed
    fullName: Reactive.computed((state) => `${state.firstName} ${state.lastName}`),

    // [Extension] Query (Async State)
    profile: Query.field({
      deps: (state) => [state.userId],
      loader: ([id]) => UserApi.fetchProfile(id)
    }),

    // [Mode 2] State => Action (Effect)
    // 键名可以是任意描述性字符串 (不要求是 State 字段)
    // ------------------------------------------------

    // [Core] Effect (副作用)
    // 场景：当 userId 变化且不为空时，自动触发埋点 Action
    trackView: Reactive.effect({
      deps: (state) => [state.userId],
      // 这里的 dispatch 是类型安全的
      effect: ([id], { actions }) => {
        if (id) return actions.trackUserView(id)
      }
    }),

    // [Core] Effect (复杂流程)
    // 场景：当 status 变为 'error' 时，显示 Toast
    errorToast: Reactive.effect({
      deps: (state) => [state.profile.error],
      effect: ([error], { actions }) => {
        if (error) return actions.showToast(`Load failed: ${error}`)
      }
    })
  }
})

### 2.1 架构分层: Core vs Extension

为了保持核心包的轻量与通用，我们将职责进行了明确划分：

1.  **@logix/core (Reactive)**:
    *   提供 **通用基础特性**。
    *   `Reactive.computed`: State => State (Sync)。
    *   `Reactive.async`: State => State (Async, SwitchMap)。
    *   `Reactive.stream`: State => State (Observable)。
    *   `Reactive.effect`: State => Action (Side Effect)。

2.  **@logix/query (Query)**:
    *   提供 **TanStack Query 集成**。
    *   `Query.field`: 这是一个工厂函数，它返回一个特殊的 `Reactive` 配置（通常映射为 `Reactive.stream`）。
    *   它负责创建 `QueryObserver`，管理缓存、重试、去重等复杂策略。

**实现原理**:

`Query.field` 本质上是一个 "配置生成器"：

```ts
// @logix/query 内部实现示意
export const field = (config) => {
  return Reactive.stream({
    deps: config.deps,
    // 将 QueryObserver 封装为 Stream
    subscribe: (deps) => Stream.make((emit) => {
      const observer = new QueryObserver(client, { ...config, queryKey: deps })
      return observer.subscribe(emit)
    })
  })
}
```

这种设计使得 Core 保持纯粹，而高级的查询能力通过扩展包无缝接入。

## 3. 解决类型安全难题 (Solving Type Safety)

这种设计的核心优势在于它如何绕过 TypeScript 的限制：

### 3.1 分步推导 (Two-Pass Inference)

1.  **Pass 1**: TypeScript 首先推导 `state: UserState` 的类型 `S`。此时 `S` 是一个纯粹的 JSON 对象结构。
2.  **Pass 2**: 在 `reactive` 字段中，`this` 上下文或泛型约束已经知道了 `S`。
    *   `Reactive.computed` 的签名是 `(state: S) => S[K]`。
    *   `Reactive.async` 的签名要求 `S[K]` 必须兼容 `ResourceState<T>`。

### 3.2 消除递归 (Eliminating Recursion)

在 "Reactive Schema" (旧方案) 中，我们在定义 `Schema` 的过程中试图引用 `Schema` 推导出的类型，这导致了循环引用。
在 "Reactive Module" (新方案) 中，Schema 定义完成之后，才在 Module Config 中引用它。

## 4. 实现深度解析 (Implementation Deep Dive)

为了彻底理解这一设计的精妙之处，我们需要区分 **"身份 (Identity)"** 与 **"逻辑 (Logic)"**。

### 4.1 核心区别：元信息存在哪里？

**1. Schema Annotations (Identity)**
只有 **`Schema.Loadable`** (原 Reactive.Resource) 使用了 Schema Annotations。

*   **作用**: 标记某个字段是 "Loadable 容器"。
*   **实现**:
    ```ts
    // Schema.Loadable 的伪代码
    // 它是 Schema 的扩展，所以挂在 Schema 命名空间下更合适
    const Loadable = (InnerSchema) =>
      Schema.Struct({
        data: Schema.NullOr(InnerSchema),
        loading: Schema.Boolean,
        error: Schema.NullOr(Schema.String)
      }).pipe(
        // 关键点：只挂载静态标记
        Schema.annotations({
          [ReactiveFieldId]: { type: 'loadable' }
        })
      )
    ```
*   **目的**: 让 Runtime 在初始化 State 时，知道这个字段需要被特殊处理（比如初始化默认结构），并准备好接受来自 `reactive` 配置的写入。

**2. Module Config (Logic)**
`Reactive.computed` / `Reactive.async` / `Reactive.stream` / `Reactive.effect` **都不使用** Schema Annotations。

*   **作用**: 定义具体的计算和副作用逻辑。
*   **位置**: 它们存在于 `Module` 定义的 `reactive` 属性中。
*   **目的**: 避开递归类型问题，提供类型安全的逻辑定义环境。

### 4.2 运行时映射机制 (Runtime Mapping)

虽然用户侧的 API 分离了，但在运行时，它们依然会汇聚成统一的 `$.flow`。

1.  **Schema 扫描**: Runtime 首先扫描 State Schema，识别出带有 `Reactive.Resource` 标记的字段，初始化其默认结构 (data=null, loading=false)。
2.  **Config 匹配**: Runtime 遍历 `reactive` 配置对象，将其与 State 字段匹配。
3.  **Flow 生成**:
    *   Runtime 将 Config 中的 `deps` 函数转换为 `$.flow.fromState(deps)`。
    *   将 `loader` 函数转换为 `switchMap(loader)`。
    *   最终生成一个标准的 Logic Fiber，注入到 Module 的运行循环中。

### 4.3 核心原语解剖: Reactive.computed

**Q1: `Reactive.computed(...)` 返回的是什么？**
它返回的 **不是** 计算后的值，也不是 Stream，而是一个 **纯配置对象 (Configuration Object)**。
这个对象只包含元数据，用于告诉 Runtime "该怎么做"。

```ts
// Reactive.computed 的返回值结构
{
  _tag: "Reactive/Computed",
  compute: (state) => state.first + state.last
}
```

**Q2: 什么时候被映射？**
映射发生在 **Module 初始化阶段 (`Module.live`)**。
当 `Module.live` 被调用时，Runtime 会执行以下步骤：

1.  **Init State**: 创建初始状态对象 (Plain Object)。
2.  **Scan Config**: 遍历 `Module.reactive` 配置。
3.  **Compile**: 将每个配置项编译为对应的 Logic Fiber (Stream)。
4.  **Run**: 启动这些 Fibers，开始监听状态变化。

**Q3: 运行时伪代码实现**

```ts
// 假设配置: fullName: Reactive.computed((s) => s.first + s.last)

function compileComputed(key: string, config: ComputedConfig, runtime: Runtime) {
  // 1. 从配置对象中提取计算函数
  const computeFn = config.compute

  // 2. 创建流：监听整个 State 的变化 (或通过 Proxy 自动追踪依赖)
  const stream = runtime.state$.changes.pipe(
    // 3. 计算新值
    Stream.map(state => computeFn(state)),

    // 4. 去重：如果计算结果没变，不触发更新
    Stream.changes,

    // 5. 同步回填：在同一个微任务/事务中更新 State
    // 注意：这里使用特殊的 internalSet 方法，绕过 Action 调度，直接更新内存
    Stream.runForEach(newValue => {
      runtime.internalSet(key, newValue)
    })
  )

  return stream
}
```

**关键特性**:
*   **Sync Update**: 计算是同步发生的。当 `firstName` 变化时，`fullName` 会在同一个 React 渲染周期内更新（如果使用 React 绑定）。
*   **Dependency Tracking**: 实际上 Runtime 会优化 `runtime.state$.changes`，利用 Proxy 或 Selector 只监听相关字段的变化，避免全量重算。

### 4.5 进阶模式: 自定义 Schema 工厂 (Custom Schema Factories)

**Q: 这些 API 是哪里暴露的？**

1.  **`Schema.Loadable`**: 由 `@logix/core` 直接暴露（作为 Schema 的扩展）。
    *   它是官方推荐的、开箱即用的标准容器。

2.  **`ReactiveFieldId`**: 也由 `@logix/core` 暴露。
    *   这是给**架构师**用的底层 Symbol。

**如何定义一个自定义工厂？**

假设你想定义一个简单的 `Loadable<T>`，只有 `value` 和 `pending`：

```ts
// 1. 定义 Schema 结构与标记
const Loadable = <T>(item: Schema.Schema<T>) =>
  Schema.Struct({
    value: Schema.NullOr(item),
    pending: Schema.Boolean
  }).pipe(
    // 挂载自定义元数据
    Schema.annotations({
      [ReactiveFieldId]: {
        type: 'custom',
        // 告诉 Runtime 如何映射状态
        mapping: {
          data: 'value',     // 将异步结果写入 value
          loading: 'pending' // 将加载状态写入 pending
        }
      }
    })
  )

// 2. 在业务中使用
const UserState = Schema.Struct({
  profile: Loadable(UserSchema)
})
```

**Runtime 的通用处理逻辑**:
Runtime 不再硬编码 `Resource` 的逻辑，而是读取 Annotation 中的 `mapping` 配置：
*   当异步任务开始 -> 将 `mapping.loading` 对应的字段设为 true。
*   当异步任务成功 -> 将结果写入 `mapping.data` 对应的字段。

这种设计将 `Reactive.Resource` 降级为一个 **"用户态"** 的工具函数，赋予了架构师极大的灵活性。你可以定义 `PaginationResource`、`InfiniteList` 等各种复杂的容器结构。

## 5. 运行时架构 (Runtime Architecture)

`Module.live` 负责将这些声明式的配置转换为底层的 Logic Fibers。

### 4.1 隐式 Logic 生成 (Implicit Logic Generation)

Runtime 会遍历 `reactive` 配置对象，为每个字段生成一个隐式的 Logic：

*   **Computed**: 生成一个 `Effect.sync` 任务，监听依赖变化，同步更新 State。
    ```ts
    // Runtime 伪代码
    $.flow.fromState(deps).map(compute).pipe($.state.set(key))
    ```

*   **Async (Query)**: 生成一个标准的 Query Flow。
    ```ts
    // Runtime 伪代码
    $.flow.fromState(deps).pipe(
      $.flow.switchMap(loader), // 自动处理竞态
      $.flow.map(result => wrapResource(result)),
      $.state.set(key)
    )
    ```

*   **Stream**: 生成一个长连接管理 Flow，利用 Scope 自动处理订阅/取消订阅。
    ```ts
    // Runtime 伪代码
    $.flow.fromState(deps).pipe(
      $.flow.flatMap(subscribe), // 切换流
      $.state.set(key)
    )
    ```

### 4.2 混合模式 (Hybrid Mode)

这种设计允许 "声明式" 与 "命令式" 共存。
对于 80% 的简单场景，使用 `reactive` 配置。
对于 20% 的复杂场景 (如需要精细控制时序、多步骤重试、跨模块联动)，依然可以编写显式的 `Module.logic`。

## 6. 愿景：Logix Schema = Effect Schema + Runtime Metadata

`@logix/core` 导出的 `Schema` 是 **Effect Schema 的超集 (Superset)**。

### 6.1 继承与扩展 (Inheritance & Extension)
它完全兼容 Effect Schema 的所有 API（如 `Schema.String`, `Schema.Struct`），因为底层就是直接 re-export。

### 6.2 增强能力 (Logix-Specific Capabilities)
在此基础上，Logix 增加了一些 **特定于 Logix Runtime 的高级能力**，主要通过 `Schema.annotations` 实现：

*   **`Schema.Loadable(T)`**:
    *   **能力**: 告诉 Runtime "这是一个异步容器，请自动管理 loading/error"。
    *   **实现**: 扩展了标准 Struct，打上了 `type: 'loadable'` 标记。

*   **`Schema.Action(Payload)`** (未来规划):
    *   **能力**: 告诉 Runtime "这是一个 Action Payload，请为其生成 dispatch 方法"。
    *   **实现**: 打上 `type: 'action'` 标记。

这种设计让 Logix 的 Schema 既保持了与 Effect 生态的互操作性（你可以直接把 Logix Schema 传给 Effect 的解析器），又拥有了特定于业务框架的元编程能力。

## 7. 终极哲学：Effect-TS 元编程模式 (The Meta-Programming Pattern)

你触碰到了 Effect-TS 生态最核心的架构红利：**蓝图 (Blueprint) 与 运行时 (Runtime) 的彻底解耦**。

这正是 Logix v3 能够创造出 `Reactive.computed`、`Schema.Loadable` 等高级语法糖的理论基础。

### 7.1 核心公式

```
High-Level DSL = Schema Metadata (蓝图) + Runtime Capabilities (执行力)
```

1.  **Schema Metadata (静态蓝图)**:
    *   利用 `Schema.annotations`，我们可以将任意业务意图（"这是一个资源"、"这是一个 Action"、"这是一个表单校验"）编码进静态的类型系统中。
    *   这就像是在画建筑图纸，只负责标记 "这里是承重墙"，而不负责 "怎么砌墙"。

2.  **Runtime Capabilities (动态执行力)**:
    *   Logix Runtime (基于 Effect) 就像一个强大的施工队。
    *   它拿着图纸（Schema），利用底层的 Bound API (`$.flow`, `$.state`, `$.actions`)，动态地构建出复杂的业务逻辑。

### 7.2 无限的扩展性

这种模式意味着我们可以创造 **任意** 的高级语法糖，而不需要修改核心编译器：

*   **想要一个 "自动保存" 功能？**
    *   定义 `Schema.AutoSave(Interval)`。
    *   Runtime 识别到标记，自动挂载一个 `debounce -> save` 的 Flow。
*   **想要一个 "乐观更新 (Optimistic UI)"？**
    *   定义 `Schema.Optimistic(Mutation)`。
    *   Runtime 识别到标记，自动拦截 Action，先更新 UI，再发请求，失败回滚。

**结论**：
Logix v3 不仅仅是一个状态库，它是一个 **基于 Effect-TS 的元框架 (Meta-Framework)**。它证明了：只要底层原语足够强大（Effect），上层抽象就可以无限自由。

## 8. 总结 (Conclusion)

这份整合方案：

1.  **采纳了** `logix-reactive-schema.md` 的 **"Schema-Driven" 愿景** —— 开发者只需关注数据定义。
2.  **采纳了** `logix-module-computed-query.md` 的 **"Co-located" 实现** —— 确保 100% 类型安全。
3.  **采纳了** `logix-query-unified-api-design.md` 的 **"Layered" 策略** —— `reactive` 配置即 Layer 1，显式 Logic 即 Layer 2/3。

这是 Logix v3 在数据范式上的最终答案：**Declarative Source, Co-located with Shape.**
