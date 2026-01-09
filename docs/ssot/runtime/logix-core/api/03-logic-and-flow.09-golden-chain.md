# 9. 从 ModuleDef 到 IntentRule：一条标准链路（体验视角）

为了帮助使用者快速建立整体心智，可以将 Logix 的“主链路”理解为：

> **定义 ModuleDef → 编写 Logic（`ModuleDef.logic(($)=>...)` + Fluent DSL）→ 在其他 Logic 中通过 `$.use(ModuleDef)` 协作 → 平台从 Fluent 链生成 IntentRule。**

一个典型的最小示例：

```ts
// 1. 定义领域模块（ModuleDef）
const CounterState = Schema.Struct({ count: Schema.Number });
const CounterAction = {
  inc: Schema.Void,
  dec: Schema.Void,
};

export const CounterDef = Logix.Module.make('Counter', {
  state: CounterState,
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
});

// 2. 在 ModuleDef 上编写 Logic（通过 ModuleDef.logic 注入 $）
export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // Action → State：基于 Action 更新 count
    yield* $.onAction(
      (a): a is { _tag: 'inc' } => a._tag === 'inc',
    ).update((prev) => ({ ...prev, count: prev.count + 1 }));

    // State → State：基于 count 变化派生 hasPositive（示意）
    yield* $.onState((s) => s.count).update((prev) => ({
      ...prev,
      hasPositive: prev.count > 0,
    }));
  }),
);

// 3. 在其他 Logic 中通过 $.use(CounterDef) 协作（跨 Module）
export const SomeOtherLogic = OtherModule.logic(($) =>
  Effect.gen(function* () {
    const $Counter = yield* $.use(CounterDef); // 领域只读句柄（等价于使用 CounterDef.tag）

    yield* $.on($Counter.changes((s) => s.count))
      .filter((count) => count > 10)
      .update((prev) => ({ ...prev, showCongrats: true }));
  }),
);
```

在这一模式下：

- **ModuleDef** 是领域世界的“定义根”：统一承载 Id / Schema / `ModuleTag`（`moduleDef.tag`）/ Logic 入口；
- 所有业务 Logic 都通过 `ModuleDef.logic(($)=>Effect.gen(...))` 注入 `$`，形成统一的编程体验；
- 跨模块协作统一通过 `$.use(OtherDef)`（等价 `OtherDef.tag`）获取只读句柄，再配合 Fluent DSL 表达规则；
- 平台只需识别 `Logix.Module.make(...)` 与 Fluent 链，即可恢复 L1 / L2 IntentRule——开发者不需要关心 IntentRule 结构细节。
