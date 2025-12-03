---
title: "@logix/query 统一 API 设计：三层架构 (Unified API Design)"
status: draft
version: 1.1
layer: Extension Library
value: extension
priority: later
related:
  - logix-query-integration-strategies.md
  - logix-query-elegant-api-design.md (artifact)
  - logix-query-perfect-design.md
---

# @logix/query 统一 API 设计：三层架构

**核心目标**：实现数据获取的 **极致 DX** —— 零配置、强类型、平台可解析。通过三层 API 渐进式地满足从简单到复杂的各类需求。

---

## 0. 设计理念

- **Module-Native**: Query 不是外挂，而是 State 的一部分。
- **Schema-Driven**: 利用 Schema 元数据自动生成标准 Logic。
- **Progressive**: 80% 场景用 Layer 1，20% 复杂场景下沉到 Layer 2/3。

---

## Layer 1: Declarative Query Field (声明式查询字段)

**定位**：覆盖 80% 的标准"读"场景（GET）。将 Query 定义内聚在 State Schema 中。

### 1.1 API 契约

```ts
import { Logix, Query } from '@logix/core'
import { Schema } from 'effect'

export const UserModule = Logix.Module('User', {
  state: Schema.Struct({
    userId: Schema.String,

    // 🌟 Query.field: 声明这是一个"活"的字段
    // 泛型自动推导：
    // - State 类型 (S)
    // - QueryKey 类型 (K)
    // - Data 类型 (D)
    profile: Query.field({
      // 依赖追踪：state 即为当前 Module 的状态快照
      queryKey: (state) => ['user', state.userId] as const,

      // 执行函数：解构 ctx 获取强类型 key
      queryFn: ({ queryKey: [_, id] }) => UserApi.fetchProfile(id),

      // 启用条件
      enabled: (state) => !!state.userId,

      // 策略配置
      staleTime: 5_000,
    }),
  }),
  actions: {
    setUserId: Schema.String,
  }
})
```

### 1.2 运行时行为 (Module.live 自动装配)

当调用 `UserModule.live(...)` 时，底层 Runtime 会执行以下操作：

1. **Schema 扫描**：遍历 `stateSchema`，识别带有 `[QueryFieldSymbol]` 标记的字段。
2. **Logic 生成**：为每个 Query Field 自动生成一段隐式的 `RxQueryLogic`。
   - `deps = config.queryKey` (依赖 State 变化)
   - `sink = state.profile` (自动回填 data/isLoading/error)
3. **注入**：将生成的 Logic 合并到 Module 的 Logic 列表中。

### 1.3 类型推导体验

在 React 组件中：

```ts
const { state } = useModule(UserModule)

// state.profile 自动展开为：
// {
//   data: User | null,
//   isLoading: boolean,
//   error: Error | null,
//   refetch: () => void
// }
```

---

## Layer 2: Explicit Query Logic (显式查询逻辑)

**定位**：覆盖需要自定义副作用、跨 Module 依赖或复杂触发条件的场景。

### 2.1 API 契约

```ts
import { createQueryLogic } from '@logix/query'

export const UserProfileQueryLogic = createQueryLogic(UserModule, {
  // 1. 显式定义触发源 (Source)
  params: (state) => state.userId,

  // 2. Query 配置
  query: {
    queryKey: (userId) => ['user', userId] as const,
    queryFn: (ctx) => UserApi.fetchProfile(ctx.queryKey[1]),
    enabled: (userId) => !!userId,
  },

  // 3. 写入目标 (Sink)
  target: 'profile',

  // 4. 生命周期钩子 (Side Effects)
  onSuccess: ($) => (data) => Effect.gen(function*() {
    yield* Effect.log(`User loaded: ${data.name}`)
    yield* $.actions.someAction(data)
  }),

  onError: ($) => (error) => Effect.gen(function*() {
    yield* $.actions.showToast(error.message)
  })
})
```

---

## Layer 3: Manual Integration (手动集成)

**定位**：兜底方案。用于处理 Infinite Query、Suspense 集成、或极端复杂的竞态控制。

### 3.1 API 契约 (Effect Native)

```ts
export const CustomQueryLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    const queryClient = yield* QueryClientTag

    // 手动编排流
    yield* $.flow.fromState(s => s.userId).pipe(
      $.flow.debounce(300),
      $.flow.runLatest((id) => Effect.gen(function*() {
        // 手动管理 Loading
        yield* $.state.update(s => ({ ...s, loading: true }))

        // 直接调用 RQ Core
        const result = yield* Effect.tryPromise(() =>
          queryClient.fetchQuery({ queryKey: ['user', id], ... })
        )

        // 手动回填
        yield* $.state.update(s => ({ ...s, data: result, loading: false }))
      }))
    )
  })
)
```

---

## 4. 架构评估与关键决策 (Evaluation)

### 4.1 Schema 递归类型问题 (Recursive Type Issue)

**挑战**：在定义 state Schema 时，`queryKey: (state) => ...` 函数需要引用尚未定义完成的 State 类型。

**解法**：使用 **Getter 模式** 或 **Builder 模式** 延迟推导，或者允许 state 参数为 `Partial<State>` 或 `any` (由运行时保证)，在 Module 定义完成后再通过 `Module.State` 进行类型收窄。

在 Logix v3 中，推荐使用 **Two-Pass Definition** 或 **Proxy Type** 来解决：

