---
title: 跨模块通信（Cross-Module Communication）
description: 了解模块之间如何通过 $.useRemote 通信，并在不产生循环依赖的前提下互相依赖
---

# 跨模块通信（Cross-Module Communication）

在真实业务里，模块很少是“单机作战”的：
「User 用户模块」需要知道当前是谁登录的，「Order 订单模块」需要从「Product 商品模块」拿价格信息，等等。

Logix 从一开始就把这类跨模块协作当成常态，目标是让它们同时满足：

- 写法简单、可读；
- 类型安全；
- 支持 **模块之间互相依赖，但不会在导入层面产生循环引用**。

### 适合谁

- 正在用 Logix 设计中型以上应用，希望用多个 Module 分治领域，但又难免出现跨模块依赖；
- 曾在 Redux/Zustand 等方案中被“全局大 Store / 循环依赖”困扰，想要更清晰的跨模块协作模式。

### 前置知识

- 熟悉 Module / ModuleImpl 的基本概念；
- 能编写简单的 Logic，并理解 `$.use` / `$.useRemote` 的语义。

### 读完你将获得

- 一套可复用的“模块之间互相依赖但不循环 import”的组织方式；
- 会用 `$.useRemote` + Bound 风格访问其他 Module，并清楚哪些能力是“只读”的；
- 对“Module 作为领域边界”的实际落地有更清晰的感受。

本指南重点讲两件事：

- 如何用 `$.useRemote()` 在 Logic 中以 Bound 风格访问其他模块；
- 如何组织文件结构，让 **两个 Module 之间可以互相引用**，而不会出现 TypeScript/打包层面的循环依赖 —— 这一点在很多 zustand 用法里其实很难做到（通常只能拆成 slice 或一个大 store）；
- 在需要时，如何把“模块 + 初始状态 + 逻辑”打包成一个 **模块蓝图（ModuleImpl）**，方便在 AppRuntime / React 里复用，但不改变前两条的基本思路。

> 下文示例都基于 Bound API（`$`），即在 `Module.logic(($) => ...)` 回调里编排逻辑。

## 1. 使用 `$.useRemote()` 访问其他模块

在 Logic 内部，`$.useRemote(SomeModule)` 会返回一个指向目标模块的 **只读版 Bound API**，你可以：

- 用熟悉的 `onState / onAction / on` 写监听；
- 读取 state 快照；
- 通过 `actions.xxx` 向对方派发 actions。

**不能**直接修改对方的状态；所有修改都必须通过对方自己的 actions 完成。

```ts
// features/user/logic.ts
import { Effect } from 'effect'
import { UserModule } from './module'
import { AuthModule } from '../auth/module'

export const UserLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // 1. 拿到 AuthModule 的「远程 Bound」视图
    const Auth = yield* $.useRemote(AuthModule)

    // 2. 像用当前模块的 $ 一样，监听 Auth 的 token 变化
    yield* Auth.onState((s) => s.token)
      .filter((token) => !!token)
      .runLatest((token) =>
        Effect.gen(function* () {
          const profile = yield* fetchProfile(token)
          yield* $.actions.setProfile(profile)
        }),
      )
  }),
)
```

要点：

- `$.useRemote(AuthModule)` 是 **完全带类型的**：你只能看到 Auth 的 state 和 actions，不能越权访问实现细节。
- 写法上和当前模块的 `$` 尽量一致：`Auth.onState / Auth.onAction / Auth.actions.xxx(...)`。
- 跨模块通信没有额外“特殊 API”，只是在 Logic 里，**通过对方公开的 actions/选择器来协作**。

## 2. 文件结构：从设计上规避循环依赖

为了让导入关系始终干净、可控，推荐每个业务模块采用这样的文件布局：

- `features/foo/module.ts`：只定义 Module 的形状（state + actions）。
- `features/foo/logic.ts`：用 `FooModule.logic(($) => ...)` 写业务逻辑。
- （可选）`features/foo/live.ts`：放运行时接线、 Layer 组合等。

跨模块通信发生在 **各自的 `logic.ts` 文件里**，这些文件只导入其他模块的 `module.ts`：

```ts
// features/auth/module.ts
import { Schema } from 'effect/Schema'
import * as Logix from '@logix/core'

export const AuthModule = Logix.Module.make('Auth', {
  state: Schema.Struct({ token: Schema.String }),
  actions: {
    loginSuccess: Schema.String,
    logout: Schema.Void,
  },
})
```

```ts
// features/auth/logic.ts
import { Effect } from 'effect'
import { AuthModule } from './module'
import { UserModule } from '../user/module'

export const AuthLogic = AuthModule.logic(($) =>
  Effect.gen(function* () {
    const User = yield* $.useRemote(UserModule)

    // 当用户登出时，顺带清理用户信息
    yield* $.onAction('logout').run(() => $.flow.run(User.actions['user/clearProfile'](undefined)))
  }),
)
```

注意这里我们**刻意不做的事情**：

