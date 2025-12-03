#  Reactive 数据范式与统一数据流

**合并文档**：整合 `logix-reactive-schema.md` 和 `logix-reactive-module-integration.md` 的核心观点。

---

## 一、核心理念

### 1.1 Reactive Schema: The Logix v3 Data Paradigm

Reactive Schema 是对 State Schema 的语义扩展，将"数据来源"和"响应式规则"内嵌到 Schema 定义中。

**核心原则**：
- State 不再是"静止的快照"，而是"活跃的数据流源头"
- 从 Schema 元数据自动派生 Logic，而非手写监听逻辑

### 1.2 与 Query 的关系

Reactive Schema 是 Query Integration 的底层支撑：
- `Query.field` 本质上是 Reactive Schema 的一种特化形式
- `Schema.Loadable` / `Schema.Computed` 等都是 Reactive 能力的体现

---

## 二、Reactive Module 设计

### 2.1 Reactive DSL 形态

```typescript
const UserModule = Logix.Module('User', {
  state: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,

    // Computed: 派生字段
    fullName: Reactive.computed({
      deps: (state) => [state.firstName, state.lastName],
      derive: ([first, last]) => `${first} ${last}`
    }),

    // Query Field: 异步数据
    profile: Query.field({
      queryKey: (state) => ['user', state.userId],
      queryFn: ({ queryKey: [_, id] }) => UserApi.fetchProfile(id),
      enabled: (state) => !!state.userId
    }),

    // Effect: 副作用
    _trackView: Reactive.effect({
      trigger: (state) => state.currentPage,
      run: (page) => analytics.track('page_view', { page })
    })
  }),
  actions: { ... }
})
```

### 2.2 编译与运行时

**编译时**（`Module.live` 阶段）：
1. 扫描 Schema，识别 Reactive Annotation
2. 自动生成对应的 `ModuleLogic[]`
3. 注入到 Module Runtime

**运行时**：
- Computed: 监听 deps 变化 → 重新计算 → 更新 State
- Query Field: 监听 queryKey deps 变化 → 触发 fetch → 更新 data/isLoading/error
- Effect: 监听 trigger 变化 → 执行副作用（不更新 State）

---

## 三、统一数据范式

### 3.1 数据流分层

```
┌─────────────────────────────────────┐
│ Reactive Schema (蓝图层)             │
│ - Computed / Query / Effect         │
└──────────┬──────────────────────────┘
           │ 编译 (Module.live)
           ↓
┌─────────────────────────────────────┐
│ ModuleLogic[] (逻辑层)              │
│ - 自动生成的 Logic Effect            │
└──────────┬──────────────────────────┘
           │ 执行 (Runtime)
           ↓
┌─────────────────────────────────────┐
│ ModuleRuntime (状态层)              │
│ - SubscriptionRef + PubSub          │
└─────────────────────────────────────┘
```

### 3.2 与手写 Logic 的关系

**Reactive DSL 是语法糖，不是替代品**：

- Reactive DSL → 自动生成 `ModuleLogic[]`
- 手写 Logic: `Module.logic(($) => ...)`
- 两者最终都以 `ModuleLogic` 形式注入 Runtime

**逃逸通道**：
- 简单场景：使用 Reactive DSL
- 复杂场景：退回手写 Logic + Fluent DSL

---

## 四、与 Query Integration 的融合

### 4.1 Query.field 是 Reactive Schema 的特化

```typescript
// Layer 1: Query.field (声明式)
profile: Query.field({ ... })

// 等价于 Reactive DSL:
profile: Reactive.computed({
  deps: (state) => state.userId,
  derive: async (userId) => {
    const data = await fetchProfile(userId)
    return { data, isLoading: false, error: null }
  }
})
```

### 4.2 三层 API 与 Reactive 的对应

| Layer | API | Reactive 关系 |
|-------|-----|---------------|
| Layer 1 | `Query.field` | Reactive DSL 特化 |
| Layer 2 | `createQueryLogic` | 显式 Logic 工厂（不依赖 Schema） |
| Layer 3 | Manual | 手写 `Module.logic`（完全绕过 Reactive） |

---

## 五、设计权衡

### 5.1 优势

- **DX 提升**: 零样板代码，声明式表达
- **类型安全**: Schema 元数据提供类型推导
- **平台友好**: 易于静态分析和可视化

### 5.2 挑战

- **类型推导复杂**: 递归类型、Proxy Type
- **调试体验**: 隐式生成的 Logic 可能难以追踪
- **学习曲线**: 需要理解"Schema → Logic"的编译过程

### 5.3 缓解策略

- **渐进式引入**: 先支持简单场景（Computed/Query），再扩展复杂能力
- **DevTools 支持**: 可视化显示"哪些 Logic 是从 Schema 自动生成的"
- **文档分层**: 入门只讲 `Query.field`，高级部分才讲完整 Reactive DSL

---

## 六、路线图

### 短期 (v3.x)

- [ ] 实现 `Schema.Loadable` 基础能力
- [ ] 实现 `Query.field` (Layer 1)
- [ ] 验证 Schema 扫描与 Logic 注入机制

### 中期 (v3.x+)

- [ ] 实现 `Reactive.computed`
- [ ] 实现 `Reactive.effect`
- [ ] 补充完整 TypeScript 类型推导

### 长期 (v4.0+)

- [ ] 完整 Reactive DSL 生态
- [ ] 与 RxJS / Signal 等响应式库互操作
- [ ] Schema-First Studio 可视化编辑

---

## 七、相关文档

- [01-unified-api-design.md](./01-unified-api-design.md)
- [runtime-logix/core/02-module-and-logic-api.md](../../../runtime-logix/core/02-module-and-logic-api.md)

---

**合并来源**:
- `logix-reactive-schema.md` (Reactive Schema 数据范式)
- `logix-reactive-module-integration.md` (Reactive Module 统一数据范式)

**最后更新**: 2025-12-02
