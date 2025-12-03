---
title: "深度解析：ToB 页面解剖"
description: 理解 LogixRuntime、Middleware 和 Lifecycle 如何协同工作。
---



在企业级应用开发中，一个复杂的页面（如用户管理列表或订单详情）可以被视为一个微应用。**Root ModuleImpl + Runtime（通常通过 `LogixRuntime.make` 构造）** 正是这个微应用的“底座”。

它负责：
1.  **组装** (`buildModule`)：将 API、Store 和 UI 能力组合在一起。
2.  **生命周期** (`Lifecycle`)：页面加载时自动拉取数据。
3.  **防护** (`Logic.secure`)：在用户交互过程中处理 Loading 状态、错误报告和权限校验。

---

## 1. 场景：CRM 用户列表页

我们将实现一个标准的 CRM 用户列表页，需求如下：
1.  **初始化**：页面打开时，并发获取“用户列表”和“角色字典”。
2.  **删除**：点击删除 -> 确认 -> 显示 Loading -> 调用 API -> 显示成功 -> 刷新列表。
3.  **异常处理**：任何 API 错误都显示 Toast 通知。

## 2. 定义与组装 (`Logix.Module` + `Module.make`)

首先，我们定义模块的“形状”（State & Action）及其依赖。我们使用 **Module-First** 风格。

```ts
// UserListModule.ts
import { Logix, Schema } from '@logix/core';

// 1. 定义形状 (Schema)
const StateSchema = Schema.Struct({
  list: Schema.Array(UserSchema),
  roles: Schema.Array(RoleSchema),
  loading: Schema.Boolean
});

const ActionSchema = {
  deleteUser: Schema.Struct({ id: Schema.String })
};

// 2. 定义模块 (Tag + Shape)
export const UserListModule = Logix.Module("UserList", {
  state: StateSchema,
  actions: ActionSchema
});

// 3. 组装 Root ModuleImpl + Runtime
export const UserListImpl = UserListModule.make({
  initial: { list: [], roles: [], loading: false },
  logics: [LifecycleLogic, InteractionLogic],
  // imports 用于引入其它模块或 Service Layer
  imports: [HttpClientModuleLive, UIComponentModuleLive],
});

export const UserListRuntime = LogixRuntime.make(UserListImpl, {
  layer: AppInfraLayer,
});
```

> **Module-First 哲学**：`UserListModule` 只是一个定义（Tag）。真正的运行时实例是通过 `UserListLive` 提供的。

## 3. 页面初始化 (`$.lifecycle`)

初始化逻辑本质上也是一段 Logic。我们使用 `$.lifecycle` 来定义 `onInit` / `onDestroy`。

```ts
// UserListLogic.ts
export const LifecycleLogic = UserListModule.logic(($) => Effect.gen(function* () {
  // 页面初始化：并发数据获取
  yield* $.lifecycle.onInit(Effect.gen(function* () {
    yield* $.state.update(s => ({ ...s, loading: true }));

    // 并发请求
    const [users, roles] = yield* Effect.all([
      UserApi.getList(),
      UserApi.getRoles()
    ], { concurrency: "unbounded" });

    yield* $.state.update(s => ({
      ...s,
      list: users,
      roles: roles,
      loading: false
    }));
  }));

  // 页面销毁：清理
  yield* $.lifecycle.onDestroy(
    Effect.log("页面已关闭，资源已清理")
  );
}));
```

## 4. 交互防护 (`Logic.secure` & Middleware)

交互逻辑（如删除用户）同样写在 Logic 中，并由 Middleware 进行防护。

```ts
// UserListLogic.ts (续)
export const InteractionLogic = UserListModule.logic(($) => Effect.gen(function* () {
  const delete$ = $.flow.fromAction("deleteUser");

  const deleteImpl = (userId: string) => Effect.gen(function* () {
    yield* UserApi.delete(userId);
    yield* $.state.update(s => ({
      ...s,
      list: s.list.filter(u => u.id !== userId)
    }));
    yield* ToastService.success("删除成功");
  });

  // 运行带防护的流程
  yield* delete$.pipe(
    $.flow.run(
      Logic.secure(
        deleteImpl,
        { name: "deleteUser" },
        WithErrorToast, // 自动错误 Toast
        WithLoading     // 自动 Loading
      )
    )
  );
}));

## 5. 生成运行时 (`Module.make` + `LogixRuntime.make`)

最后，`Module.make` 将所有部分组合在一起，而 `LogixRuntime.make` 将 Root ModuleImpl 与基础设施 Layer 组合成可运行的 Runtime。

```typescript
export const UserListImpl = UserListModule.make({
  initial: { list: [], roles: [], loading: false },
  logics: [LifecycleLogic, InteractionLogic],
});

export const UserListRuntime = LogixRuntime.make(UserListImpl, {
  layer: AppInfraLayer,
});
```

这个 `Runtime` 可以在 React 中通过 `RuntimeProvider runtime={UserListRuntime}` 挂载，也可以在测试环境中直接使用 `UserListRuntime.run*` 运行 Effect。

## 总结

Logix 的“魔法”其实就是一组明确定义的转换：

1.  **Schema**：定义类型契约。
2.  **Module**：定义标识符和依赖关系。
3.  **Logic**：定义副作用和状态变更。
4.  **Bound API**：连接 Logic 与 Runtime 的桥梁。
5.  **实例**：`Module.make` 组合状态与逻辑，形成 Root ModuleImpl。
6.  **执行**：`LogixRuntime.make` 组装并启动应用或页面 Runtime。
```
