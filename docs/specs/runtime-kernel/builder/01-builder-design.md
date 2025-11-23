# Logix Builder SDK Design (@logix/builder)

> **Status**: Final Draft (Anchor-Ready)
> **Purpose**: 为 Logix Runtime 提供强类型的、结构化的 DSL 构建工具。它是 Logic Intent 的生成器，同时负责注入全双工所需的锚点元数据。

## 1. 定位与关系：同构映射

*   **@logix/types**: **共享词汇表**。定义 Signal、Service 等基础类型。
*   **@logix/core**: **运行时解释器**。负责执行逻辑 (`emit` -> `Effect`)。
*   **@logix/builder**: **生成时解释器**。负责录制逻辑并注入锚点 (`emit` -> `AST + Anchors`)。

两者 API 签名保持 1:1 一致，实现“写 Pattern 就像写业务代码”的同构体验。

## 2. 设计原则

1.  **Service Proxy (终极同构)**：Service 在 Builder 中表现为 Proxy，直接调用方法即可生成 AST，无需 `Flow.call`。
2.  **函数式风格 (Functional)**：废弃链式调用，采用与 Effect 一致的函数式 API。
3.  **锚点注入 (Anchor Injection)**：Builder 在生成 AST 时，自动计算节点 Hash 并生成 `@intent` 标记。

## 3. Flow API (Logic Intent)

### 3.1 核心定义

```typescript
import { Flow } from '@logix/builder';

const logic = Flow.define({
  id: 'submit-flow',
  trigger: Flow.onSignal('submit'),
  // 自动注入 __metadata: { source: { file, line, hash } }
  steps: [
    // ...
  ]
});
```

### 3.2 步骤 (Steps) - 与 Core 对齐

```typescript
import { OrderService } from './domain/order';

// 1. 调用服务 (直接调用 Proxy)
// 生成: { type: 'call', service: 'OrderService', method: 'create', args: ... }
// 锚点: // @intent-call: OrderService.create { hash: '...' }
OrderService.create({ amount: 100 })

// 2. 更新状态
Flow.set('ui.loading', true)

// 3. 发射信号
Flow.emit('toast', { msg: 'Success' })
```

### 3.3 结构化控制流 (Structures)

```typescript
// 分支 (对应 Effect.if)
// 锚点: // @intent-start: branch { hash: '...' }
Flow.if(
  '${result.success}',
  Flow.emit('toast', 'ok'), // @intent-slot: then
  Flow.emit('toast', 'fail') // @intent-slot: else
)
// 锚点: // @intent-end: branch

// 并行 (对应 Effect.all)
Flow.parallel([
  ApiA.fetch(),
  ApiB.fetch()
])

// 错误处理 (对应 Effect.catchAll)
Flow.try(
  RiskyService.doIt()
).catch('NetworkError', 
  Flow.emit('toast')
)
```

### 3.4 组合 (Composition)

```typescript
import { loginFlow } from './auth-pattern';

// 嵌入其他 Flow，实现逻辑复用
Flow.embed(loginFlow)
```

## 4. UI API (UI Intent)

```typescript
import { UI } from '@logix/builder';

// 定义组件
UI.Component('Button', {
  props: { type: 'primary' },
  emits: { onClick: 'signal:submit' }
})
```

## 5. Domain API (Domain Intent)

```typescript
import { Domain } from '@logix/builder';

// 1. 定义实体
export const User = Domain.Entity('User', {
  fields: {
    name: Domain.String(),
    age: Domain.Number().min(18)
  }
});

// 2. 定义服务 (返回 Proxy 对象)
export const UserService = Domain.Service('UserService', {
  methods: {
    create: Domain.Method({ args: [User], return: 'void' })
  }
});
```
