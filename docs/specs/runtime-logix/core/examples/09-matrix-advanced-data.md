# Matrix Examples: Advanced Data & Circular Protection (v3 Standard Paradigm)

> **Focus**: 深层嵌套、动态字典、循环依赖防护
> **Note**: 本文示例展示了 v3 Effect-Native 标准范式。v3 通过监听父级集合来处理动态数据，并通过 `flow.fromChanges` 内置的深度相等检查来自动处理循环依赖。

## S17 & S18: 深层嵌套与动态字典 (Deep Nested & Dynamic Map)

**v3 标准模式**: 监听包含动态数据（数组或字典）的顶层状态路径。在 `flow.run` 中执行的 Effect 负责遍历集合，应用业务逻辑。`state.mutate` 可以安全、高效地处理深层嵌套更新。

```typescript
// 场景：监听一个动态字典 itemsById，当任意一项的 status 变为 'done' 时，为其添加 archived 标记。
const $Data = Logic.forShape<DataShape>();

const dynamicMapLogic: Logic.Of<DataShape> =
  Effect.gen(function* (_) {
    // 监听整个 itemsById 对象
    const itemsById$ = $.flow.fromChanges(s => s.itemsById);

    const archiveEffect = $.state.mutate(draft => {
      Object.values(draft.itemsById).forEach(item => {
        if (item.status === 'done' && !item.archived) {
          item.archived = true;
        }
      });
    });

    yield* itemsById$.pipe($.flow.run(archiveEffect));
  })
);
```

## S19: 循环依赖防护 (Circular Protection)

**v3 标准模式**: `flow.fromChanges` 默认使用深度相等（deep equal）检查来判断状态是否真正发生了变化。如果一个更新操作导致的状态与前一个状态深度相等，流将不会发出新值，从而自动切断循环。

```typescript
// 场景：USD <-> CNY 双向汇率换算
const $Currency = Logic.forShape<CurrencyShape>();

const currencyLogic: Logic.Of<CurrencyShape> =
  Effect.gen(function* (_) {
    const usd$ = $.flow.fromChanges(s => s.usd);
    const cny$ = $.flow.fromChanges(s => s.cny);

    // Rule 1: USD -> CNY
    const usdToCny = usd$.pipe(
      $.flow.run(
        $.state.mutate(draft => {
          draft.cny = draft.usd * 7; // 假设汇率为 7
        })
      )
    );

    // Rule 2: CNY -> USD
    const cnyToUsd = cny$.pipe(
      $.flow.run(
        $.state.mutate(draft => {
          draft.usd = draft.cny / 7;
        })
      )
    );

    // 当 usdToCny 更新 cny 时，会触发 cny$ 流。cnyToUsd 会根据新的 cny 计算出一个 usd 值。
    // 这个新计算出的 usd 值与触发 usdToCny 的原始 usd 值相同。
    // 因此，当 cnyToUsd 尝试更新 usd 时，state.mutate 产生的新状态与当前状态深度相等，
    // 这导致 usd$ 流不会再次触发，循环被自动中断。

    yield* Effect.all([usdToCny, cnyToUsd], { discard: true });
  })
);
```
