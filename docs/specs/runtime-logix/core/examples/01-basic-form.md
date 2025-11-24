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

## Store Implementation（对齐 v3 Logix API）

```typescript
const stateSchema = RegisterSchema;

const actionSchema = Schema.Union(
  Schema.Struct({ type: Schema.Literal('form/submit') }),
  Schema.Struct({ type: Schema.Literal('form/reset') })
  // ... 其他动作（可选）
);

const store = makeStore({
  stateSchema,
  initialState: { /* 按 RegisterSchema 填充初始值 */ },
  actionSchema,
  services: {
    UserApi: UserApiImpl
  },
  rules: api => [
    // 1. 同步联动 (Sync Linkage)
    // 当 country 变化时，重置 province
    api.rule({
      name: 'ResetProvinceOnCountryChange',
      trigger: api.on.change(s => s.country),
      do: api.ops.set(s => s.province, '')
    }),

    // 2. 异步校验 (Async Validation)
    // 监听 username，调用 API 检查重名
    api.rule({
      name: 'ValidateUsername',
      trigger: api.on.change(s => s.username),
      do: api.pipe(
        api.ops.debounce(500),
        api.ops.filter(ctx => ctx.value.length >= 3),
        api.ops.fetch(ctx => api.services.UserApi.checkUsername(ctx.value)),
        api.ops.map(isTaken => ({
          path: 'errors.username' as const,
          message: isTaken ? 'Username already taken' : null
        })),
        api.ops.update(s => s.errors, (errors, { path, message }) => ({
          ...errors,
          [path]: message
        }))
      )
    }),

    // 3. 多字段约束 (Multi-Field Constraint)
    // 监听 password 和 confirmPassword，确保两者一致
    api.rule({
      name: 'EnsurePasswordMatch',
      trigger: api.on.change(s => [s.password, s.confirmPassword] as const),
      do: api.ops.update(s => s.errors, (errors, _, ctx) => {
        const [pwd, confirm] = ctx.value;
        if (confirm && pwd !== confirm) {
          return { ...errors, confirmPassword: 'Passwords do not match' };
        }
        const { confirmPassword, ...rest } = errors;
        return rest;
      })
    })
  ]
});
```

## API Review

*   **对齐正式契约**: 使用 `stateSchema` / `initialState` / `actionSchema` / `rules(api)` 与 `02-logix-design.md` 保持一致。
*   **可视化友好**: `api.rule + api.on + api.ops` 的组合可以直接映射为 Logic Rule DSL，便于生成图形与 Trace。
*   **服务注入清晰**: 所有外部调用都通过 `api.services.UserApi` 暴露，便于在测试和运行时统一管理依赖。
