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

export const UserListModule = Logix.Module.make('UserList', {
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

export const LifecycleLogic = UserListModule.logic(($) =>
  Effect.gen(function* () {
    // 页面初始化：拉取数据
    yield* $.lifecycle.onReady(
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
    yield* $.lifecycle.onDestroy(Effect.log('页面已关闭，资源已清理'))
  }),
)
```

## 3. 交互防护（EffectOp 总线 & Middleware）

交互逻辑（如删除用户）同样写在 Logic 中，并由 Middleware 进行防护。

```ts
// UserListLogic.ts (续)
export const InteractionLogic = UserListModule.logic(($) =>
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

## 4. 生成运行时 (`Module.implement` + `Logix.Runtime.make`)

最后，`Module.implement` 将所有部分组合在一起，而 `Logix.Runtime.make` 将 Root ModuleImpl 与基础设施 Layer 组合成可运行的 Runtime。

```typescript
export const UserListImpl = UserListModule.implement({
  initial: { list: [], roles: [], loading: false },
  logics: [LifecycleLogic, InteractionLogic],
})

export const UserListRuntime = Logix.Runtime.make(UserListImpl, {
  layer: AppInfraLayer,
})
```

这个 `Runtime` 可以在 React 中通过 `RuntimeProvider runtime={UserListRuntime}` 挂载，也可以在测试环境中直接使用 `UserListRuntime.run*` 运行 Effect。

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
