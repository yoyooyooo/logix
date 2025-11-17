---
title: 深度解析：Runtime / Middleware / Lifecycle
description: 从运行时视角理解 Logix 的核心抽象。
---

在企业级应用开发中，一个复杂的页面（如用户管理列表或订单详情）可以被视为一个微应用。**Root ModuleImpl + Runtime（通常通过 `Logix.Runtime.make` 构造）** 正是这个微应用的“底座”。

它负责：

1.  **组装** (`Module.make` + `Runtime.make`)：将 API、状态和 UI 能力组合在一起；
2.  **生命周期** (`Lifecycle`)：页面加载时自动拉取数据，并在适当时机清理资源；
3.  **防护**（中间件 / 约束）…：在用户交互过程中处理 Loading 状态、错误报告和权限校验。

---

### 适合谁

- 希望从 Runtime 视角理解 Logix 的“整页应用模型”（Root ModuleImpl + Runtime）的架构师/资深工程师；
- 计划在团队内抽象出通用页面骨架（如后台列表、详情页、向导），并用 Logix 作为底座来承载。

### 前置知识

- 熟悉 Module / ModuleImpl / Runtime 的基本用法；
- 读过 [Lifecycle](../essentials/lifecycle) 与 [生命周期与 Watcher 模式](./lifecycle-and-watchers)；
- 对 Effect 与 Layer 有一定直觉（如何组合多个服务 Layer）。

### 读完你将获得

- 能够从“Root ModuleImpl + Runtime”的角度设计 ToB 页面骨架；
- 知道在哪里挂载生命周期逻辑、通用中间件和调试/监控能力；
- 为后续扩展 Runtime Adapter（CLI、微前端容器等）打下概念基础。

---

下文以 CRM 用户列表为例，展示 Runtime 模型中各部分的角色。如果你更关心如何一步步实现页面本身，请优先阅读「教程：复杂列表查询」；若你关心的是"这些代码在引擎视角如何拼装"，可以继续看本篇。

## 1. 定义 Module Schema

```ts
// UserListModule.ts
	import * as Logix from '@logix/core'
	import { Schema } from 'effect'

	export const UserListDef = Logix.Module.make('UserList', {
	  state: Schema.Struct({
	    list: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
	    roles: Schema.Array(Schema.String),
	    loading: Schema.Boolean,
	  }),
	  actions: {
	    deleteUser: Schema.String,
	    refresh: Schema.Void,
	  },
	})
```

## 2. 定义 Lifecycle Logic

```ts
	// UserListLogic.ts
	import { Effect } from 'effect'

	export const LifecycleLogic = UserListDef.logic(($) => {
	  // 页面初始化：拉取数据（setup-only 注册，Runtime 统一调度执行）
	  $.lifecycle.onInit(
	    Effect.gen(function* () {
      yield* $.state.update((s) => ({ ...s, loading: true }))

      const [users, roles] = yield* Effect.all([UserApi.list(), RoleApi.list()])

      yield* $.state.update((s) => ({
        ...s,
        list: users,
        roles: roles,
        loading: false,
      }))
    }),
  )

  // 页面销毁：清理
  $.lifecycle.onDestroy(Effect.log('页面已关闭，资源已清理'))

  return Effect.void
})
```

## 3. 交互防护（EffectOp 总线 & Middleware）

交互逻辑（如删除用户）同样写在 Logic 中，并由 Middleware 进行防护。

```ts
	// UserListLogic.ts (续)
	export const InteractionLogic = UserListDef.logic(($) =>
	  Effect.gen(function* () {
    const delete$ = $.flow.fromAction('deleteUser')

    const deleteImpl = (userId: string) =>
      Effect.gen(function* () {
        yield* UserApi.delete(userId)
        yield* $.state.update((s) => ({
          ...s,
          list: s.list.filter((u) => u.id !== userId),
        }))
        yield* ToastService.success('删除成功')
      })

    // 运行带防护的流程：
    // - Runtime 会将每次 deleteImpl 执行提升为 EffectOp(kind = "flow")；
    // - 全局 MiddlewareStack 可以在 EffectOp 层挂载错误 Toast / Loading 等横切能力。
    yield* delete$.pipe(
      $.flow.run((userId) =>
        Effect.gen(function* () {
          yield* WithLoading(
            WithErrorToast(
              deleteImpl(userId),
              { name: 'deleteUser' },
            ),
          )
        }),
      ),
    )
  }),
)
```

## 4. 生成运行时 (`ModuleDef.implement` + `Logix.Runtime.make`)

最后，`ModuleDef.implement` 将所有部分组合在一起，而 `Logix.Runtime.make` 将 Root program module（或其 `ModuleImpl`）与基础设施 Layer 组合成可运行的 Runtime。

