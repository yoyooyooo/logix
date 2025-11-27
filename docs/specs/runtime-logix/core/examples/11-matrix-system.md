# Matrix Examples: System Capabilities (v3 Standard Paradigm)

> **Focus**: 多租户隔离、错误流路由、权限控制
> **Note**: 本文示例已更新为 v3 Effect-Native 标准范式，展示了如何利用 `Layer` 和 `Effect` 的原生能力来实现系统级的横切关注点。

## S22: 多租户隔离 (Multi-Tenant)

**v3 标准模式**: 通过 `Layer` 的组合来为不同租户提供不同的服务实现。`Logic` 代码本身保持租户无关，只依赖于服务的抽象接口 (`Tag`)。

```typescript
// 1. 定义服务接口
class UserApi extends Context.Tag("UserApi")<UserApi, {
  readonly fetch: (id: string) => Effect.Effect<User, Error>
}>() {}

// 2. 为不同租户提供不同的实现 Layer
const TenantALayer = Layer.succeed(UserApi, { fetch: (id) => Effect.succeed({ id, name: `Tenant A User ${id}` }) });
const TenantBLayer = Layer.succeed(UserApi, { fetch: (id) => Effect.succeed({ id, name: `Tenant B User ${id}` }) });

// 3. Logic 代码保持不变，只依赖 UserApi Tag
const $User = Logic.forShape<UserShape, UserApi>();

const userLogic = Logic.make<UserShape, UserApi>(
  Effect.gen(function* (_) {
    const api = yield* $User.services(UserApi);
    const { userId } = yield* $User.state.read;
    const user = yield* api.fetch(userId);
    yield* $User.state.mutate(draft => { draft.user = user; });
  })
);

// 4. 在应用入口处，根据当前租户选择并提供对应的 Layer
const AppLayer = currentTenant === 'A' ? TenantALayer : TenantBLayer;
Effect.runFork(UserStore.run.pipe(Effect.provide(AppLayer)));
```

## S23: 错误流路由 (Error Routing)

**v3 标准模式**: `Logic` 中返回的 `Effect` 的错误通道 (`E`) 会被 `Store` 的运行时捕获。可以通过订阅 `Store` 暴露的全局错误流来构建统一的错误处理机制。

```typescript
// 1. Logic 中允许出现失败
const errorLogic = Logic.make<Shape, Api>(
  Effect.gen(function* (_) {
    const api = yield* Api;
    // 这个 Effect 可能会失败，类型为 Effect<void, ApiError, ...>
    yield* api.unreliableCall(); 
  })
);

// 2. 在 Store 外部订阅错误流 (概念代码)
const store = Store.make(..., errorLogic);

// store.errors$ 是一个 Stream<ApiError>
store.errors$.pipe(
  Stream.runForEach(error => 
    // 在这里实现全局错误上报或弹窗提示
    Effect.logError(`Global Error Caught: ${error.message}`)
  )
);
```

## S24: 权限控制 (Permission Gating)

**v3 标准模式**: 在 `Effect` 内部通过调用注入的 `AuthService` 来实现运行时的权限检查，并使用 `Effect.if` 或 `control.branch` 来执行相应的逻辑分支。

```typescript
// 1. 定义 AuthService
class AuthService extends Context.Tag("AuthService")<AuthService, {
  readonly canApprove: () => Effect.Effect<boolean>
}>() {}

// 2. 在 Logic 中使用
const $Approval = Logic.forShape<ApprovalShape, AuthService | ApprovalApi>();

const permissionLogic = Logic.make<ApprovalShape, AuthService | ApprovalApi>(
  Effect.gen(function* (_) {
      const approve$ = $Approval.flow.fromAction(a => a._tag === 'approve');

      const approveEffect = Effect.gen(function* (_) {
        const auth = yield* $Approval.services(AuthService);
        const api = yield* $Approval.services(ApprovalApi);

        // 使用 control.branch 进行权限检查
        yield* $Approval.control.branch({
          if: auth.canApprove(),
          then: api.approve(),
          else: $Approval.state.mutate(draft => { draft.error = "Permission denied"; })
        });
      });

      yield* approve$.pipe($Approval.flow.run(approveEffect));
    })
);
```
