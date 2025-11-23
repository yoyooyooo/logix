# Example: Complex List Logic

> **Scenario**: 购物车
> **Features**: 行级联动、聚合计算、批量更新

## Schema Definition

```typescript
const CartItemSchema = Schema.Struct({
  id: Schema.String,
  price: Schema.Number,
  quantity: Schema.Number,
  total: Schema.Number,
  checked: Schema.Boolean
});

const CartSchema = Schema.Struct({
  items: Schema.Array(CartItemSchema),
  summary: Schema.Struct({
    totalAmount: Schema.Number,
    totalCount: Schema.Number
  }),
  isAllChecked: Schema.Boolean
});
```

## Store Implementation

```typescript
const store = makeStore({
  schema: CartSchema,
  initialValues: { ... },

  logic: ({ watch, watchPattern }) => [
    
    // 1. 行级联动 (Row-Level Linkage)
    // 监听任意行的 price 或 quantity 变化，计算该行的 total
    // 使用 watchPattern 配合通配符
    watchPattern('items.*.price', (price, { set }, ctx) => 
      Effect.gen(function*() {
        // ctx.params 解析出 index
        const index = ctx.params[0]; // e.g. "0"
        const qty = yield* ctx.ops.getPath(`items[${index}].quantity`);
        yield* set(`items[${index}].total`, price * qty);
      })
    ),
    
    // 同理监听 quantity
    watchPattern('items.*.quantity', (qty, { set }, ctx) => 
      Effect.gen(function*() {
        const index = ctx.params[0];
        const price = yield* ctx.ops.getPath(`items[${index}].price`);
        yield* set(`items[${index}].total`, qty * price);
      })
    ),

    // 2. 聚合计算 (Aggregation)
    // 监听整个 items 数组的变化，计算 summary
    // 注意：这里利用了 set 的 Deep Equal 特性，如果 summary 没变，不会触发更新
    watch('items', (items, { set }) => 
      Effect.gen(function*() {
        const totalAmount = items.reduce((sum, item) => 
          item.checked ? sum + item.total : sum, 0);
        const totalCount = items.filter(i => i.checked).length;
        
        yield* set('summary', { totalAmount, totalCount });
      })
    ),

    // 3. 批量更新 (Batch Update)
    // 监听全选按钮，批量更新所有 items 的 checked 状态
    watch('isAllChecked', (checked, { get, batch }) => 
      Effect.gen(function*() {
        const { items } = yield* get;
        
        // 使用 batch 暂停通知
        yield* batch((ops) => 
          Effect.forEach(items, (_, index) => 
            ops.set(`items[${index}].checked`, checked)
          )
        );
      })
    )
  ]
});
```

## API Review

*   **通配符**: `watchPattern` 配合 `ctx.params` 完美解决了“知道哪一行变了”的问题。
*   **聚合**: 监听父节点 `items` 是最简单的聚合方式，配合 Deep Equal 可以保证性能。
*   **批处理**: `batch` API 让“全选”操作变得安全且高效，避免了 N 次重渲染。
