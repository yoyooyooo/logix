---
title: Link · Cross-Module Derived State（心智模型）
status: draft
version: 2025-12-14
value: core
priority: later
related:
  - ../../../../specs/007-unify-trait-system/spec.md
  - ../../../../specs/007-unify-trait-system/contracts/state-trait.md
---

# Link：跨模块派生（Cross-Module Derived State）

> 收敛说明：早期草案用 “Schema Link / `Link.to` sugar” 表达跨模块派生。  
> 007 之后，跨模块派生应统一落到 Trait/StateTrait 的语义与事务/回放/诊断口径上；本文件只保留心智模型，不再作为 API 规范。

**核心定义**：Link 是 Logix 中的 **“声明式外键 / Join 心智”**——本模块的某个字段由“本模块的 key + 其他模块的 state”推导而来，并在两个来源变化时保持一致。

## 1. 为什么需要 Link（跨模块派生）？

在传统状态管理（如 Redux/Zustand）中，处理 "关联数据" 通常有两种痛苦模式：

1.  **Denormalization (数据冗余)**: 把 User 信息拷贝一份存到 Post Store 里。
    *   *痛点*: 数据同步困难，User 改名了，Post 里的名字没变。
2.  **Selector Joining (运行时拼接)**: 在组件层用 `useSelector` 分别取 User 和 Post，然后拼在一起。
    *   *痛点*: 逻辑泄露到 UI 层；如果关联逻辑复杂（比如级联查找），组件代码会很脏。

**Link 的目标**：像 SQL/GraphQL 一样，在“状态定义/图纸层”表达关联关系，并在运行时以统一的事务/订阅/回放口径维持一致性，同时避免把 join 逻辑散落在 UI 层。

## 2. 形状（The Shape）

```typescript
import * as Logix from '@logix/core'
import { Schema } from 'effect'

const PostState = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  authorId: Schema.String, // 外键 (Foreign Key)

  // 概念：author 来自 “authorId + UserModule 的 users 表”
  author: /* Link(...) */ Schema.Unknown,
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

## 3. 运行时机制（What actually happens）

Link 的实现应遵守一个硬约束：**不跨模块写 state**。它的落地通常等价于：

- 订阅本模块的 key 变化；
- 订阅目标模块的相关 state 变化；
- 在本模块事务窗口内写回派生字段（或等价的派生视图），并保证对外可观察提交 0/1 次。

当模块运行时启动（或在 Trait/Program 安装阶段），运行时会将 Link 规则接线为一段稳定的派生逻辑；回放模式下必须可复现，不触发真实网络。

> 注：早期草案展示了“自动生成隐式 Logic”的伪代码。该方向已不作为规范文本保留；实际实现以 007 的 Trait/StateTraitProgram 与 runtime-logix 的事务/订阅语义为准。

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
