---
title: 数据/状态意图 (Data & State Intent)
status: draft
version: 3
---

> 本文定义了 v2 架构下的数据模型：作为业务实体的单一事实源，为 Signal Payload 提供类型定义，并映射为 Logix Store 的状态结构。

## 1. 核心定义

Data & State Intent 回答：**“系统中有哪些业务实体？它们的状态如何流转？”**

它不仅仅是数据库表结构的映射，更是**全链路类型系统 (Type System)** 的基石。从 UI 组件到 Signal Payload，再到 Logix Store 和后端 API，所有数据结构都必须引用 Data Intent 中定义的 Schema。

### 1.1 关键特性

1.  **Schema First**：所有数据交互（API、Signal、Store）必须先定义 Schema。消灭 `any` 和隐式类型。
2.  **Signal 类型源**：Signal Intent 中的 `payloadSchemaId` 直接引用本层的 Entity 定义。
3.  **Logix 映射**：Entity Schema 直接映射为 Logix Store 的 `schema` 和 `initialValues`。

## 2. 模型详解

```typescript
interface DataStateIntent {
  entities: EntityIntent[]
  apis: ApiIntent[]
  stateSources?: StateSourceIntent[]
}

interface EntityIntent {
  id: string
  name: string
  description?: string
  fields: EntityFieldIntent[]
  
  // 验证规则 (Zod/Effect Schema)
  validation?: {
    rule: string // e.g. "email", "min(10)"
    message?: string
  }[]
}

interface EntityFieldIntent {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object'
  required?: boolean
  defaultValue?: any
  enumValues?: string[]
  children?: EntityFieldIntent[] // 嵌套结构
}
```

## 3. 全链路类型映射

Data Intent 是整个系统的“类型字典”。以下是它在不同层级的落点：

### 3.1 Signal Payload (通信契约)

```typescript
// Intent
Signal: { name: "submitOrder", payloadSchemaId: "OrderInput" }
Data: { id: "OrderInput", fields: [...] }

// Code (TypeScript)
interface OrderInput { ... }
type SubmitOrderSignal = { type: 'submitOrder', payload: OrderInput }
```

### 3.2 Logix Store (前端状态)

```typescript
// Intent
StateSource: { kind: "logix-engine", entityId: "OrderForm" }

// Code (Logix Store)
const orderStore = makeStore({
  schema: OrderFormSchema, // 直接使用 Effect Schema
  initialValues: { ... },
  ...
})
```

### 3.3 API Service & Layer (服务层)

Data Intent 中的 `apis` 定义不仅生成 DTO，还驱动整个服务层的生成：

1.  **Interface (Domain)**：生成 `OrderApi` Tag，定义 `create: (input: OrderInput) => Effect<Order>`。
2.  **Implementation (Infrastructure)**：生成 `OrderApiLive` Layer，内部使用 `Effect Http` 实现具体的 RESTful 调用。
3.  **Repository (Optional)**：对于复杂的聚合根实体，可生成 `OrderRepository` 接口，封装底层的多个 API 调用或本地缓存策略。

```typescript
// Intent
Api: { name: "createOrder", inputSchemaId: "OrderInput" }

// Code: domain/OrderApi.ts
export class OrderApi extends Context.Tag("OrderApi")<OrderApi, { 
  create: (input: OrderInput) => Effect.Effect<Order> 
}>() {}

// Code: infrastructure/OrderApiLive.ts
export const OrderApiLive = Layer.effect(OrderApi, Effect.gen(function*() {
  const client = yield* Http.Client;
  return { 
    create: (input) => client.post('/orders', { body: input })...
  };
}));
```

## 4. UI 映射策略

在平台的“自由画布”视图中，Data Intent 表现为**实体节点 (Entity Node)**：

1.  **可视化 ER 图**：展示实体及其字段，支持拖拽建立关联关系（如 `Order` -> `OrderItem`）。
2.  **Schema 绑定**：
    - 用户在画布上画一个“表单”，可以将其绑定到某个“实体节点”。
    - 绑定后，表单字段自动根据实体字段生成（Label, Type, Validation）。

## 5. 最佳实践

- **读写分离**：建议为“读取（View）”和“写入（Input）”定义不同的 Entity Schema（如 `Order` vs `OrderInput`）。
- **原子化**：尽量将 Schema 定义为原子的、可复用的片段，通过组合构建复杂对象。
