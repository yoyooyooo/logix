---
title: '@logix/query 集成策略 (Integration Strategies v3)'
status: definitive.v3
version: 3.0.1
related:
  - 01-unified-api-design.md
---

# @logix/query 集成策略 (v3)

**核心原则**：

1. **Helper First**: 优先使用 `Query.query($, ...)` Helper，它自动管理 Scope。
2. **Effect Native**: 如果需要手动管理资源（如 Observer），直接使用 `Effect.addFinalizer` 或 `Lifecycle` 工具。

---

## 1. 标准集成模式 (The Standard Way)

### 1.1 环境注入 (Infra Layer)

在应用根部注入 `QueryClient`。

```ts
// src/infra.ts
import { Query } from '@logix/query'
import { QueryClient } from '@tanstack/query-core'

const client = new QueryClient()
export const AppLayer = Logix.Runtime.make(RootModule, {
  layer: Query.layer(client), // ✅ 注入 Service
})
```

### 1.2 业务逻辑 (Logic Layer)

使用 Helper 实现“响应式查询”。

```ts
// features/list/List.logic.ts
import { Query } from '@logix/query'

export const ListLogic = ListModule.logic(($) =>
  Query.query($, {
    target: 'listData', // 自动管理 data/isLoading/error

    // 响应式 Key：依赖 filters/pagination
    key: (s) => ['list', s.filters, s.pagination],

    fn: (key) => ListApi.search(key[1]), // key[1] 是自动推导的 filters

    // 内置防抖
    debounce: 300,
  }),
)
```

---

## 2. 高级集成模式 (Advanced Patterns)

### 2.1 手动控制 (Manual Control via Scope)

当需要手动管理 `QueryObserver` 这种长生命周期资源时，利用 Effect Scope。

```ts
import { Lifecycle } from '@logix/core'

export const ManualLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    const client = yield* $.use(QueryClientTag)

    // ✅ 使用 Effect scope 自动管理销毁
    const observer = new QueryObserver(client, {
      queryKey: ['test'],
      queryFn: fetchTest,
    })

    // 挂载清理钩子 (等价于 old $.lifecycle.onDestroy)
    yield* Effect.addFinalizer(() => Effect.sync(() => observer.destroy()))

    // 或者使用 Logix Lifecycle 工具
    yield* Lifecycle.onInit(Effect.log('Manual Logic Initialized'))

    // ... 逻辑 ...
  }),
)
```

### 2.2 Domain Module Aggregation (领域模块聚合)

在 V3 中，聚合多个子模块（如 UserDomain 包含 Detail 和 Orders）应遵循 **"Physical Aggregation + Logical Coordination"** 模式。

#### 1. Physical Aggregation (运行时组合)

使用 `imports` 声明物理依赖，确保子模块随 Domain 一起启动。

```ts
// features/user/impl.ts
export const UserDomainImpl = UserDomain.make({
  // ✅ Physical: 声明子模块，Runtime 会自动启动它们
  imports: [UserDetailImpl, UserOrdersImpl],
})
```

#### 2. Logical Coordination (逻辑协作)

在 Logic 中使用 `$.use(ModuleTag)` 获取子模块的句柄 (**Handle**)，进行状态读取或动作派发。

```ts
// features/user/logic.ts
export const UserDomainLogic = UserDomain.logic(($) =>
  Effect.gen(function* () {
    // ✅ Logical: 获取子模块句柄 (类似于 React useContext)
    const detail = yield* $.use(UserDetailModule)
    const orders = yield* $.use(UserOrdersModule)

    // 场景：联动刷新
    // 当 Domain 收到 refresh 动作 -> 触发子模块重新 Fetch
    yield* $.onAction('refresh').pipe(
      $.flow.run(() => Effect.all([detail.dispatch({ _tag: 'fetch' }), orders.dispatch({ _tag: 'fetch' })])),
    )
  }),
)
```

### 2.3 Cookbook: Cascading Selects (省市区联动)

针对经典的“省市区联动”场景，Fluent Pipe 模式展现了惊人的优雅性：依靠 `pipe` 的顺序执行，我们可以像写线性逻辑一样定义具有依赖关系的字段，且类型自动推导。

```ts
// 🌟 The Chain of Dependencies
const AddressState = Schema.Struct({
  // 0. Base Shape (Optional)
  selectedProvinceId: Schema.String,
  selectedCityId: Schema.String,
}).pipe(
  // 1. Provinces (Independent)
  Query.attach('provinceList', {
    key: () => ['provinces'], // No dependencies
    fn: fetchProvinces,
  }),

  // 2. Cities (Dependent on State)
  Query.attach('cityList', {
    // `s` here includes provinceList (though not needed for key)
    // and base fields (selectedProvinceId)
    key: (s) => (s.selectedProvinceId ? ['cities', s.selectedProvinceId] : null),
    fn: (key) => fetchCities(key[1]),
  }),

  // 3. Districts (Dependent on City)
  Query.attach('districtList', {
    // `s` includes cityList and selectedCityId
    key: (s) => (s.selectedCityId ? ['districts', s.selectedCityId] : null),
    fn: (key) => fetchDistricts(key[1]),
  }),
)

export const AddressModule = Logix.Module.make('Address', { state: AddressState })
```

// 🌟 The Interaction Logic (Reset Downstream)
// Schema 定义了"数据怎么来"，Logic 定义了"状态怎么变"
export const AddressLogic = AddressModule.logic(($) => Effect.all([
// 监听 Province 变化 -> 重置 City & District
$.flow.fromState(s => s.selectedProvinceId).pipe(
$.flow.changes(),
$.flow.runLatest(() => $.state.update(s => ({
...s,
selectedCityId: null,
selectedDistrictId: null, // 级联重置
// cityList 依赖 Key 变化会自动重发，无需手动清空，
// 但如果想 UI 立即白屏，也可以在这里重置 cityList: AsyncData.initial()
})))
),

// 监听 City 变化 -> 重置 District
$.flow.fromState(s => s.selectedCityId).pipe(
$.flow.changes(),
$.flow.runLatest(() => $.state.update(s => ({
...s,
selectedDistrictId: null
})))
)
]));

```

**Design Philosophy**:
- **Schema (Fluet Pipe)**: 负责声明 "Data Graph" (依赖关系图)。
- **Logic**: 负责维护 "State Consistency" (状态一致性)。
这种分离确保了即使 `selectedProvinceId` 是从 URL 或 LocalStorage 恢复的，Schema 定义的数据获取流 (Fetch Logic) 依然能正确工作，而交互逻辑则专注于用户行为带来的副作用。

---

## 3. 迁移与兼容性

对于旧有的 `$.lifecycle` 代码，迁移非常简单：

- **Old**: `yield* $.lifecycle.onInit(eff)`
- **New**: `yield* Lifecycle.onInit(eff)`

这使得核心 API (`$`) 更加轻量，仅关注状态与动作。
```
