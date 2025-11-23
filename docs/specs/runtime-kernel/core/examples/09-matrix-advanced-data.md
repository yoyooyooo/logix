# Matrix Examples: Advanced Data & Circular Protection

> **Focus**: 深层嵌套、Map 结构、循环依赖防护

## S17: 深层嵌套与可选字段 (Deep Nested Optional)
**Trigger**: T1 -> **Effect**: E1

```typescript
// Schema: user.addresses[0].geo.location.lat
watch('user.addresses.*.geo.location.lat', (lat, { set }, ctx) => 
  Effect.gen(function*() {
    const index = ctx.params[0];
    // 需求：如果 lat 变化，自动更新同级的 lastUpdated
    // 挑战：路径可能不存在？Kernel 的 getPath 应该处理 Optional
    yield* set(`user.addresses[${index}].geo.lastUpdated`, Date.now());
  })
)
```

## S18: 动态字典 (Dynamic Map)
**Trigger**: T3 -> **Effect**: E1

```typescript
// Schema: itemsById: Record<string, { status: string }>
// 需求：监听任意 item 的 status 变化
watchPattern('itemsById.*.status', (status, { set }, ctx) => 
  Effect.gen(function*() {
    const id = ctx.params[0];
    if (status === 'done') {
      // 归档
      yield* set(`itemsById.${id}.archived`, true);
    }
  })
)
```

## S19: 循环依赖防护 (Circular Protection)
**Trigger**: T1 -> **Effect**: E1

```typescript
// 需求：USD <-> CNY 双向绑定
// 机制：依赖 set 的 Deep Equal Check 防止死循环

// Rule 1: USD -> CNY
watch('usd', (usd, { set }, ctx) => 
  Effect.gen(function*() {
    // 如果变更来自 'rule' (即 CNY -> USD 触发的)，且值一致，set 内部会拦截
    // 但为了保险，也可以检查 meta
    if (ctx.meta.source === 'rule') return;
    yield* set('cny', usd * 7);
  })
)

// Rule 2: CNY -> USD
watch('cny', (cny, { set }, ctx) => 
  Effect.gen(function*() {
    if (ctx.meta.source === 'rule') return;
    yield* set('usd', cny / 7);
  })
)
```
