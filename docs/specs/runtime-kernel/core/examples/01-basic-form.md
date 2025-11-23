# Example: Basic Form Logic

> **Scenario**: 用户注册表单
> **Features**: 字段联动、异步校验、多字段约束

## Schema Definition

```typescript
const RegisterSchema = Schema.Struct({
  username: Schema.String,
  password: Schema.String,
  confirmPassword: Schema.String,
  country: Schema.String,
  province: Schema.String,
  bio: Schema.String,
  errors: Schema.Record(Schema.String, Schema.String)
});
```

## Store Implementation

```typescript
const store = makeStore({
  schema: RegisterSchema,
  initialValues: { ... },
  context: UserApiContext,

  logic: ({ watch, watchMany }) => [
    
    // 1. 同步联动 (Sync Linkage)
    // 当 country 变化时，重置 province
    watch('country', (country, { set }) => 
      set('province', '')
    ),

    // 2. 异步校验 (Async Validation)
    // 监听 username，调用 API 检查重名
    watch('username', (name, { set, services }) => 
      Effect.gen(function*() {
        if (name.length < 3) return;
        
        const api = yield* services.UserApi;
        const isTaken = yield* api.checkUsername(name);
        
        if (isTaken) {
          yield* set('errors.username', 'Username already taken');
        } else {
          yield* set('errors.username', null);
        }
      }),
      { debounce: '500 millis', concurrency: 'restart' }
    ),

    // 3. 多字段约束 (Multi-Field Constraint)
    // 监听 password 和 confirmPassword，确保两者一致
    watchMany(['password', 'confirmPassword'], ([pwd, confirm], { set }) => 
      Effect.gen(function*() {
        if (confirm && pwd !== confirm) {
          yield* set('errors.confirmPassword', 'Passwords do not match');
        } else {
          yield* set('errors.confirmPassword', null);
        }
      })
    )
  ]
});
```

## API Review

*   **手感**: `watch` 和 `watchMany` 的区分很自然。`Effect.gen` 让异步逻辑写起来像同步代码。
*   **类型安全**: `watch('country')` 中的 `country` 参数会自动推导为 string 类型。
*   **依赖注入**: `services` 参数让 API 调用变得显式且易于测试。
