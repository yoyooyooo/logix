# Core Scenarios (核心场景压力测试)

> **Status**: Draft
> **Purpose**: 用于验证 Kernel API 设计是否完备，能否覆盖常见的业务复杂度。

## 1. 基础联动 (Basic Linkage)

### Scenario 1.1: 同步重置 (Sync Reset)
**描述**: 当用户改变 `country` 时，必须立即重置 `province` 和 `city` 为空。
**API 验证**:
```typescript
watch('country', (country, { set }) => 
  Effect.all([
    set('province', null),
    set('city', null)
  ])
)
```

### Scenario 1.2: 条件更新 (Conditional Update)
**描述**: 当 `age` 变化时，如果小于 18，强制将 `isAdult` 设为 false；否则设为 true。
**API 验证**:
```typescript
watch('age', (age, { set }) => 
  set('isAdult', age >= 18)
)
```

## 2. 异步副作用 (Async Side Effects)

### Scenario 2.1: 自动补全 (Auto-Complete)
**描述**: 当 `zipCode` 输入超过 5 位时，调用 API 获取城市信息并回填。需要防抖 500ms，且如果用户快速输入，只处理最后一次请求（SwitchMap）。
**API 验证**:
```typescript
watch('zipCode', (zip, { set, services }) => 
  Effect.gen(function*() {
    if (zip.length < 5) return;
    const api = yield* services.GeoService;
    const city = yield* api.fetchCity(zip);
    yield* set('city', city);
  }),
  { debounce: '500 millis', concurrency: 'restart' } // 'restart' implies switchMap behavior
)
```

### Scenario 2.2: 校验与错误 (Validation & Error)
**描述**: 当 `username` 变化时，调用 API 检查是否重名。如果重名，设置错误状态。如果 API 失败，重试 3 次。
**API 验证**:
```typescript
watch('username', (name, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.UserApi;
    const exists = yield* api.checkExists(name);
    if (exists) {
      yield* set('errors.username', 'Already taken');
    } else {
      yield* set('errors.username', null);
    }
  }).pipe(
    Effect.retry({ times: 3 }) // Effect 原生重试
  ),
  { debounce: '300 millis' }
)
```

## 3. 复杂数据结构 (Complex Data Structures)

### Scenario 3.1: 数组项联动 (Array Item Linkage)
**描述**: 在一个商品列表中，当修改第 N 行的 `quantity` 或 `price` 时，自动计算该行的 `total`。
**API 验证**:
*挑战*: 如何监听数组中任意一项的变化？
*解法 (v1 Standard)*: **监听整个数组**。虽然这看起来“重”，但对于大多数列表（<1000 items）来说，全量重算的开销是可以接受的，且逻辑最简单。
```typescript
// v1 推荐写法：监听父节点
watch('items', (items, { set }) => 
  Effect.gen(function*() {
    // 全量重算 total
    const newItems = items.map(item => ({
      ...item,
      total: item.quantity * item.price
    }));
    // 更新整个数组 (注意：set 必须做 Deep Equal，避免死循环)
    yield* set('items', newItems);
  })
)
```
> **Note**: 通配符监听 (`items.*.quantity`) 适用于「大规模行级联动」等进阶场景，属于 Kernel 的集合能力范畴。当前示例优先演示「整体数组更新」这一更易理解、实现成本更低的写法。

## 4. 生命周期 (Lifecycle)

### Scenario 4.1: 初始化加载 (Init Load)
**描述**: Store 创建时，自动从 API 加载初始数据。
**API 验证**:
*挑战*: `watch` 是监听变化，如何处理初始化？
*解法 (v1 Standard)*: 使用 `immediate: true` 选项。
```typescript
// v1 标准写法
watch('userId', (id, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.UserApi;
    const data = yield* api.fetchUserData(id);
    yield* set('userData', data);
  }), 
  { immediate: true } // Store 创建时立即触发一次
)
```

## 5. 外部交互 (External Interaction)

### Scenario 5.1: WebSocket 实时更新
**描述**: 监听 WebSocket 的 `price_update` 事件，实时更新 Store 中的 `stock.price`。
**API 验证**:
```typescript
// WebSocket 实时更新适用于「外部事件驱动」场景，属于 Kernel 的外部源集成能力。
on(services.WebSocket.priceStream, (price, { set }) => 
  set('stock.price', price)
)
```

---

## 能力对照表 (Capability Overview)

> 本表用于概览 Kernel 在不同能力域上的支持情况，区分「常见场景」与「进阶场景」，而非划分版本或阶段。

| 能力域 (Capability) | 典型场景 | 说明 |
| :--- | :--- | :--- |
| **Path System** | 精确路径 (`a.b[0]`) | 覆盖大部分表单与配置场景的常见需求。 |
| **Wildcard & Collections** | `items.*.field` | 针对大规模列表/字典的行级联动，属于进阶能力。 |
| **Multi-Path Watch** | `['startDate', 'endDate']` | 多字段联合约束与聚合，常见于日期区间、过滤条件。 |
| **Array Update Strategy** | 整体更新 vs 行级更新 | 在性能与可读性之间权衡，推荐优先整体更新，再按需使用批处理。 |
| **Init Logic** | `immediate: true` | Store 创建即加载初始数据的标准写法。 |
| **External Source** | `on` / `mount` | WebSocket、轮询、第三方缓存等外部源接入能力。 |
| **Dynamic Logic** | `addRule` / `removeRule` | 运行时注入/撤销规则，支撑 AI/配置中心动态扩展逻辑。 |
