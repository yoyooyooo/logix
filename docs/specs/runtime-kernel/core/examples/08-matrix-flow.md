# Matrix Examples: Flow Control (S14-S15)

> **Focus**: 错误重试、竞态取消、复杂流控

## S14: 失败重试 (Retry)
**Trigger**: T1 (Single Path) -> **Effect**: E3 (Flow Control)

```typescript
watch('username', (name, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.UserApi;
    // 如果 check 失败，自动重试
    const result = yield* api.check(name).pipe(
      Effect.retry({ 
        times: 3, 
        schedule: Schedule.exponential('100 millis') 
      })
    );
    yield* set('isValid', result);
  })
)
```

## S15: 竞态取消 (SwitchMap)
**Trigger**: T1 (Single Path) -> **Effect**: E3 (Flow Control)

```typescript
// 需求：用户快速输入，只处理最后一次请求，之前的请求自动取消
watch('search', (kw, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.SearchApi;
    // 模拟耗时请求
    const result = yield* api.search(kw);
    yield* set('result', result);
  }),
  { 
    debounce: '300 millis', 
    concurrency: 'switch' // 关键：启用 SwitchMap 模式
  }
)
```

## S16: 错误回退 (Error Fallback)
**Trigger**: T1 -> **Effect**: E3

```typescript
watch('configId', (id, { set, services }) => 
  Effect.gen(function*() {
    const api = yield* services.ConfigApi;
    // 尝试获取配置，如果失败，使用默认值
    const config = yield* api.fetch(id).pipe(
      Effect.catchAll(() => Effect.succeed(DEFAULT_CONFIG))
    );
    yield* set('config', config);
  })
)
```