- `module.ts` 不导入任何其他模块；
- `module.ts` 也不反向导入自己的 `logic.ts`。

只要遵守这条简单规则：

- `user/logic.ts` 可以导入 `auth/module.ts`；
- `auth/logic.ts` 可以导入 `user/module.ts`；
- TypeScript/打包期看到的导入图始终是无环的，**即使运行时两边互相依赖**。

从打包器视角看，Logic 文件是一层“叶子”，它们只依赖各自的 `module.ts`，不会互相强依赖。

## 3. 互相依赖：两个模块互相使用对方

在上述结构下，让两个模块互相依赖是安全的：

- 在 `UserLogic` 里，用 `$.useRemote(AuthModule)` 响应登录状态变化；
- 在 `AuthLogic` 里，用 `$.useRemote(UserModule)` 更新用户相关数据。

因为所有跨模块访问都是 **运行时通过 `$.useRemote()`** 完成，导入层面始终是 `logic.ts` → 自己的 `module.ts` / 别人的 `module.ts`，不会出现经典的：

> store A 文件导入 store B，store B 又导入 store A，最终构成循环引用，实例不一致或初始化顺序混乱。

可以用一个心智模型来记：

- **编译期依赖图**：`logic.ts` → `module.ts`，无环；
- **运行时依赖图**：Module 之间可以是任意拓扑（A 依赖 B，B 依赖 A，都没问题），靠 App Runtime + `$.useRemote()` 来解析。

## 4. 为什么在 zustand 里这件事很难，而在 Logix 里很自然

在大多数 zustand 的写法里：

- 每个 store 通常在一个文件里通过 `createStore(...)` 创建；
- 如果 `useAStore` 需要用 `useBStore` 的数据，就直接导入 `useBStore`；
- 若 `useBStore` 再需要依赖 `useAStore`，很快就踩到 **循环导入** 或各种“懒加载 hack”。

常见的缓解方式是：

- 干脆合成一个“大 store”，所有 state/action 混在一起；
- 或者人为拆成多 slice，再在某个入口文件里做汇总 wiring。

这样虽然可以跑，但：

- 模块边界被模糊掉了；
- 跨业务域的约束和协作难以单独讨论和演进。

Logix 的路径不一样：

- **Module 只定义一次**，是纯粹的描述（`Logix.Module`，在 `module.ts` 里写 state + actions）；
- Logic 后挂（`Module.logic(($) => ...)` 在 `logic.ts` 里实现行为）；
- 跨模块通信一律通过 `$.useRemote(OtherModule)`，在当前 Logic 中拿到对方的「只读 Bound 视图」，再由 App Runtime 在运行时解析目标模块，而不是在导入层面直接拿某个 store 实例。

因此：

- 你可以保持 **细粒度、按功能划分的 Module**；
- 同时又可以在它们之间建立 **丰富的互相依赖关系**，不用为了避免循环导入而被迫合并 store 或硬拆 slices。

## 5. 使用建议（Best Practices）

1. 使用 `$.useRemote`，不要自己搞全局单例
   访问其他模块时，统一通过 `$.useRemote(OtherModule)`，避免在全局手动共享运行时实例。

2. 让 `module.ts` 保持“干净”
   只定义 state 和 actions；不要在这里导入其他模块或具体的 runtime/wiring 代码。

3. 把跨模块编排放在 Logic 层
   像搜索 → 详情、Auth → UserProfile 这种跨模块流程，统一写在各自的 `logic.ts` 里，在这里自由地 `$.useRemote` 其他模块。

4. 单条规则尽量保持单向依赖
   在同一个 Logic 文件里，优先写清晰的“单向流”（例如 User 监听 Auth）；即便另一个文件里有相反方向的规则，两条规则各自都是独立、易测试的。

5. 需要“模块蓝图”时再用 ModuleImpl
   对于大部分业务场景，只用 `Logix.Module` + `Module.logic` + `Module.live` 就足够了。
   当你希望在多个入口（例如不同页面、不同 AppRuntime）里复用同一套“模块 + 初始状态 + 逻辑 + 依赖注入”时，可以：
   - 在内部使用 `Module.implement({ initial, logics, imports?, processes? })` 生成一个 ModuleImpl；
   - 在应用层通过 Root ModuleImpl + `Logix.Runtime.make(rootImpl, { layer, onError })` 组合出 App/Page Runtime；
   - 在 React 中通过 `useModule(impl)` 或 `useLocalModule(impl)` 消费它。

   这些都是 **运行时层面的装配细节**，不会改变"Module 定义在 `module.ts`、Logic 写在 `logic.ts`、跨模块通过 `$.useRemote` 协作"这条主线，也不会引入新的循环依赖风险。

## 下一步

- 深入了解运行时架构：[深度解析](./deep-dive)
- 进入高级主题：[Suspense & Async](../advanced/suspense-and-async)
- 学习错误处理策略：[错误处理](../advanced/error-handling)
