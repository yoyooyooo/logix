# Example: Basic Form Logic (v3 Gold Standard)

> **Scenario**: 用户注册表单  
> **Features**: 字段联动、异步校验、多字段约束  
> **Note**: 本示例是 v3 Effect-Native Logix API 的 **黄金标准实现**。所有新业务逻辑都应以此为范本，它严格对齐 `logix-v3-core.ts` 中的 `Store.Shape` + `Logic.make` + `Flow / Control` 范式。

## Schema Definition

```typescript
import { Schema, Context, Effect } from 'effect';
import { Store, Logic } from '~/logix-v3-core'; // 概念性路径

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

// 从 Schema 派生出 Shape，作为 Logic 与 Store 之间的类型契约
type RegisterShape = Store.Shape<
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

// 使用 Logic.make 定义一个自包含的、可组合的逻辑单元
export const RegisterLogic = Logic.make<RegisterShape, UserApi>(({ flow, state }) =>
  Effect.gen(function* (_) {
    // 1. 同步联动：country 变化时重置 province
    const country$ = flow.fromChanges((s) => s.country);

    const resetProvince = country$.pipe(
      flow.run(
        state.mutate((draft) => {
          draft.province = "";
        })
      )
    );

    // 2. 异步校验：监听 username，调用 API 检查重名
    const username$ = flow.fromChanges((s) => s.username);

    const validateUsername = username$.pipe(
      flow.debounce(500),
      flow.filter((username) => username.length >= 3),
      flow.runLatest(
        Effect.gen(function* (_) {
          const svc = yield* UserApi;
          const { username } = yield* state.read;
          const isTaken = yield* svc.checkUsername(username);
          yield* state.mutate((draft) => {
            draft.errors.username = isTaken ? "Username already taken" : undefined;
          });
        })
      )
    );

    // 3. 多字段约束：监听 password / confirmPassword，确保两者一致
    const passwordPair$ = flow.fromChanges(
      (s) => [s.password, s.confirmPassword] as const
    );

    const ensurePasswordMatch = passwordPair$.pipe(
      flow.run(
        state.mutate((draft) => {
          if (draft.confirmPassword && draft.password !== draft.confirmPassword) {
            draft.errors.confirmPassword = "Passwords do not match";
          } else {
            delete draft.errors.confirmPassword;
          }
        })
      )
    );

    yield* Effect.all([resetProvince, validateUsername, ensurePasswordMatch], { discard: true });
  })
);
```

## Store Instantiation

```typescript
const RegisterStateLayer = Store.State.make(RegisterStateSchema, {
  username: "",
  password: "",
  confirmPassword: "",
  country: "",
  province: "",
  bio: "",
  errors: {}
});

const RegisterActionLayer = Store.Actions.make(RegisterActionSchema);

export const RegisterStore = Store.make<RegisterShape>(
  RegisterStateLayer,
  RegisterActionLayer,
  RegisterLogic
);
```

## Design Rationale

*   **Clarity & Cohesion**: 三个核心业务逻辑（联动、异步校验、多字段约束）被清晰地拆分为三个独立的、可组合的流。所有与特定功能相关的代码（触发、防抖、执行）都内聚在一起，极大地提高了可读性和可维护性。
*   **Declarative Concurrency**: 异步校验的竞态问题通过 `flow.runLatest` 声明式地解决，开发者无需编写任何手动的取消或标志位管理逻辑，代码意图清晰，行为健壮。
*   **Type-Safe Dependency Injection**: 外部依赖（如 `UserApi`）通过 `Context.Tag` 定义，并由 `Logic.make` 的泛型参数约束。这确保了在编译时就能发现依赖缺失或类型不匹配的问题，保证了运行时的稳定性。