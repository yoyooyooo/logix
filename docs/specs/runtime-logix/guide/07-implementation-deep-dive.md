# Deep Dive: Anatomy of a ToB Page (CRM User List)

> **Status**: Guide (v3)
> **Goal**: 用一个真实的 **“CRM 用户列表页”** 场景，讲清楚 `Logix.app` 是如何把 Middleware、Lifecycle、buildModule 这些概念串起来的。

在 ToB 前端开发中，我们通常把一个复杂的页面（如用户管理、订单详情）视为一个微应用。**`Logix.app` 就是这个微应用的“底座”**。

它负责：
1.  **组装** (`buildModule`)：把 API、Store、组件库能力拼在一起。
2.  **启动** (`Lifecycle`)：页面加载时自动拉取字典、列表数据。
3.  **防护** (`Logic.secure`)：用户点“删除”时，自动处理 Loading、报错提示和权限校验。

---

## 1. 场景：CRM 用户列表页

我们要实现一个标准的 ToB 列表页，需求如下：
1.  **进场加载**：页面打开时，并发请求“用户列表”和“角色字典”。
2.  **删除操作**：点击删除 -> 弹窗确认 -> 显示 Loading -> 调用 API -> 成功提示 -> 刷新列表。
3.  **异常处理**：任何 API 报错都要弹 Toast。

## 2. 定义与组装 (`Logix.Module`)

首先，我们定义模块的“形状”（State & Action）和依赖关系。
在 v3 中，我们不再直接写 `Logix.ModuleRuntime.make`，而是使用 **Module-First** 风格。

```ts
// UserListModule.ts

// 1. 定义形状 (Schema)
const StateSchema = Schema.Struct({
  list: Schema.Array(UserSchema),
  roles: Schema.Array(RoleSchema),
  loading: Schema.Boolean
})

const ActionSchema = {
  deleteUser: Schema.Struct({ id: Schema.String })
}

// 2. 定义模块 (Tag + Shape)
export const UserListModule = Logix.Module("UserList", {
  state: StateSchema,
  actions: ActionSchema
})

// 3. 组装 (Logix.app)
// Logix.app 启动时，会把这些零件拼在一起
export const UserListApp = Logix.app({
  // 依赖：HTTP 能力、UI 组件库
  imports: [HttpClientModule, UIComponentModule],

  // 服务：提供本模块的 Live 实例
  providers: [
    Logix.provide(UserListModule, UserListLive) // 见下文 UserListLive
  ]
})
```

> **Module-First 哲学**：`UserListModule` 只是一个定义（Tag），真正的运行时实例是通过 `UserListLive` 提供的。

## 3. 页面启动 (`$.lifecycle`)

页面加载时的初始化逻辑，本质上也是一段 Logic。
我们使用 `$.lifecycle` 来定义 `onInit` / `onDestroy`，而不是写在配置对象里。

```ts
// UserListLogic.ts

export const LifecycleLogic = UserListModule.logic(($) => Effect.gen(function* () {
  // 页面初始化：并发拉取数据 (阻塞模式：数据加载完才算 Ready)
  yield* $.lifecycle.onInit(Effect.gen(function* () {
    // 开启 Loading
    yield* $.state.update(s => ({ ...s, loading: true }))

    // 并发请求：用户列表 + 角色字典
    const [users, roles] = yield* Effect.all([
      UserApi.getList(),
      UserApi.getRoles()
    ], { concurrency: "unbounded" })

    // 写入状态
    yield* $.state.update(s => ({
      ...s,
      list: users,
      roles: roles,
      loading: false
    }))
  }))

  // 页面销毁：清理资源
  yield* $.lifecycle.onDestroy(
    Effect.log("页面已关闭，资源已清理")
  )
}))
```

> **Logix.app 的作用**：它保证 `onInit` 只在 Scope 创建时（页面启动）跑一次。

## 4. 交互防护 (`Logic.secure` & Middleware)

交互逻辑（如删除用户）同样写在 Logic 中，并使用 Middleware 进行防护。

```ts
// UserListLogic.ts (续)

export const InteractionLogic = UserListModule.logic(($) => Effect.gen(function* () {
  // 监听删除动作
  const delete$ = $.flow.fromAction("deleteUser")

  // 纯粹的业务逻辑
  const deleteImpl = (userId: string) => Effect.gen(function* () {
    yield* UserApi.delete(userId)
    yield* $.state.update(s => ({
      ...s,
      list: s.list.filter(u => u.id !== userId)
    }))
    yield* ToastService.success("删除成功")
  })

  // 运行流 (带防护)
  yield* delete$.pipe(
    $.flow.run(
      Logic.secure(
        deleteImpl,
        { name: "deleteUser" },
        WithErrorToast, // 自动弹错
        WithLoading     // 自动 Loading
      )
    )
  )
}))
```

## 5. 生成运行时 (`Module.live`)

最后，我们把初始状态和所有 Logic 组合成一个可运行的 Live 实例。

```ts
// UserListLive.ts

export const UserListLive = UserListModule.live(
  // 初始状态
  { list: [], roles: [], loading: false },

  // 逻辑组合
  LifecycleLogic,
  InteractionLogic
)
```

## 6. 总结：Logix.app 的“一站式”体验

通过 **Module-First** API，我们把所有东西都收敛到了 `Logix.Module` 体系下：

1.  **定义**：`Logix.Module` 定义形状。
2.  **逻辑**：`Module.logic` 编写业务 (`$.flow`) 和生命周期 (`$.lifecycle`)。
3.  **实例**：`Module.live` 组合状态与逻辑。
4.  **运行**：`Logix.app` 组装并启动一切。

开发者不再需要关心 `Logix.ModuleRuntime.make` 这种底层 API，只需关注“定义模块 -> 写逻辑 -> 组合 Live”这三步曲。