```ts
// 1. 先定义纯数据结构 (DTO)
const UserData = Schema.Struct({ userId: Schema.String });

// 2. 再定义包含 Query 的 State
const UserState = Schema.extend(UserData, Schema.Struct({
  profile: Query.field<typeof UserData, ...>({ ... })
}));
```

或者，接受在 `Logix.Module` 定义内部 `queryKey` 参数的类型推导可能需要一些 TypeScript 魔法（如 `ThisType`）。

### 4.2 平台解析策略

- **Layer 1**: Parser 扫描 Module Schema AST，识别 `Query.field` 调用。在可视化图中，将其渲染为 **"State 内嵌数据源" (State-Embedded Datasource)**，用特殊图标标记 State 节点上的该字段。
- **Layer 2**: Parser 识别 `createQueryLogic` 调用。渲染为独立的 **Logic 节点**，连线指向 State 字段。
- **Layer 3**: 渲染为普通 **Code Block**。

### 4.3 推荐实施路径

- **Phase 1**: 实现 `QueryClientTag` 和 Layer 3 (Manual)，打通底层。
- **Phase 2**: 实现 `createQueryLogic` (Layer 2) 工厂函数，覆盖大部分手写场景。
- **Phase 3**: 攻克 TypeScript 类型推导难点，实现 `Query.field` (Layer 1) 的 Schema 扩展与自动 Logic 注入。

### 4.4 架构深度辨析：Live State vs Pure State

**核心问题**：`Query.field` 在 State Schema 中定义了 `queryFn`（行为），这是否破坏了 Logix "State is Pure Data" 的原则？

**架构决策**：为了保持 Logix 核心的纯粹性，我们需要明确区分 **Schema 定义** 与 **Runtime 实例**。

#### 1. State 实例永远是纯的 (Runtime Purity)

无论 Schema 定义多么花哨，`ModuleRuntime` 中持有的 `state` 必须永远是 **Plain JSON Object**。

- ✅ **可序列化**：`state.profile` 在运行时只包含 `{ data: ..., isLoading: ..., error: ... }` 数据快照。
- ✅ **Time Travel**：调试器可以随意快照和回放，因为它只是一堆数据。
- ✅ **禁止闭包**：`queryFn` 和 `queryKey` 函数绝不会被存储在 State 实例中。

#### 2. Schema 是"富"的 (Rich Schema)

我们扩展了 Logix 对 Schema 的定义。**Schema 不仅描述数据的"形状 (Shape)"，也可以描述数据的"来源 (Source)"**。

- `Query.field` 本质上是利用 `Schema.annotations` 挂载了 **元数据 (Metadata)**。
- 这些元数据是**静态的**，只存在于定义层。

#### 3. "虚实分离" 的装配过程 (The Assembly Process)

`Module.live` 承担了"编译器"的角色：

```
Schema (含 Query 元数据)
    ↓ 1. 提取元数据
Module.live 装配器
    ↓ 2. 生成纯净的 Initial State
    ↓ 3. 生成隐式的 Query Logic (Effect)
    ↓
Module Runtime (纯净 State + Logic Fibers)
```

**结论**：Layer 1 的"优雅"并非通过牺牲纯粹性获得的，而是通过**将行为定义上移到元数据层**实现的。这实际上强化了 Logix 核心体系：它定义了一种标准的 **"Resource State" (资源型状态)** 范式。

---

## 5. 待决问题与后续工作

### 5.1 类型系统挑战

- [ ] 解决 `Query.field` 中 `queryKey: (state) => ...` 的递归类型推导
- [ ] 验证 Layer 1 在复杂嵌套 Schema 场景下的类型表现
- [ ] 确保 `refetch/invalidate` 方法的类型安全注入

### 5.2 运行时实现

- [ ] 实现 `Module.live` 的 Schema 扫描与 Logic 自动注入机制
- [ ] 设计 `QueryObserver` 的生命周期管理策略（基于 `$.lifecycle`）
- [ ] 处理多个 Query Field 之间的资源共享与隔离

### 5.3 平台集成

- [ ] 定义 `Query.field` 的 AST 解析规则
- [ ] 设计 Studio 中 Query Field 的可视化图标与交互
- [ ] 支持 Query Field 的"无代码重配"能力

### 5.4 文档与示例

- [ ] 编写 Layer 1/2/3 的完整使用指南
- [ ] 提供真实场景的迁移案例（从 `useQuery` 到 `Query.field`）
- [ ] 补充 Mutation / Infinite Query 的设计方案

---

## 6. 相关文档

- [Logix Query 集成策略（零封装方案）](./logix-query-integration-strategies.md)
- [Logix Query 极致优雅 API 设计](../../.gemini/antigravity/brain/.../logix-query-elegant-api-design.md) (artifact)
- [runtime-logix/core/02-module-and-logic-api.md](../../runtime-logix/core/02-module-and-logic-api.md)
- [runtime-logix/core/03-logic-and-flow.md](../../runtime-logix/core/03-logic-and-flow.md)

---

**版本历史**：

- v1.1 (2025-11-30): 基于与 Claude 的深度讨论，整合三层 API 设计，新增"虚实分离"架构辨析。
- v1.0 (2025-11-30): 初始版本，梳理 Layer 1/2/3 契约与设计理念。
