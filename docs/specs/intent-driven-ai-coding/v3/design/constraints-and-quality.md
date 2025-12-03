---
title: 约束与质量意图 (Constraint & Quality Intent)
status: draft
version: 3
---

> 本文定义了 v2 架构下的非功能性需求模型：如何将性能、可靠性、安全等约束条件，编译为双运行时（Effect/Logix Engine）的具体策略。

## 1. 核心定义

Constraint & Quality Intent 回答：**“系统不仅要跑通，还要跑得好、跑得稳。”**

它通常不直接生成业务逻辑代码，而是作为**元数据 (Metadata)** 附着在 Flow、Data 或 Interaction 上，指导编译器生成特定的**中间件 (Middleware)** 或 **策略配置 (Policy)**。

## 2. 运行时分发策略

不同的 Runtime Target 对约束的实现方式完全不同。Intent 层统一描述约束，编译器负责分发。

### 2.1 通用约束 (Universal Constraints)

| 约束类型 | Intent 描述 | Effect Runtime 实现 | Logix Runtime 实现 |
| :--- | :--- | :--- | :--- |
| **超时 (Timeout)** | `timeout: '5s'` | `Effect.timeout('5s')` | `AbortController` / `RxJS.timeout` |
| **重试 (Retry)** | `retry: { times: 3 }` | `Effect.retry({ times: 3 })` | `retry` 中间件 / 策略 |
| **并发 (Concurrency)** | `concurrency: 'serial'` | `Effect.all(..., { concurrency: 1 })` | `switchMap` / `concatMap` |

### 2.2 特定运行时约束

#### A. 仅限 Effect Runtime (服务端)
- **事务 (Transaction)**：`transactional: true` -> 编译为 `Effect.scoped(db.transaction(...))`。
- **审计 (Audit)**：`audit: true` -> 编译为 `AuditLayer` 注入。
- **熔断 (Circuit Breaker)**：`circuitBreaker: { ... }` -> 编译为熔断器中间件。

#### B. 仅限 Logix Runtime (前端)
- **防抖 (Debounce)**：`debounce: '500ms'` -> 编译为 `flow.debounce(500)`。
- **节流 (Throttle)**：`throttle: '1s'` -> 编译为 `flow.throttle(1000)`。
- **乐观更新 (Optimistic)**：`optimistic: true` -> 编译为 Store 的乐观 UI 更新逻辑。

## 3. Schema 定义

```typescript
interface ConstraintIntent {
  // 运行时无关
  performance?: {
    timeout?: string
    concurrency?: number | 'unbounded'
  }
  reliability?: {
    retry?: { times: number; delay?: string }
    circuitBreaker?: boolean
  }
  
  // 前端特有
  interaction?: {
    debounce?: string
    throttle?: string
  }
  
  // 后端特有
  transaction?: boolean
  audit?: boolean
}
```

## 4. 编译实例

假设一个 Flow Intent 配置了 `retry: 3` 和 `audit: true`。

**Target: Effect Runtime**
```typescript
export const myFlow = Effect.gen(function*() {
  // ... 业务逻辑 ...
}).pipe(
  // 编译器自动包裹重试策略
  Effect.retry({ times: 3 }),
  // 编译器自动注入审计
  AuditService.middleware()
);
```

**Target: Logix Runtime**
```typescript
// 假设配置了 debounce
flow.fromState(s => s.searchKeyword).pipe(
  flow.debounce(500),
  flow.run(val => {
    // ...
  })
);
  // ...
}, { debounce: 500 }); // 编译器生成 options
```

## 5. UI 映射策略

在平台的“自由画布”视图中，Constraint Intent 表现为**属性配置面板 (Property Panel)**：

1.  **选中节点**：用户点击一个 Flow 节点或连线。
2.  **配置约束**：在右侧面板中勾选“开启重试”、“开启防抖”等选项。
3.  **可视化反馈**：节点上出现小图标（如时钟图标代表超时/防抖，盾牌图标代表安全/事务），直观展示当前的约束状态。
