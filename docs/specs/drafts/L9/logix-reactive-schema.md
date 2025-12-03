---
title: 'Reactive Schema: The Logix v3 Data Paradigm'
status: merged
moved_to: ../topics/query-integration/04-reactive-paradigm.md
version: 2
layer: Core Concept
priority: 800
---

# Reactive Schema: The Logix v3 Data Paradigm

> "Schema is not just a validator. It is the Dependency Graph."

## 1. 核心理念 (Core Concept)

在 Logix v3 中，我们重新定义了 Schema 的角色。
传统的 Schema (Zod/Effect Schema) 是**静态的 (Static)**，仅描述数据的形状。
Logix 的 Schema 是**响应式的 (Reactive)**，它同时描述了数据的**来源 (Source)** 和 **依赖 (Dependencies)**。

这种范式转移让我们能够实现 **"Schema-Driven Reactivity"**：
开发者只需定义 Schema，Runtime 自动构建响应式链路。

## 2. 统一 API: `Schema.augment`

为了支持响应式定义，我们引入了 `Schema.augment` (增强) API。
它允许我们在定义 Schema 的同时，声明字段的计算逻辑。

```ts
import { Logix, Schema, Reactive } from '@logix/core'

const Base = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  userId: Schema.String
})

export const UserModule = Logix.Module('User', {
  state: Schema.augment(Base, (base) => ({

    // 1. 同步计算 (Sync Computed)
    // 类似于 Vue computed 或 MobX view
    fullName: Reactive.computed({
      deps: [base.firstName, base.lastName],
      compute: ([first, last]) => `${first} ${last}`
    }),

    // 2. 异步计算 (Async Computed / Query)
    // 类似于 React Query，但内聚在 Schema 中
    profile: Reactive.async({
      deps: [base.userId],
      loader: ([id]) => UserApi.fetchProfile(id),
      staleTime: 5000
    }),

    // 3. 实时流 (Stream / Subscription)
    // 类似于 WebSocket 订阅
    status: Reactive.stream({
      deps: [base.userId],
      subscribe: ([id]) => UserApi.subscribeStatus(id)
    })
  }))
})
```

## 3. 体系架构 (Architecture)

在 Reactive Schema 体系下，`Query` 不再是一个独立的顶层概念，而是 `Reactive.async` 的一种特例。

### 3.1 响应式原语 (Primitives)

*   **`Reactive.computed`**: 纯函数计算。Runtime 保证其为 Pure & Memoized。
*   **`Reactive.async`**: 副作用计算 (Effect)。Runtime 负责并发控制 (TakeLatest/SwitchMap)、竞态处理、Loading 状态管理。
*   **`Reactive.stream`**: 长连接源。Runtime 负责连接建立与销毁 (Scope Management)。

### 3.2 运行时映射 (Runtime Mapping)

### 3.2 运行时映射 (Runtime Mapping)

Logix Runtime (`Module.live`) 会解析这些 Schema Annotations，并将其映射为底层的 Logic Fibers：

| Schema Definition | Runtime Implementation | Consistency |
| :--- | :--- | :--- |
| `Reactive.computed` | **Derived State** (Atomic Update). 当依赖变化时，在同一事务中同步计算新值。 | **Strong (Sync)** |
| `Reactive.async` | `$.flow.fromState(deps).runLatest(loader)` | **Eventual (Async)** |
| `Reactive.stream` | `$.flow.fromState(deps).flatMap(subscribe)` | **Eventual (Async)** |

### 3.3 与 Effect Stream 的关系 (The Stream Connection)

你可能会担心：*这是否背离了 Effect Stream 的哲学？*
恰恰相反，Reactive Schema 是 **Effect Stream 的声明式投影 (Declarative Projection)**。

*   **Layer 0 (Effect/Stream)**: 强大的原语，适合处理复杂的时序、并发和资源管理。但直接用来写业务状态往往过于底层 (Verbose)。
*   **Layer 1 (Reactive Schema)**: 针对 "State Derived from Source" 这一特定模式的 DSL。

**Desugaring (脱糖)**:
当我们写 `Reactive.async` 时，Runtime 实际上是在帮你写这样一段标准的 Stream 代码：

```ts
// Schema 定义
profile: Reactive.async({ deps: [id], loader: fetchUser })

// Runtime 自动生成的 Stream 代码
Stream.fromChanges(state.id).pipe(
  Stream.debounce(config.debounce),     // 自动处理防抖
  Stream.mapEffect(id => fetchUser(id)), // 自动处理 Effect 执行
  Stream.runForEach(data => state.profile.set(data)) // 自动回填
)
```

