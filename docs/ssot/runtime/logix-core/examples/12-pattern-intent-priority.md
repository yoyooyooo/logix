# Pattern: Intent Priority & Conflict Resolution (Standard Paradigm)

> **Scenario**: 价格计算 (User Override vs Auto Calculation)  
> **Focus**: 显式状态建模、逻辑冲突解决  
> **Note**: 本文示例展示了当前主线 Effect-Native 标准范式。通过在状态模型中添加明确的标志（如 `isManualOverride`），可以显式地、可预测地管理逻辑冲突。实际代码应在对应 ModuleDef 上通过 `ModuleDef.logic(($)=>...)` 获取 `$`。

## 1. The Challenge (痛点)

多个逻辑源可能试图修改同一个字段，导致冲突：

1.  **自动计算**: `total` 应根据 `quantity * unitPrice` 自动更新。
2.  **用户覆盖**: 用户手动修改 `total`，此时自动计算应暂停。
3.  **系统策略**: 管理员应用“最低限价”策略，强制覆盖 `total`。

## 2. The Solution: Explicit State Modeling

通过在 State Schema 中添加额外的字段来明确地追踪和控制逻辑的执行权。

### 2.1 Schema Definition

在状态中添加 `isTotalManual` 标志来记录 `total` 字段是否已被用户手动控制。

```typescript
const OrderItemSchema = Schema.Struct({
  quantity: Schema.Number,
  unitPrice: Schema.Number,
  total: Schema.Number,
  // 显式标志，用于控制逻辑优先级
  isTotalManual: Schema.Boolean
});

const OrderItemActionSchema = Schema.Union(
  // 用户手动修改 total 的专属 Action
  Schema.Struct({ _tag: Schema.Literal('setTotalManually'), payload: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('resetTotalToAuto') })
);

type OrderItemShape = Logix.ModuleShape<typeof OrderItemSchema, typeof OrderItemActionSchema>;
```

### 2.2 Logic Implementation

每个逻辑源都成为一个独立的、有明确条件的流。

```typescript
// 概念上，这里的 `$Item` 表示针对 OrderItemShape 预绑定的 Bound API。
const priorityLogic: Logic.Of<OrderItemShape> =
  Effect.gen(function* (_) {

    // Rule 1: 自动计算
    const priceOrQty$ = $.flow.fromState(s => [s.quantity, s.unitPrice]);
    const autoCalculation = priceOrQty$.pipe(
      $.flow.run(
        Effect.gen(function* (_) {
          const current = yield* $.state.read;
          // 关键：只有在非手动模式下才执行自动计算
          if (!current.isTotalManual) {
            yield* $.state.mutate(draft => {
              draft.total = draft.quantity * draft.unitPrice;
            });
          }
        })
      )
    );

    // Rule 2: 用户手动覆盖
    const manualSet$ = $.flow.fromAction(a => a._tag === 'setTotalManually');
    const userOverride = manualSet$.pipe(
      $.flow.run(action =>
        $.state.mutate(draft => {
          draft.total = action.payload;
          draft.isTotalManual = true; // 夺取控制权
        })
      )
    );

    // Rule 3: 系统策略 (强制约束)
    const total$ = $.flow.fromState(s => s.total);
    const systemPolicy = total$.pipe(
      $.flow.run(
        $.state.mutate(draft => {
          // 无论如何，总价不能低于 50
          if (draft.total < 50) {
            draft.total = 50;
          }
        })
      )
    );

    // Rule 4: 重置为自动计算
    const reset$ = $.flow.fromAction(a => a._tag === 'resetTotalToAuto');
    const resetToAuto = reset$.pipe(
      $.flow.run(
        $.state.mutate(draft => {
          draft.isTotalManual = false; // 放弃控制权
          // 立即重新计算一次
          draft.total = draft.quantity * draft.unitPrice;
        })
      )
    );

    yield* Effect.all([autoCalculation, userOverride, systemPolicy, resetToAuto], { discard: true });
  })
);
```

## 3. Design Rationale

- **Explicit & Traceable**: 逻辑的执行条件（`if (!isTotalManual)`）是代码的一部分，清晰可见，易于调试和推理。
- **State-Driven**: 所有的行为都由当前的状态驱动，符合状态机的核心思想。`isTotalManual` 标志本身就是状态的一部分。
- **Robust**: 这种模式的健壮性由开发者通过显式状态管理来保证，不依赖任何隐式的运行时行为。
