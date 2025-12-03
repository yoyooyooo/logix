# Example: Basic Form Logic (v3 Gold Standard)

> **Scenario**: 用户注册表单
> **Features**: 字段联动、异步校验、多字段约束
> **Note**: 本示例是 v3 Effect-Native Logix API 的 **黄金标准实现**。所有新业务逻辑都应以此为范本，它严格对齐 `logix-v3-core.ts` 中的 `Logix.ModuleShape` + Module-first + Bound API `$` + Fluent Intent（`$.on*().update/mutate/run*`）范式。

## Schema Definition

```typescript
import { Schema, Context, Effect } from 'effect';
import { Store, Logic, Logix } from '~/logix-v3-core'; // 概念性路径

const RegisterStateSchema = Schema.Struct({
  username: Schema.String,
  password: Schema.String,
  confirmPassword: Schema.String,
  country: Schema.String,
  province: Schema.String,
  bio: Schema.String,
  errors: Schema.Record(Schema.String, Schema.optional(Schema.String))
});

const RegisterActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('form/submit') }),
  Schema.Struct({ _tag: Schema.Literal('form/reset') })
);

// 从 Schema 派生出 Shape，作为 Logic 与运行时之间的类型契约
type RegisterShape = Logix.ModuleShape<
  typeof RegisterStateSchema,
  typeof RegisterActionSchema
>;
```

## Logic Implementation (v3 Effect-Native)

```typescript
// 定义业务依赖的服务
class UserApi extends Context.Tag("UserApi")<UserApi, {
  readonly checkUsername: (name: string) => Effect.Effect<boolean, never, any>
}>() {}

// 定义领域 Module
export const RegisterModule = Logix.Module('Register', {
  state: RegisterStateSchema,
  actions: RegisterActionSchema,
});

// 使用 Module.logic + Bound API 定义一个自包含的、可组合的逻辑单元
export const RegisterLogic = RegisterModule.logic(($) =>
  Effect.gen(function* (_) {
    // 1. 同步联动：country 变化时重置 province
    yield* $.onState((s) => s.country).mutate((draft) => {
      draft.province = "";
    });

    // 2. 异步校验：监听 username，调用 API 检查重名（latest 并发语义）
    yield* $.onState((s) => s.username)
      .debounce(500)
      .filter((username) => username.length >= 3)
      .run(
        Effect.gen(function* (_) {
          const svc = yield* $.use(UserApi);
          const { username } = yield* $.state.read;
          const isTaken = yield* svc.checkUsername(username);
          yield* $.state.mutate((draft) => {
            draft.errors.username = isTaken ? "Username already taken" : undefined;
          });
        })
      );

    // 3. 多字段约束：监听 password / confirmPassword，确保两者一致
    yield* $.onState((s) => [s.password, s.confirmPassword] as const).mutate(
      (draft) => {
        if (draft.confirmPassword && draft.password !== draft.confirmPassword) {
          draft.errors.confirmPassword = "Passwords do not match";
        } else {
          delete draft.errors.confirmPassword;
        }
      }
    );
  }),
);
```

## Module / Live Instantiation

```typescript
export const RegisterLive = RegisterModule.live(
  {
    username: "",
    password: "",
    confirmPassword: "",
    country: "",
    province: "",
    bio: "",
    errors: {},
  },
  RegisterLogic,
);
```

## Design Rationale

*   **Clarity & Cohesion**: 三个核心业务逻辑（联动、异步校验、多字段约束）被清晰地拆分为三个独立的、可组合的流。所有与特定功能相关的代码（触发、防抖、执行）都内聚在一起，极大地提高了可读性和可维护性。
*   **Declarative Concurrency**: 异步校验的竞态问题通过 Fluent DSL 的 `{ mode: 'latest' }` 声明式地解决，开发者无需编写任何手动的取消或标志位管理逻辑，代码意图清晰，行为健壮。
*   **Type-Safe Dependency Injection**: 外部依赖（如 `UserApi`）通过 `Context.Tag` 定义，并由 Logic.Env / Logic.Of 的泛型参数约束。这确保了在编译时就能发现依赖缺失或类型不匹配的问题，保证了运行时的稳定性。
