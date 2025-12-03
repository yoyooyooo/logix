---
title: "Unified Data Vision: Schema-First, Relations & External Sources"
status: draft
version: 1.0
layer: Vision
value: vision
priority: later
related:
  - 01-unified-api-design.md
  - 04-reactive-paradigm.md
---

# Unified Data Vision: The "State Graph" Paradigm

> **发散思考 (Brainstorming)**: 超越单纯的 "Query Integration"，探索 **Schema-First** 的终极形态 —— 将 Logix Module 视为 **"State ORM"** 或 **"Data Graph"** 节点。

## 1. 核心洞察：Schema as the Single Source of Truth

如果我们贯彻 "Schema-First"，那么 Schema 不应仅仅描述 **"数据长什么样" (Shape)**，还应描述 **"数据从哪来" (Source)** 和 **"数据和谁有关" (Relation)**。

当前的 `Query.field` 只是这个愿景的一个特例（Source = HTTP GET）。我们可以将其泛化为 **"Resource Field"** 模式。

### 1.1 泛化公式

$$
\text{Field} = \text{Shape} + \text{Source Metadata}
$$

在运行时，`Module.live` 充当 "Compiler"，读取 Metadata 并自动挂载对应的 "Data Pump" (Logic)。

## 2. 三大维度的统一 (The Trinity of Data)

我们可以将所有字段分为三类，并在 Schema 中统一表达：

### 2.1 内部计算 (Computed / Derived)
*   **定义**: 依赖当前 Module 的其他字段计算得出。
*   **API**: `Computed.field(deps, calculator)`
*   **本质**: 同步或异步的纯函数映射。

### 2.2 外部数据源 (External Sources)
*   **定义**: 数据来自 Module 外部（服务端、设备、浏览器环境）。
*   **API**: `Source.field(adapter)`
*   **变体**:
    *   **Pull (Query)**: `Query.field(...)` -> HTTP/DB
    *   **Push (Stream)**: `Socket.field(...)` -> WebSocket/SSE
    *   **Sync (Storage)**: `Storage.field(...)` -> LocalStorage/IndexedDB
    *   **Environment**: `Env.field(...)` -> Window Size, Geolocation

### 2.3 关联关系 (Relations / Links)
*   **定义**: 数据来自 *另一个 Module* 的 State。
*   **API**: `Link.to(TargetModule, selector)`
*   **本质**: 跨 Module 的响应式依赖（Foreign Key Resolution）。

## 3. 设想：Schema DSL 2.0

```typescript
import { Schema } from 'effect'
import { Logix, Query, Link, Computed, Socket } from '@logix/core'

const UserState = Schema.Struct({
  // 1. 基础字段 (Raw Data)
  id: Schema.String,
  groupId: Schema.String,

  // 2. 外部数据源 (Pull - Query)
  // "我是从 HTTP 拿回来的 Profile"
  profile: Query.field({
    deps: (s) => [s.id],
    loader: ([id]) => api.getUser(id)
  }),

  // 3. 外部数据源 (Push - Socket)
  // "我是实时更新的在线状态"
  status: Socket.field({
    topic: (s) => `user:${s.id}:status`,
    initial: 'offline'
  }),

  // 4. 关联字段 (Relation - Link)
  // "我的 Group 信息来自 GroupModule"
  // 运行时自动订阅 GroupModule.state 并在 groupId 变化时更新
  group: Link.to(GroupModule, {
    key: (s) => s.groupId,
    // 类似于 SQL Join 或 GraphQL Resolver
    resolve: (groupId, groupModuleState) => groupModuleState.groups[groupId]
  }),

  // 5. 计算字段 (Computed)
  // "我是基于上述所有信息推导出的展示名"
  displayName: Computed.field({
    deps: (s) => [s.profile, s.group],
    derive: ([profile, group]) =>
      `${profile.name} @ ${group?.name || 'No Group'}`
  })
})

// 6. 甚至支持双向绑定/持久化
const SettingsState = Schema.Struct({
  theme: Storage.field({
    key: 'app-theme',
    default: 'dark'
  })
})
```

## 4. 架构深意 (Architectural Implications)

### 4.1 "虚实分离" 的极致
*   **Schema (虚)**: 描述了完整的 **Data Graph**。它是一张静态的地图。
*   **Runtime (实)**: `Module.live` 实例化时，根据地图：
    *   为 `Query` 启动 Fetcher Fiber。
    *   为 `Socket` 建立 Connection。
    *   为 `Link` 建立跨 Module 订阅。
    *   为 `Computed` 建立 Memoized Stream。

### 4.2 统一的 "Resource State" 容器
所有上述 "智能字段"，在 State 中最终都落地为统一的形状（Resource State）：

```typescript
type ResourceState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  updatedAt: number
  // ... 可能还有 source metadata
}
```

这样 UI 层可以统一处理 Loading/Error，而不用关心数据是 HTTP 来的，还是 WebSocket 推送的，还是从别的 Module 算出来的。

### 4.3 对 "关联字段" (Relations) 的深入思考
这是最复杂也最迷人的部分。如果 Logix 能像 ORM 一样处理 Module 间的关联：

*   **One-to-One**: `Link.to(OtherModule)`
*   **One-to-Many**: `Link.hasMany(OtherModule)` ? (可能太复杂，暂不考虑)
*   **Lazy Loading**: 关联字段是否支持 Lazy？访问时才订阅？

**挑战**: 循环依赖。如果 A Link B，B Link A，初始化顺序如何保证？
**解法**:
1.  **Late Binding**: 运行时解析 Link，允许 `null` 中间态。
2.  **Explicit Dependency**: 在 `Logix.app` 层显式声明拓扑顺序（DAG）。

### 4.4 与现有 Links 的关系 (The Evolution)

现有的 `Link.make` (原 Orchestrator / 早期 `Logix.Link`) 是 **"命令式胶水层"**，而 `Link.to` 是其 **"声明式投影"**。

| 特性 | Link.make (Existing) | Schema Link (Proposed) |
| :--- | :--- | :--- |
| **定位** | 独立的胶水逻辑 (Imperative) | State 内部的关联定义 (Declarative) |
| **定义位置** | `Logix.app` 或独立文件 | `Module.state` Schema 内部 |
| **侧重** | 流程编排 (Process Orchestration) | 数据依赖 (Data Dependency) |
| **运行时** | `Link.make({ modules }, logic)` | 编译为隐式的 `Link` 或 `Logic` |

**演进路线**:
1.  **Layer 3 (Manual)**: 手写 `Link.make(...)` 或在 Logic 中使用 `$.use(OtherModule)`。
2.  **Layer 1 (Schema)**: 在 Schema 中定义 `Link.to`，运行时自动生成等价的 Logic。

这意味着 **Schema Link 本质上就是 `$.use` + `$.on` 的语法糖**。

- `Link.make` 适合 **"第三方视角"** 的编排（A 和 B 都不知情）。
- `$.use` 适合 **"第一方视角"** 的依赖（A 明确依赖 B）。
- `Link.to` 是 **"第一方视角"** 的声明式写法。


## 5. 总结

用户的 "发散" 请求指向了一个更宏大的图景：**Logix 不仅仅是状态管理库，它是应用的数据操作系统 (Data OS)**。

*   **Schema** 是文件系统表 (FAT)。
*   **Module** 是进程。
*   **Query/Socket/Link** 是 I/O 驱动。

在这个愿景下，TanStack Query 只是众多 "I/O 驱动" 中的一个（HTTP Driver）。我们设计的 API 应该足够通用，能容纳这些不同的驱动。
