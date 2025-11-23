# Example: Dynamic Logic Injection

> **Scenario**: AI 辅助表单
> **Features**: 运行时注入规则、规则生命周期管理

## Scenario Description

用户打开一个通用表单，AI 根据用户输入的“业务描述”（例如：“如果是 VIP 用户，订单金额必须大于 100”），实时生成一段校验逻辑并注入到当前表单中。

## Implementation

```typescript
// 1. 初始 Store (只有基础逻辑)
const store = yield* makeStore({
  schema: OrderSchema,
  initialValues: { ... },
  logic: [] // 初始为空
});

// 2. AI 生成的逻辑描述 (JSON Intent)
const aiIntent = {
  trigger: "isVip",
  condition: "isVip === true && amount < 100",
  action: "setError('amount', 'VIP minimum order is 100')"
};

// 3. 运行时编译 (Compiler Layer)
// 将 Intent 转换为 Logix 的 LogicRule
const dynamicRule = store.logicApi.watch('amount', (amount, { get, set }) => 
  Effect.gen(function*() {
    const { isVip } = yield* get;
    if (isVip && amount < 100) {
      yield* set('errors.amount', 'VIP minimum order is 100');
    }
  })
);

// 4. 动态注入 (Injection)
// 返回一个 handle，用于后续管理
const ruleHandle = store.addRule(dynamicRule);

// ... 用户操作表单，触发新规则 ...

// 5. 规则销毁 (Cleanup)
// 当用户修改了需求，或者离开页面时
yield* ruleHandle.dispose();
```

## API Review

*   **热插拔**: `addRule` 允许在不重建 Store 的情况下扩展逻辑。
*   **隔离性**: 动态规则运行在独立的子 Scope 中，`dispose` 只会清理该规则产生的副作用，不影响主 Store。
*   **AI 桥接**: 虽然 Logix 运行的是 TS 代码，但配合一个简单的 Compiler/Interpreter，就能完美对接 AI 的 JSON 输出。
