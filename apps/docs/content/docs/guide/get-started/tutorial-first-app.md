---
title: '教程：第一个 Logix 表单'
description: 手把手教你构建一个包含联动、校验和多字段约束的注册表单。
---

本教程将带你从零开始，构建一个功能完整的用户注册表单。我们将涵盖以下核心场景：

1.  **字段联动**：选择国家时，自动重置省份。
2.  **异步校验**：输入用户名后，自动检查是否重名。
3.  **多字段约束**：校验密码与确认密码是否一致。

### 适合谁

- 已经完成「快速开始」中的计数器示例，希望体验更贴近日常业务的表单场景；
- 想看看 Logix 在“字段联动 + 异步校验 + 多字段约束”上的完整写法。

### 前置知识

- 熟悉 TypeScript、React 基本用法；
- 大致了解 Module / Logic / Bound API (`$`) 的概念。

### 读完你将获得

- 一套完整的“注册表单”示例，可以直接改造成自己项目的模板；
- 对 `$.onState` + `$.flow.debounce` + `$.state.mutate` 的组合有实战体验；
- 对“用 Module 承载表单状态、让 UI 变薄”的模式有直观认识。

## 1. 定义数据结构 (Schema)

首先，我们需要定义表单的“形状”（Shape）。在 Logix 中，我们使用 `effect/Schema` 来定义状态和动作。

创建 `src/features/register/schema.ts`：

```typescript
import { Schema } from 'effect'
import * as Logix from '@logix/core'

// 1. 定义状态 (State)
export const RegisterState = Schema.Struct({
  username: Schema.String,
  password: Schema.String,
  confirmPassword: Schema.String,
  country: Schema.String,
  province: Schema.String,
  // 错误信息
  errors: Schema.Struct({
    username: Schema.optional(Schema.String),
    password: Schema.optional(Schema.String),
  }),
  // 元数据
  meta: Schema.Struct({
    isSubmitting: Schema.Boolean,
    isValidating: Schema.Boolean,
  }),
})

// 2. 定义动作 (Actions)
export const RegisterActions = {
  updateField: Schema.Struct({ field: Schema.String, value: Schema.String }),
  submit: Schema.Void,
  reset: Schema.Void,
}

// 3. 定义模块 (Module)
// Logix.Module 返回一个 ModuleInstance，它既是运行时对象，也包含类型信息
export const RegisterModule = Logix.Module.make('Register', {
  state: RegisterState,
  actions: RegisterActions,
})

// 导出 Shape 类型 (可选，用于类型推导)
export type RegisterShape = typeof RegisterModule.shape
```

## 2. 编写业务逻辑 (Logic)

接下来，我们使用 Fluent API 来编写业务逻辑。

创建 `src/features/register/logic.ts`：

```typescript
import { Effect } from 'effect'
import { RegisterModule } from './schema' // 假设 Module 定义在 schema.ts 或 module.ts
import { UserApi } from '../../services/UserApi'

export const RegisterLogic = RegisterModule.logic(($) =>
  Effect.gen(function* () {
    // --- 场景 1: 字段联动 ---
    // 当 country 变化时，重置 province
    yield* $.onState((s) => s.country).run(() =>
      $.state.mutate((draft) => {
        draft.province = ''
      }),
    )

    // --- 场景 2: 异步校验 ---
    // 监听 username 变化 -> 防抖 -> 校验 -> 更新错误状态
    yield* $.onState((s) => s.username).pipe(
      $.flow.debounce(500),
      $.flow.filter((name) => name.length >= 3),
      $.flow.runLatest((name) =>
        Effect.gen(function* () {
          yield* $.state.mutate((d) => {
            d.meta.isValidating = true
          })

          const api = yield* $.use(UserApi)
          const isTaken = yield* api.checkUsername(name)

          yield* $.state.mutate((d) => {
            d.meta.isValidating = false
            d.errors.username = isTaken ? '用户名已被占用' : undefined
          })
        }),
      ),
    )

    // --- 场景 3: 多字段约束 ---
    // 监听密码对变化 -> 校验一致性
    yield* $.onState((s) => [s.password, s.confirmPassword] as const).run(([pwd, confirm]) =>
      $.state.mutate((draft) => {
        if (confirm && pwd !== confirm) {
          draft.errors.password = '两次输入的密码不一致'
        } else {
          delete draft.errors.password
        }
      }),
    )

    // --- 处理提交 ---
    yield* $.onAction('submit').runExhaust(() =>
      Effect.gen(function* () {
        const state = yield* $.state.read
        // 简单的校验拦截
        if (state.errors.username || state.errors.password) return

        yield* $.state.mutate((d) => {
          d.meta.isSubmitting = true
        })
        // ... 提交逻辑 ...
        yield* Effect.sleep('1 seconds') // 模拟请求
        yield* $.state.mutate((d) => {
          d.meta.isSubmitting = false
        })
      }),
    )
  }),
)
```

## 3. 组装模块 (Module)

将 Schema 和 Logic 组装成一个可运行的 Module。

创建 `src/features/register/module.ts`：

```typescript
import { RegisterModule } from './schema'
import { RegisterLogic } from './logic'

// 生成 ModuleImpl + Live Layer
export const RegisterLive = RegisterModule.implement({
  initial: {
    username: '',
    password: '',
    confirmPassword: '',
    country: 'CN',
    province: '',
    errors: {},
    meta: { isSubmitting: false, isValidating: false },
  },
  logics: [RegisterLogic],
})
```

## 4. 连接 UI (React)

最后，在 React 组件中使用它。

```tsx
import { useModule } from '@logix/react'
import { RegisterModule } from './module'

export function RegisterForm() {
  // 获取 Module 实例
  const { state, actions } = useModule(RegisterModule)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        actions.submit()
      }}
    >
      <div>
        <label>用户名</label>
        <input
          value={state.username}
          onChange={(e) => actions.updateField({ field: 'username', value: e.target.value })}
        />
        {state.meta.isValidating && <span>检查中...</span>}
        {state.errors.username && <span style={{ color: 'red' }}>{state.errors.username}</span>}
      </div>

      {/* ... 其他字段 ... */}

      <button type="submit" disabled={state.meta.isSubmitting}>
        {state.meta.isSubmitting ? '提交中...' : '注册'}
      </button>
    </form>
  )
}
```

## 总结

通过这个例子，我们看到了 Logix 开发的四个标准步骤：

1.  **Schema**: 定义数据和动作。
2.  **Logic**: 使用 Fluent API 声明业务规则。
3.  **Module**: 组装并提供初始状态。
4.  **UI**: 纯粹的视图渲染。

这种分离确保了业务逻辑的可测试性和可复用性，同时让 UI 组件保持简洁。
