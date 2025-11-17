---
title: 数据/状态意图（Data & State Intent）
status: draft
version: 2
---

> 本文定义 Data & State 意图，并说明其与 Pattern.dataContract、状态管理规范的关系。

## 1. 定义

数据/状态意图回答：

- “系统中有哪些实体，它们的字段结构和含义是什么？”
- “界面上的表单/筛选字段如何映射到实体/接口？”
- “状态存在哪里，由谁负责维护生命周期？”

## 2. DataStateIntent Schema 草图

```ts
interface EntityFieldIntent {
  name: string
  type: 'string' | 'number' | 'enum' | 'date' | 'boolean' | string
  enumValues?: string[]
  required?: boolean
  desc?: string
}

interface EntityIntent {
  name: string
  fields: EntityFieldIntent[]
}

interface ApiIntent {
  name: string
  path: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | string
  params?: Record<string, string>
  returns?: string
}

interface StateSourceIntent {
  id: string
  kind: 'react-query' | 'zustand' | 'local'
  entity: string
  desc?: string
}

interface DataStateIntent {
  entities: EntityIntent[]
  apis: ApiIntent[]
  stateSources?: StateSourceIntent[]
}
```

在 IntentSpec v2 中：

```ts
interface IntentSpecV2 {
  // ...
  data?: DataStateIntent
}
```

## 3. Pattern 与 Data & State

很多 Pattern 会对数据/状态提出要求：

- `table-with-server-filter`：
  - 需要一个支持分页/筛选的 API（listOrders）;
  - 至少需要某些字段（id/status/...）；
  - 列表数据可由 React Query 管理，筛选条件通过 Store 管理。

在 PatternSpec v2 中，这些要求可通过 `dataContract` 和 `paramsSchema` 表达：

```yaml
dataContract:
  entities:
    - Order
  requiredFields:
    - id
    - status
  apis:
    - listOrders
```

## 4. 状态管理与 best-practice

Data & State 意图与 best-practice 仓库中的内容强相关：

- 状态来源：
  - 服务器数据：React Query（查询 key 约定/缓存策略）；
  - 客户端 UI 状态：Zustand store + slices；
  - 局部状态：useState/useReducer。
- v2 要求：
  - 在 DataStateIntent 中显式声明 stateSources；
  - Pattern/Plan/Template 在生成代码时遵守状态管理约定（不随意引入新模式）。

## 5. 边界与反例：避免 Data & State 变成实现细节垃圾场

Data & State Intent 应聚焦“业务数据长什么样、放在哪一类状态源”，避免直接描述具体实现。

### 5.1 本层允许/不允许的内容

- 允许（What）：
  - 业务实体及字段结构（订单、任务、指标等），字段含义与校验规则；
  - 表单/筛选字段如何映射到实体/接口（哪些字段可筛选、是否必填等）；
  - 状态来源类型：服务器数据/客户端共享状态/局部 UI 状态（react-query/zustand/local 等）。
- 不允许（How）：
  - 具体 Hook 名称，例如 `useOrderListQuery`、`useOrderStore`；
  - 具体 state key 路径，例如 `orderStore.filters.status`；
  - React Query key 细节（`['orders', filters]` 等）；
  - adapter/selector 实现细节。

示意对比：

```ts
// ✅ Good：Intent 层 Data & State
entities: [
  {
    name: 'Order',
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'status', type: 'enum', enumValues: ['PENDING', 'PAID', 'SHIPPED'] },
    ],
  },
]
apis: [{ name: 'listOrders', path: '/api/orders', method: 'GET' }]
stateSources: [
  { id: 'orderList', kind: 'react-query', entity: 'Order' },
  { id: 'orderFilters', kind: 'zustand', entity: 'Order' },
]

// ❌ Bad：实现细节泄漏到 Intent
stateSources: [
  {
    id: 'orderList',
    kind: 'react-query',
    entity: 'Order',
    hookName: 'useOrderListQuery', // ← 实现细节
    queryKey: "['orders', filters]", // ← 实现细节
    storePath: 'orderStore.list', // ← 实现细节
  },
]
```

这些实现信息应当由 best-practice 规范 + Template/Plan 生成或约束，而不是写死在 Intent 中。

### 5.2 Minimal Intent 建议

作为经验规则，一个 feature 的 DataStateIntent 至少应包含：

- 1 个以上实体（包含核心字段与描述）；
- 该 feature 涉及的主要 API（list/detail/update/export 等）；
- 至少列出主列表/主要表单使用的 stateSource 类型。

其它细节可以随着需求迭代逐步补充，保持核心结构稳定即可。

## 6. LLM 与 Data & State

LLM 可在此层做：

- 根据实体与 API 意图自动生成 paramsSchema（包括表单/筛选字段）；
- 建议合理的 stateSources（例如列表数据用 React Query，筛选条件用 Zustand）；
- 根据 Quality/Constraints 意图提出数据层优化建议（例如加上分页、限制返回字段等）。
