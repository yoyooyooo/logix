---
title: '@logix/query 统一 API 设计：三层架构 (Unified API Design v3)'
status: definitive.v3
version: 3.0.0
layer: Extension Library
related:
  - ../capability-plugin-system/01-capability-plugin-blueprint.md
---

# @logix/query 统一 API 设计：三层架构

**核心目标**：实现数据获取的 **极致 DX** —— 零配置、强类型、平台可解析。通过三层 API 渐进式地满足从简单到复杂的各类需求。

---

## 0. 设计理念 (V3 Bound Helper Pattern)

- **Helper-First**: 所有能力通过 `Query.query($, ...)` 暴露。
- **Schema-Driven**: 利用 V3 `CapabilityMeta` 协议，将 Schema 描述自动编译为 Logic。
- **DI-Native**: `QueryClient` 作为 Service 通过 Layer 注入。

> [!WARNING]
> **Level 1 Restriction**: Schema 定义中的 `fn` 是 **纯函数上下文**，无法访问 Module Scope (`$`) 或 Effect Environment。如果你的查询需要依赖 Context、Scope 或复杂 Env，请直接使用 **Layer 2 (Logic)**。

---

## Layer 1: Declarative Query Field (声明式查询字段)

**定位**：覆盖 80% 的标准"读"场景（GET）。将 Query 定义内聚在 State Schema 中。

### 1.1 API 契约

```ts
import * as Logix from '@logix/core'
import { Query } from '@logix/query' // New V3 Package
import { Schema } from 'effect'

// 🌟 L1 Standard: Fluent Pipe (避免 State 拆分)
const UserState = Schema.Struct({
  userId: Schema.String,
}).pipe(
  // Query.attach: 自动推导左侧 Schema 类型
  Query.attach('profile', {
    key: (state) => ['user', state.userId], // ✅ state: { userId: string }
    fn: (key) => UserApi.fetchProfile(key[1]),
    enabled: (state) => !!state.userId,
  }),
)

export const UserModule = Logix.Module.make('User', {
  state: UserState,
  actions: {
    setUserId: Schema.String,
  },
})
```

## 4.1 Advanced Definition Patterns

### The "Fluent Pipe" Trick (High Trick)

如果你不想把 State 拆成两半定义，可以使用 Effect `pipe` 模式。
这既保持了链式推导，又让代码在视觉上通过 `pipe` 连在一起。

```ts
const UserState = Schema.Struct({
  userId: Schema.String,
  // 基础字段...
}).pipe(
  // 🌟 .attach (Concept): 专门用于 Schema-Capability 绑定的 Helper
  // 左侧的 Schema 类型会自动流入
  Query.attach('profile', {
    schema: ProfileSchema,
    key: (s) => ['user', s.userId], // ✅ s 自动推导为 { userId: string }
    fn: (key) => UserApi.fetchProfile(key[1]),
  }),
)

export const UserModule = Logix.Module.make('User', {
  state: UserState,
  // ...
})
```

### Logic-First (The Architecture Shift)

如果一个 Query 对 State 的依赖关系非常复杂（例如依赖多个 computed 或者有复杂的竞态），**架构上建议直接下沉到 Layer 2 (Logic)**。

- **Schema**: 只定义形状 `profile: Schema.Loadable(User)`。
- **Logic**: 在 `Query.query($, ...)` 中处理所有依赖。

因为在 Logic 中，`$` 总是持有最终完整的 State/Action 类型，**永远不会有循环引用的问题**。

## 4.2 Best Practice: Separation of Concerns (v3 Principle)

针对 "Schema 定义太长、拆分太碎" 的痛点，V3 提出了明确的指导原则：

> **"Schema Defines Shape, Logic Defines Source."**

- **Simple Cases (L1)**: 如果 Query 只依赖基础字段（如 `userId`），可以使用 `Query.field` 或 `Fluent Pipe` 定义。
- **Complex Dependencies (L2)**: 一旦出现 `Query B` 依赖 `Query A` 的结果，或者依赖多个 Computed 字段，**请立即停止在 Schema 中纠结**，转而在 `Module.logic` 中使用 `Query.query($, ...)`。

这种分离不仅解决了 TS 类型推导难题，也让“数据结构定义”保持了干净纯粹，符合 Logix **"Data First"** 的哲学。

### 1.2 运行时行为

当 `Module.live` 运行时，会扫描 `CapabilityMeta`，并自动调用 Layer 2 的 `Query.query` Helper，将逻辑注入到 Runtime。

---

## Layer 2: Explicit Query Logic (显式查询逻辑)

**定位**：覆盖需要自定义副作用、跨 Module 依赖或复杂触发条件的场景。这是 **标准 V3 推荐写法**。

### 2.1 API 契约

```ts
import { Query } from '@logix/query'

export const UserProfileQueryLogic = UserModule.logic(($) =>
  // 🌟 Query.query (L2): Bound Helper
  Query.query($, {
    target: 'profile', // 回填字段

    // Key Mapper: state -> QueryKey
    key: (state) => ['user', state.userId],

    // Fetcher
    fn: (key) => UserApi.fetchProfile(key[1]),

    // No more manual lifecycle needed! Helper handles it via Effect Scope.
  }),
)
```

**为什么优于旧版 `createQueryLogic`？**

- **强类型推导**：`$` 参数自动携带了 `State/Action` 类型，TS 可以自动推导 `key` 函数的 `state` 参数。
- **Scope Native**: 内部自动管理订阅与 cleanup。

---

## Layer 3: Manual Integration (手动集成)

**定位**：兜底方案。用于处理 Infinite Query、Suspense 集成、或极端复杂的竞态控制。

### 3.1 API 契约 (Effect Native)

```ts
import { QueryClientTag } from '@logix/query'
import { Lifecycle } from '@logix/core'

export const CustomQueryLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // 🌟 DI: 获取底层 Client
    const queryClient = yield* $.use(QueryClientTag)

    // 🌟 Lifecycle: 显式挂载清理逻辑 (不再用 $.lifecycle)
    yield* Lifecycle.onInit(Effect.log('Custom Query Logic Init'))

    // 手动编排流
    yield* $.flow.fromState(s => s.userId).pipe(
      $.flow.debounce(300),
      $.flow.runLatest((id) => Effect.gen(function*() {
         yield* $.state.update(s => ({ ...s, loading: true }))

         const result = yield* Effect.tryPromise(() =>
           queryClient.fetchQuery({ queryKey: ['user', id], ... })
         )

         yield* $.state.update(s => ({ ...s, data: result, loading: false }))
      }))
    )
  })
)
```

---

## 4. 架构总结

| Layer  | API                     | 适用场景         | 实现机制                    |
| ------ | ----------------------- | ---------------- | --------------------------- |
| **L1** | `Query.field({...})`    | 简单 Fetch，CRUD | `CapabilityMeta` -> 调用 L2 |
| **L2** | `Query.query($, {...})` | 复杂依赖，副作用 | **Standard Bound Helper**   |
| **L3** | `$.use(QueryClientTag)` | 极端定制         | Raw Effect + Service        |

这种架构完美契合了 **Micro-Kernel** 原则，且通过移除 `$.lifecycle`，使 API 更接近 Effect 原生风格。
