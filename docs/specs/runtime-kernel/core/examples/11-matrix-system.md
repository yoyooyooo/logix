# Matrix Examples: System Capabilities

> **Focus**: 多租户、错误流、Trace

## S22: 多租户隔离 (Multi-Tenant)
**Trigger**: T5 -> **Effect**: E1

```typescript
// 需求：不同租户使用不同的 API 实现
// 解法：通过 Layer 注入不同的 Services
const TenantALayer = Layer.succeed(UserApi, TenantAImpl);
const TenantBLayer = Layer.succeed(UserApi, TenantBImpl);

// Kernel 代码完全复用，无需感知租户
const store = makeStore({
  logic: ({ watch }) => [
    watch('id', (id, { services }) => 
      // services.UserApi 在运行时被替换
      services.UserApi.fetch(id)
    )
  ]
});
```

## S23: 错误流路由 (Error Routing)
**Trigger**: System Action -> **Effect**: E1

```typescript
// 需求：将所有 watch 中的错误统一路由到 error$ 流
// Kernel 内部实现：
// watch 的 Effect 如果失败，Kernel 会捕获并 emit 到 error$

// 用户侧订阅：
store.error$.pipe(
  Stream.runForEach(error => 
    Effect.logError(`Global Error: ${error.message}`)
  )
)
```

## S24: 权限控制 (Permission Gating)
**Trigger**: T1 -> **Effect**: E1

```typescript
watch('status', (status, { set, services }) => 
  Effect.gen(function*() {
    const auth = yield* services.AuthService;
    // 运行时权限检查
    if (status === 'approved' && !auth.canApprove()) {
      // 拒绝变更，回滚状态
      yield* set('status', 'pending');
      yield* set('errors.global', 'Permission denied');
      return;
    }
    // ...
  })
)
```
