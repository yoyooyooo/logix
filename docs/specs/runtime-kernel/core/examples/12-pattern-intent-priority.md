# Pattern: Intent Priority & Conflict Resolution

> **Scenario**: 价格计算 (User Override vs Auto Calculation)
> **Focus**: 意图优先级、元数据追踪、逻辑冲突解决

## 1. The Challenge (痛点)

在业务逻辑中，经常存在多个规则试图修改同一个字段的情况：

1.  **Base Rule**: 根据 `quantity * unitPrice` 自动计算 `total`。
2.  **User Override**: 用户手动修改了 `total`（例如给予折扣）。此时，自动计算应该停止，或者反算 `unitPrice`。
3.  **System Policy**: 管理员应用了“最低限价”策略，强制覆盖 `total`。

如果缺乏优先级机制，这些规则会相互打架，导致死循环或数据跳变。

## 2. The Solution: Metadata-Driven Priority

Kernel 允许在 `set` 操作中携带 `source` 和 `priority` 元数据。Kernel 内部或逻辑层利用这些元数据来解决冲突。

### 2.1 Schema Definition

```typescript
const OrderItemSchema = Schema.Struct({
  quantity: Schema.Number,
  unitPrice: Schema.Number,
  total: Schema.Number,
  // 可选：显式存储锁定状态，或者隐式依赖 priority
  isTotalManual: Schema.Boolean
});
```

### 2.2 Store Logic

```typescript
const store = makeStore({
  schema: OrderItemSchema,
  initialValues: { quantity: 1, unitPrice: 100, total: 100, isTotalManual: false },

  logic: ({ watch }) => [
    
    // Rule 1: Auto Calculation (Low Priority)
    // 只有当 total 没有被更高优先级（用户/管理员）锁定时，才执行
    watchMany(['quantity', 'unitPrice'], ([qty, price], { set, get }, ctx) => 
      Effect.gen(function*() {
        // 检查当前 total 的优先级状态
        // 假设 Kernel 提供了 getMeta API
        const meta = yield* get.meta('total');
        
        // 如果当前值是用户手动输入的 (Priority 10)，则不覆盖
        if (meta.priority >= 10) return;

        yield* set('total', qty * price, { 
          source: 'auto-calc', 
          priority: 0 // 低优先级
        });
      })
    ),

    // Rule 2: User Override (High Priority)
    // 监听 total 的变化，如果是用户改的，标记为 Manual
    watch('total', (total, { set }, ctx) => 
      Effect.gen(function*() {
        // 只有当变更是用户触发时
        if (ctx.meta.source === 'user-input') {
          // 提升优先级，锁定该字段
          // 注意：这里 set total 自身是为了更新 meta
          yield* set('total', total, { 
            source: 'user-input', 
            priority: 10 
          });
          yield* set('isTotalManual', true);
        }
      })
    ),

    // Rule 3: Admin Policy (Force Priority)
    // 比如：总价不能低于 50
    watch('total', (total, { set }) => 
      Effect.gen(function*() {
        if (total < 50) {
          // 强制覆盖，即使是用户输入的
          yield* set('total', 50, { 
            source: 'admin-policy', 
            priority: 100 // 最高优先级
          });
          // 可选：通知用户
          yield* set('errors.total', 'Minimum order amount is 50');
        }
      })
    )
  ]
});
```

## 3. Key Concepts

### 3.1 Priority Levels (约定)

*   **0 (Default)**: 自动计算、默认值、低优先级规则。
*   **10 (User)**: 用户手动输入、表单编辑。
*   **100 (System/Admin)**: 强制策略、合规要求、安全限制。

### 3.2 Source Tracking

`ctx.meta.source` 是判断“谁动了我的奶酪”的关键。
*   `'user-input'`: 来自 UI 组件的直接绑定。
*   `'auto-calc'`: 来自其他 `watch` 规则的副作用。
*   `'external'`: 来自 WebSocket 或 API 回填。

### 3.3 Resetting Priority

当用户想要“恢复自动计算”时，需要一个操作来重置优先级。

```typescript
// Reset Action
const resetTotal = () => 
  store.set('total', store.get().quantity * store.get().unitPrice, {
    source: 'reset',
    priority: 0 // 重置回低优先级
  });
```
