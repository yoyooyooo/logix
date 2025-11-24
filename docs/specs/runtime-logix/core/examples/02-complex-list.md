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

## Store Implementation（对齐 v3 Logix API）

```typescript
const stateSchema = CartSchema;

const actionSchema = Schema.Union(
  Schema.Struct({ type: Schema.Literal('cart/toggleAll'), payload: Schema.Struct({ checked: Schema.Boolean }) }),
  Schema.Struct({ type: Schema.Literal('cart/toggleItem'), payload: Schema.Struct({ id: Schema.String }) })
  // ... 其他动作
);

const store = makeStore({
  stateSchema,
  initialState: { /* 按 CartSchema 填充初始值 */ },
  actionSchema,
  rules: api => [
    // 1. 行级联动 (Row-Level Linkage)
    // 监听 items 数组中单行的 price/quantity 变化，更新对应 total
    api.rule({
      name: 'RecalcRowTotalOnPriceChange',
      trigger: api.on.change(s => s.items),
      do: api.ops.edit(draft => {
        draft.items.forEach(item => {
          item.total = item.price * item.quantity;
        });
      })
    }),

    // 2. 聚合计算 (Aggregation)
    // 监听 items 数组变化，汇总选中行的金额与数量
    api.rule({
      name: 'RecalcSummaryOnItemsChange',
      trigger: api.on.change(s => s.items),
      do: api.ops.update(
        s => s.summary,
        (_, ctx) => {
          const items = ctx.value;
          const totalAmount = items.reduce((sum, item) =>
            item.checked ? sum + item.total : sum, 0
          );
          const totalCount = items.filter(i => i.checked).length;
          return { totalAmount, totalCount };
        }
      )
    }),

    // 3. 批量更新 (Batch Update)
    // 监听全选 Action，批量更新所有 items 的 checked 状态
    api.rule({
      name: 'ToggleAllItems',
      trigger: api.on.action('cart/toggleAll'),
      do: api.ops.edit((draft, ctx) => {
        const checked = ctx.payload.checked;
        draft.items.forEach(item => {
          item.checked = checked;
        });
      })
    })
  ]
});
```

## API Review

*   **与 DSL 一致**: 使用 `api.rule` + `api.on.change` / `api.on.action` + `api.ops.edit/update` 表达行级联动、聚合与批量更新，直接对应 Logic Rule DSL。  
*   **性能友好**: 聚合逻辑集中在单条规则中，通过一次 `update` 更新 summary，避免不必要的重复计算。  
*   **动作显式**: 全选操作通过 Typed Action `cart/toggleAll` 触发，便于在 DevTools 与 Trace 中统一观察。
