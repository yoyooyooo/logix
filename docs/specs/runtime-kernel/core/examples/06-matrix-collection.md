# Matrix Examples: Collection & Batch (S06-S09)

> **Focus**: 数组操作、通配符、批量更新

## S06: 行级联动 (Row Linkage)
**Trigger**: T3 (Collection) -> **Effect**: E1 (Sync Mutation)

```typescript
// 需求：修改任意行的 price，自动计算该行的 total
watchPattern('items.*.price', (price, { set }, ctx) => 
  Effect.gen(function*() {
    const index = ctx.params[0]; // 解析通配符
    const qty = yield* ctx.ops.getPath(`items[${index}].quantity`);
    yield* set(`items[${index}].total`, price * qty);
  })
)
```

## S07: 行级异步 (Row Async)
**Trigger**: T3 (Collection) -> **Effect**: E2 (Async Computation)

```typescript
// 需求：修改任意行的 productId，异步加载详情
watchPattern('items.*.productId', (pid, { set, services }, ctx) => 
  Effect.gen(function*() {
    if (!pid) return;
    const index = ctx.params[0];
    const api = yield* services.ProductService;
    const detail = yield* api.getDetail(pid);
    yield* set(`items[${index}].detail`, detail);
  }),
  // 注意：这里不能用 'switch'，否则第二行的请求会取消第一行的
  // 应该用 'concurrent' (默认) 或者 'merge'
  { concurrency: undefined }
)
```

## S08: 全选/反选 (Batch Update)
**Trigger**: T3 (Collection) -> **Effect**: E4 (Batch)

```typescript
watch('selectAll', (checked, { get, batch }) => 
  Effect.gen(function*() {
    const { items } = yield* get;
    // 使用 batch 暂停通知
    yield* batch((ops) => 
      Effect.forEach(items, (_, idx) => 
        ops.set(`items[${idx}].checked`, checked)
      )
    );
  })
)
```

## S09: 列表聚合 (Aggregation)
**Trigger**: T3 (Collection) -> **Effect**: E2 (Async/Sync Computation)

```typescript
// 需求：items 数组任意变化，重算总价
// 推荐：监听父节点，利用 Deep Equal 避免不必要的 summary 更新
watch('items', (items, { set }) => 
  Effect.gen(function*() {
    const total = items.reduce((sum, i) => sum + i.total, 0);
    yield* set('summary.total', total);
  }),
  { debounce: '50 millis' } // 稍微防抖一下，避免频繁重算
)
```