我们没有抛弃 Stream，而是把 **"Stream 的最佳实践"** 固化在了 Schema 定义中。对于 80% 的标准场景，你不需要手写 Stream；对于剩下 20% 的复杂场景 (Layer 3)，你依然可以跳出 Schema，直接在 Logic 中写原生的 Stream。

## 4. 运行时深度解析 (Runtime Deep Dive)

你问到：**"真的能在运行时做这种转换吗？"**
答案是肯定的。这不是魔法，而是 **Runtime Metaprogramming (运行时元编程)**。

我们不是在生成文本代码，而是在内存中动态构建 Stream 对象图。
以下是 `Module.live` 内部的核心逻辑伪代码：

```typescript
// 这是一个简化版的 Runtime Compiler
function compileSchemaToLogic(state: State, schema: Schema) {
  // 1. 遍历 Schema 字段
  for (const [key, fieldSchema] of Object.entries(schema.fields)) {

    // 2. 提取元数据 (Metadata)
    const meta = getReactiveMetadata(fieldSchema)
    if (!meta) continue

    // 3. 根据类型构建 Stream (The Transformation)
    if (meta.type === 'async') {

      // 动态构建 Stream Pipeline
      const stream = Stream.fromEffect(
        // 3.1 解析依赖 (Resolve Dependencies)
        // meta.deps 是一个函数 (s) => [s.id]，这里传入真实的 state proxy
        resolveDependencies(state, meta.deps)
      ).pipe(
        // 3.2 监听变化 (Watch Changes)
        Stream.changes,

        // 3.3 应用策略 (Apply Strategy: Debounce/SwitchMap)
        Stream.debounce(meta.options.debounce),
        Stream.switchMap(args =>
          // 执行 Loader
          Effect.tryPromise(() => meta.loader(args))
            .pipe(Effect.mapError(err => wrapError(err)))
        ),

        // 3.4 回填状态 (Write Back)
        Stream.runForEach(data =>
          state[key].set(data)
        )
      )

      // 4. 注入到 Runtime Loop
      Runtime.runFork(stream)
    }
  }
}
```

这就是 Logix Runtime 的核心职责：**它是一个解释器，将静态的 Schema 解释为动态的 Effect/Stream 流程。**

## 5. 实现规格说明 (Implementation Specs)

为了落地这一设计，我们需要在 `@logix/core` 中进行以下改造：

### 5.1 核心原语 (`packages/logix-core/src/Reactive.ts`)

这是用户侧的 API 定义，负责生成带有元数据的 Schema。

*   **Metadata Definition**:
    ```ts
    export const ReactiveFieldId = Symbol.for("@logix/core/ReactiveField")

    export type ReactiveMetadata =
      | { type: 'computed', deps: Deps, compute: (args) => Ret }
      | { type: 'async',    deps: Deps, loader: (args) => Promise<Ret> }
      | { type: 'stream',   deps: Deps, subscribe: (args) => Stream }
    ```

*   **Factory Implementation**:
    利用 `Schema.annotations` 将元数据挂载到 Schema AST 上。
    ```ts
    export const computed = (config) =>
      Schema.Any.pipe(
        Schema.annotations({
          [ReactiveFieldId]: { type: 'computed', ...config }
        })
      )
    ```

### 5.2 运行时编译器 (`packages/logix-core/src/Module.ts`)

这是引擎侧的实现，负责解析 Schema 并启动 Logic Fiber。

*   **Compiler Logic**:
    在 `Module.live` (或 `makeLogic`) 初始化阶段，遍历 `StateSchema.ast`。
    1.  查找带有 `ReactiveFieldId` 的字段。
    2.  根据 metadata 类型，生成对应的 `Stream` (如上文 Deep Dive 所示)。
    3.  将生成的 Stream 注入到 Runtime Scope 中运行。

## 6. 优势 (Benefits)

1.  **高内聚 (Cohesion)**: 数据定义与数据来源在一起，修改字段时无需在文件间跳跃。
2.  **类型安全 (Type Safety)**: `Schema.augment` 解决了 TypeScript 的递归类型问题，提供完美的类型推导。
3.  **统一心智 (Unified Mental Model)**: 无论是同步计算、异步请求还是 WebSocket，都是 "Computed Field" 的变体。

## 5. 迁移路径 (Migration Path)

原有的 `Query.field` API 将被视为 `Reactive.async` 的别名 (Alias)，以保持向后兼容或提供更语义化的缩写。

```ts
// Query.field is just sugar for Reactive.async
export const Query = {
  field: Reactive.async
}
```
