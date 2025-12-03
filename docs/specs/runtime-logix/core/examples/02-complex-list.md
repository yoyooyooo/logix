# Example: Complex List Logic

> **Scenario**: 购物车
> **Features**: 行级联动、聚合计算、批量更新
> **Note**: 本示例基于 v3 Effect-Native Logix 写法（`Logix.ModuleShape` + Bound API `$` + `Flow / Control`）。当前 PoC 中，实际代码应在对应 Module 上通过 `Module.logic(($)=>...)` 获取 `$`。

## Schema Definition

```typescript
const CartItemSchema = Schema.Struct({
  id: Schema.String,
  price: Schema.Number,
  quantity: Schema.Number,
  total: Schema.Number,
  checked: Schema.Boolean
});

const CartStateSchema = Schema.Struct({
  items: Schema.Array(CartItemSchema),
  summary: Schema.Struct({
    totalAmount: Schema.Number,
    totalCount: Schema.Number
  }),
  isAllChecked: Schema.Boolean
});

const CartActionSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("cart/toggleAll")
  }),
  Schema.Struct({
    type: Schema.Literal("cart/toggleItem"),
    payload: Schema.Struct({ id: Schema.String })
  })
  // ... 其他动作
);

type CartShape = Logix.ModuleShape<
  typeof CartStateSchema,
  typeof CartActionSchema
>;
```

## Logic Implementation（v3 Effect-Native）

```typescript
// 概念上，这里的 `$Cart` 表示针对 CartShape 预绑定的 Bound API。
export const CartLogic: Logic.Of<CartShape> =
  Effect.gen(function* (_) {
    const items$ = $.flow.fromState((s) => s.items);
    const toggleAll$ = $.flow.fromAction(
      (a): a is { type: "cart/toggleAll" } => a.type === "cart/toggleAll"
    );

    // 1. 行级联动：price / quantity 变化时更新对应 total
    const recalcRowTotals = items$.pipe(
      $.flow.run(
        $.state.mutate((draft) => {
          draft.items.forEach((item) => {
            item.total = item.price * item.quantity;
          });
        })
      )
    );

    // 2. 聚合计算：监听 items 数组变化，汇总选中行的金额与数量
    const recalcSummary = items$.pipe(
      $.flow.run(
        $.state.update((prev) => {
          const totalAmount = prev.items.reduce(
            (sum, item) => (item.checked ? sum + item.total : sum),
            0
          );
          const totalCount = prev.items.filter((i) => i.checked).length;

          return {
            ...prev,
            summary: { totalAmount, totalCount }
          };
        })
      )
    );

    // 3. 批量更新：监听全选 Action，批量更新所有 items 的 checked 状态
    const toggleAllItems = toggleAll$.pipe(
      $.flow.run(
        $.state.mutate((draft) => {
          const nextChecked = !draft.isAllChecked;

          draft.items.forEach((item) => {
            item.checked = nextChecked;
          });

          draft.isAllChecked = nextChecked;
        })
      )
    );

    yield* Effect.all([recalcRowTotals, recalcSummary, toggleAllItems]);
  })
);
```

## API Review

*   **与 Core 一致**: 通过 `Logix.ModuleShape` + Bound API `$` + `Flow.Api` 表达行级联动、聚合与批量更新，直接对应 `logix-v3-core` 中的运行时原语。
*   **性能友好**: 聚合逻辑集中在单条 `state.update` 中完成，通过一次写入更新 summary，避免重复计算和多次渲染。
*   **动作显式**: 全选操作通过 Typed Action `cart/toggleAll` 触发，配合 `flow.fromAction` 进行监听，便于在 DevTools 与 Trace 中统一观察来源。
