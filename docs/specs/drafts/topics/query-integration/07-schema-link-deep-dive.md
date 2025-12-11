---
title: Schema Link The Relational State Paradigm
status: draft
version: 1
layer: Concept
value: extension
priority: later
related:
  - 06-unified-data-vision.md
---

# Schema Link: The Relational State Paradigm

> **核心定义**: Schema Link (`Link.to`) 是 Logix 中的 **"声明式外键 (Declarative Foreign Key)"**。它允许你在定义 State Schema 时，直接声明某个字段 "引用" 自另一个 Module 的数据。

## 1. 为什么需要 Schema Link?

在传统状态管理（如 Redux/Zustand）中，处理 "关联数据" 通常有两种痛苦模式：

1.  **Denormalization (数据冗余)**: 把 User 信息拷贝一份存到 Post Store 里。
    *   *痛点*: 数据同步困难，User 改名了，Post 里的名字没变。
2.  **Selector Joining (运行时拼接)**: 在组件层用 `useSelector` 分别取 User 和 Post，然后拼在一起。
    *   *痛点*: 逻辑泄露到 UI 层；如果关联逻辑复杂（比如级联查找），组件代码会很脏。

**Schema Link 的目标**: 像 SQL 或 GraphQL 一样，**在数据定义层解决关联问题**，同时保持底层数据的 Normalized（范式化）。

## 2. API 设计 (The Shape)

```typescript
import * as Logix from '@logix/core'
import { Schema } from 'effect'

const PostState = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  authorId: Schema.String, // 外键 (Foreign Key)

  // 🌟 Schema Link: 声明式关联
  author: Logix.Link.to(UserModule, {
    // 1. 依赖键 (Dependency Key)
    // 当 state.authorId 变化，或 UserModule 中对应数据变化时，重新计算
    key: (post) => post.authorId,

    // 2. 解析器 (Resolver)
    // 类似于 SQL 的 JOIN 条件或 GraphQL Resolver
    // 参数: (key, targetModuleState)
    resolve: (authorId, userState) => userState.users[authorId] ?? null
  })
})
```

### 类型推导 (Type Inference)

TypeScript 会自动推导 `author` 字段的类型：
*   输入: `UserModule` 的 State 类型。
*   输出: `resolve` 函数的返回值类型 (例如 `User | null`)。
*   结果: `PostState.author` 的类型就是 `User | null`。

## 3. 运行时机制 (The "Sugar" Revealed)

正如之前的文档所述，`Link.to` 是 `$.use` + `$.on` 的语法糖。

当 `Module.live` 启动时，它会扫描 Schema，发现 `Link.to` 字段，然后**自动生成**一段隐式的 Logic。

### 编译前 (Schema):
```typescript
author: Link.to(UserModule, { key: s => s.authorId, resolve: ... })
```

### 编译后 (Implicit Logic):
```typescript
// 伪代码：运行时自动生成的 Logic
Module.logic(($) => Effect.gen(function*() {
  // 1. 获取目标模块句柄
  const $User = yield* $.use(UserModule)

  // 2. 构造组合流 (Combined Stream)
  // 监听 本地 authorId 变化 + 远端 UserState 变化
  const deps$ = Stream.combineLatest(
    $.state.changes(s => s.authorId),
    $User.changes(s => s), // 或者更细粒度的 selector
    (authorId, userState) => ({ authorId, userState })
  )

  // 3. 响应变化并更新本地字段
  yield* $.on(deps$).runLatest(({ authorId, userState }) =>
    $.state.update(draft => {
      // 执行 resolve 逻辑
      draft.author = resolve(authorId, userState)
    })
  )
}))
```

**关键特性**:
*   **Reactive**: 无论是 `authorId` 变了，还是 `UserModule` 里的数据变了，`author` 字段都会自动更新。
*   **Read-Only**: `author` 字段在本地是只读的（Computed），你不能直接 `setAuthor(...)`，只能通过改 `authorId` 或改 `UserModule` 来驱动它变化。

## 4. 高级模式

### 4.1 列表关联 (One-to-Many / Many-to-Many)

```typescript
// GroupModule
members: Link.to(UserModule, {
  key: (group) => group.memberIds, // string[]
  resolve: (ids, userState) => ids.map(id => userState.users[id])
})
```

### 4.2 跨模块计算 (Cross-Module Computed)

Link 不仅仅是查表，还可以做计算：

```typescript
// CartModule
totalPrice: Link.to(ProductModule, {
  key: (cart) => cart.items,
  resolve: (items, productState) => {
    return items.reduce((sum, item) => {
      const price = productState.products[item.productId]?.price ?? 0
      return sum + price * item.quantity
    }, 0)
  }
})
```

## 5. 总结

Schema Link 实际上把 **"Derived Data" (派生数据)** 的概念从 **单模块内部** 扩展到了 **跨模块**。

*   **Computed**: 模块内派生 (State A -> State B)
*   **Link**: 跨模块派生 (Module A + Module B -> Module A)

它让 Logix 的 State 变成了一个 **连通图 (Connected Graph)**，而不是一个个孤立的数据孤岛。