```typescript
export const UserListModule = UserListDef.implement({
  initial: { list: [], roles: [], loading: false },
  logics: [LifecycleLogic, InteractionLogic],
})

export const UserListImpl = UserListModule.impl

export const UserListRuntime = Logix.Runtime.make(UserListModule, {
  layer: AppInfraLayer,
})
```

这个 `Runtime` 可以在 React 中通过 `RuntimeProvider runtime={UserListRuntime}` 挂载，也可以在测试环境中直接使用 `UserListRuntime.run*` 运行 Effect。

## 5. 领域模块：表单与查询（同源 imports）

在真实业务里，“表单”和“查询”往往是页面最核心的两类能力。Logix 推荐把它们也当成**普通模块**来组合：  
它们以 `ModuleImpl` 的形式被 Root `imports` 引入，和其他模块共享同一套 Runtime、调试与回放能力，从而避免“表单状态”和“页面 Store 状态”割裂成两套事实源。

### 5.1 表单：`@logix/form`

`@logix/form` 提供 `Form.make(...)` 作为高层入口，它返回一个模块对象，其中 `impl` 可以直接被 imports 引入：

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'
import * as Form from "@logix/form"

	export const UserForm = Form.make('UserForm', {
	  values: Schema.Struct({ name: Schema.String }),
	  initialValues: { name: '' },

  // 两阶段触发（对标 RHF mode/reValidateMode）：
  // - 首次提交前：按 validateOn 控制是否自动校验（默认 ["onSubmit"]）
  // - 首次提交后：按 reValidateOn 控制是否自动校验（默认 ["onChange"]）
  validateOn: ['onSubmit'],
	  reValidateOn: ['onChange'],
	})

	// RootDef = Logix.Module.make(...)
	export const RootModule = RootDef.implement({
	  initial: { /* ... */ },
	  imports: [UserForm.impl],
	})

export const RootImpl = RootModule.impl
```

表单的错误树会被统一组织为 `$list/rows[]` 形态：数组字段 `a.0.x` 的错误路径会写到 `errors.a.rows.0.x`；列表级与行级错误分别写入 `errors.a.$list` 与 `errors.a.rows.0.$item`（便于跨行校验与行级提示同时存在）。

除了 React 组件内调用，你也可以在 Logic 中通过 `$.use(UserForm)` 触发默认动作（React/Logic 一致）：`controller.validate` / `controller.validatePaths` / `controller.reset` / `controller.setError` / `controller.clearErrors` / `controller.handleSubmit`。

在 React 中推荐用 selector 订阅表单“视图状态”，避免因为订阅整棵 values/errors 导致无谓重渲染：

```ts
import { useForm, useFormState } from '@logix/form/react'

const form = useForm(UserForm)
const canSubmit = useFormState(form, (v) => v.canSubmit)
```

更完整的表单文档主线见：[Form（表单）](../../form)。

### 5.2 查询：`@logix/query`

`@logix/query` 把“查询参数 → 资源加载 → 结果快照”收口为一个模块：查询结果存放在模块 state 上（可被订阅、可被调试、可被回放）。

```ts
import { Schema } from 'effect'
import * as Query from '@logix/query'

export const SearchQuery = Query.make('SearchQuery', {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: '' },
  queries: {
    list: {
      resource: { id: 'user/search' },
      deps: ['params.q'],
      key: (state) => (state.params.q ? { q: state.params.q } : undefined),
    },
  },
})
```

当你需要缓存/去重/失效等引擎能力时，可以在 Runtime scope 内注入外部引擎，并在 EffectOp 中间件层启用接管点。更完整的入门→高级主线见：[查询（Query）](./query)。

这样 Query 与 Form 都能在同一个“模块 → imports → Root Runtime”的组合链路里工作，保持 API 形状一致、调试方式一致。

## 总结

Logix 的“魔法”其实就是一组明确定义的转换：

1.  **Schema**：定义类型契约。
2.  **Module**：定义标识符和依赖关系。
3.  **Logic**：定义副作用和状态变更。
4.  **Bound API**：连接 Logic 与 Runtime 的桥梁。
5.  **实例**：`Module.implement` 组合状态与逻辑，形成 Root ModuleImpl。
6.  **执行**：`Logix.Runtime.make` 组装并启动应用或页面 Runtime。

## 下一步

恭喜你完成了 Learn 核心概念的学习！接下来可以：

- 进入高级主题：[Suspense & Async](../advanced/suspense-and-async)
- 学习测试策略：[测试](../advanced/testing)
- 查看 React 集成指南：[React 集成](../recipes/react-integration)
