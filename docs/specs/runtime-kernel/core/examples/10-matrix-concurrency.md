# Matrix Examples: Advanced Concurrency

> **Focus**: Exhaust Map, 提交防重, 并行服务

## S20: 提交防重 (Submit Exhaust)
**Trigger**: T1 -> **Effect**: E3

```typescript
// 需求：用户狂点提交按钮，只执行第一次，直到完成
watch('isSubmitting', (submitting, { set, services }) => 
  Effect.gen(function*() {
    if (!submitting) return;
    
    const api = yield* services.OrderApi;
    yield* api.submit().pipe(
      // 成功后重置状态
      Effect.tap(() => set('isSubmitting', false)),
      // 失败也要重置
      Effect.catchAll(() => set('isSubmitting', false))
    );
  }),
  { concurrency: 'exhaust' } // 关键：忽略后续触发
)
```

## S21: 多服务并行 (Parallel Services)
**Trigger**: T1 -> **Effect**: E2

```typescript
// 需求：初始化时并行加载 User 和 Config，部分成功也要处理
watch('userId', (id, { set, services }) => 
  Effect.gen(function*() {
    const userApi = yield* services.UserApi;
    const configApi = yield* services.ConfigApi;
    
    // 并行执行，允许部分失败
    yield* Effect.all([
      userApi.fetch(id).pipe(
        Effect.tap(u => set('user', u)),
        Effect.catchAll(e => set('errors.user', e.message))
      ),
      configApi.fetch().pipe(
        Effect.tap(c => set('config', c)),
        Effect.catchAll(e => set('errors.config', e.message))
      )
    ], { concurrency: 'unbounded' });
  })
)
```
