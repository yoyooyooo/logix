# Matrix Examples: Collection & Batch (v3 Standard Paradigm)

> **Focus**: 数组操作、行级联动、聚合计算、批量更新  
> **Note**: 本文示例展示了 v3 Effect-Native 标准范式。所有集合操作都通过监听父级集合，并使用 `state.mutate` 进行原子化更新。当前 PoC 中，实际代码应在对应 Module 上通过 `Module.logic(($)=>...)` 获取 `$`。

## S06 & S09: 行级联动与列表聚合 (Row Linkage & Aggregation)

**v3 标准模式**: 监听整个 `items` 数组的变化。在 `flow.run` 中，使用一次 `state.mutate` 同时完成所有派生状态（行内 `total` 和整体 `summary`）的计算，以保证数据一致性并获得最佳性能。

```typescript
// 概念上，这里的 `$Cart` 表示针对 CartShape 预绑定的 Bound API，实际 PoC 中通常由对应 Module 注入。
const aggregationLogic: Logic.Of<CartShape> =
  Effect.gen(function* (_) {
    const items$ = $Cart.flow.fromState(s => s.items);

    const calculationEffect = $Cart.state.mutate(draft => {
      let totalAmount = 0;
      // 1. 行级联动：计算每行的 total
      draft.items.forEach(item => {
        item.total = item.price * item.quantity;
        // 2. 聚合计算：累加总价
        if (item.checked) {
          totalAmount += item.total;
        }
      });
      draft.summary.totalAmount = totalAmount;
    });

    yield* items$.pipe(
      $Cart.flow.debounce(50), // 轻微防抖以应对连续的行操作
      $Cart.flow.run(calculationEffect)
    );
  })
);
```

## S07: 行级异步 (Row Async)

**v3 标准模式**: 监听整个 `items` 数组。在 `flow.run` 中，遍历数组，识别出需要执行异步操作的项，并使用 `Effect.all` 并行处理它们。这需要开发者自行管理状态以避免重复请求。

```typescript
// 概念上，这里的 `$List` 表示针对 ProductListShape + ProductApi 预绑定的 Bound API。
const asyncRowLogic: Logic.Of<ProductListShape, ProductApi> =
  Effect.gen(function* (_) {
    const items$ = $List.flow.fromState(s => s.items);

    const fetchDetailsEffect = Effect.gen(function* (_) {
      const api = yield* $List.use(ProductApi);
      const { items } = yield* $List.state.read;
      
      // 筛选出需要加载详情的行
      const effects = items.map((item, index) => 
        item.productId && !item.detail
          ? api.fetchDetail(item.productId).pipe(
              Effect.flatMap(detail =>
                $List.state.mutate(draft => { draft.items[index].detail = detail; })
              )
            )
          : Effect.void
      );

      // 并行执行所有加载任务
      yield* Effect.all(effects, { discard: true, concurrency: 'unbounded' });
    });

    yield* items$.pipe($List.flow.runLatest(fetchDetailsEffect));
  })
);
```

## S08: 全选/反选 (Batch Update)

**v3 标准模式**: 监听触发全选的 `Action`。在 `flow.run` 中执行一次 `state.mutate`，即可原子化地遍历并更新所有行，实现批量更新效果。

```typescript
// 概念上，这里的 `$Cart` 同样表示针对 CartShape 预绑定的 Bound API。
const toggleAllLogic: Logic.Of<CartShape> =
  Effect.gen(function* (_) {
    const toggleAll$ = $Cart.flow.fromAction(a => a._tag === 'toggleAll');

    const toggleAllEffect = Effect.gen(function* (_) {
      const { isAllChecked } = yield* $Cart.state.read;
      const nextChecked = !isAllChecked;

      yield* $Cart.state.mutate(draft => {
        draft.isAllChecked = nextChecked;
        draft.items.forEach(item => {
          item.checked = nextChecked;
        });
      });
    });

    yield* toggleAll$.pipe($Cart.flow.run(toggleAllEffect));
  })
);
```
