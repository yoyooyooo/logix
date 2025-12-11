# Quickstart: 在 Module 图纸中使用 StateTrait（computed / source / link）

> 目标：用两个尽量小的例子说明「`state + actions + traits`」图纸如何配合 `StateTrait` 工作，模块作者需要写什么、Runtime 会做什么。

---

## 示例一：只用 computed + link 的 CounterWithProfile 模块

### 1. Module 图纸：state / actions / traits

```ts
// examples/logix-react/src/modules/counter-with-profile.ts
import * as Logix from "@logix/core"
import { StateTrait } from "@logix/core"
import { Schema } from "effect"

// 1) 定义 State Schema（computed 字段也当正式字段）
const StateSchema = Schema.Struct({
  a: Schema.Number,
  b: Schema.Number,
  sum: Schema.Number, // computed: a + b
  profile: Schema.Struct({
    id: Schema.String,
    name: Schema.String, // 展示/逻辑用的 name
  }),
  // 在示例实现中，将 profileResource 视为结构化对象，便于类型推导路径；
  // 实际项目中 Resource 的具体字段可以按需要扩展，这里只关心它至少有 name 字段。
  profileResource: Schema.Struct({
    name: Schema.String,
  }),
})
type State = Schema.Schema.Type<typeof StateSchema>

// 2) 定义 actions（省略细节，只看 traits）
const Actions = {
  increment: Schema.Void,
  loadProfile: Schema.String, // userId
}

// 3) 用 traits 槽位为字段打 Trait 标签
export const CounterWithProfile = Logix.Module.make("CounterWithProfile", {
  state: StateSchema,
  actions: Actions,
  traits: StateTrait.from(StateSchema)({
    // sum 是 a + b 的派生字段
    sum: StateTrait.computed((s: Readonly<State>) => s.a + s.b),

    // 示例一里 profileResource 先留空，示例二再改成 source

    // profile.name 跟随 profileResource.name（内部字段联动）
    "profile.name": StateTrait.link({
      from: "profileResource.name",
    }),
  }),
})
```

模块作者需要记住的心智只有三点：

- `state` = 完整的 State 结构（含 computed 字段）；  
- `actions` = 模块可以 dispatch 的意图；  
- `traits` = 用 StateTrait 为字段打 computed / link / source 标签。

> 类型提示补充：在 `StateTrait.from(StateSchema)({...})` 中书写 key 时，IDE 会基于 `StateSchema` 提供所有合法路径（例如 `"profile.name"`、`"profile.id"` 等）的自动补全，写错路径会直接在类型层报错；`StateTrait.computed` / `StateTrait.link` 等 API 也会基于路径推导对应字段的类型，保证 derive 函数与联动两端类型一致。

### 2. Runtime 会做什么（概念）

在 Runtime 初始化这个 Module 时：

1. Logix Runtime 调用：`const program = StateTrait.build(StateSchema, traitsSpec)`：
   - 构建 StateTraitProgram：包括 StateTraitGraph（字段拓扑）和 StateTraitPlan（执行计划）。
2. 在创建 ModuleRuntime / Logic 时调用：`StateTrait.install($, program)`：
   - 基于 Plan 为 sum 挂上“`a/b` 变化时重算”的 watcher；  
   - 基于 Plan 为 `profile.name` 挂上“`profileResource.name` 变化时同步”的 link 逻辑。

模块作者不需要自己写任何 `$.onState` / `$.state.update` glue code。

### 3. Devtools 会看到什么（概念）

基于 StateTraitProgram，Devtools 可以渲染：

- 一张 StateTraitGraph：  
  - 节点：`a` / `b` / `sum` / `profileResource.name` / `profile.name`；  
  - 边：  
    - `a -> sum`, `b -> sum`（computed）；  
    - `profileResource.name -> profile.name`（link）。
- 一条时间线：  
  - 当 `a`/`b` 变化时，出现一个 `kind="state"` 的 EffectOp 事件，说明 sum 被更新；  
  - 当 `profileResource.name` 变化时，出现一个 `link` 触发的 state 更新事件。

### 4. EffectOp + Middleware 视角（补充）

在实现层，StateTrait 不会直接操作 Bound API，而是先把 PlanStep 映射成 EffectOp，再交给 Runtime 注入的 MiddlewareStack 执行：

- 当 `a/b` 变化触发 sum 重算时，内部会构造：

  ```ts
  const effect = $.state.mutate((draft) => {
    draft.sum = derive(state) // 等价于 s.a + s.b
  })

  const op = EffectOp.make({
    kind: "state",
    name: "computed:update",
    effect,
    meta: {
      moduleId: "CounterWithProfile",
      fieldPath: "sum",
      deps: ["a", "b"],
    },
  })
  ```

- 当 `profileResource.name` 变化触发 `profile.name` 联动时，内部会构造：

  ```ts
  const effect = $.state.mutate((draft) => {
    draft.profile.name = valueFromProfileResource
  })

  const op = EffectOp.make({
    kind: "state",
    name: "link:propagate",
    effect,
    meta: {
      moduleId: "CounterWithProfile",
      from: "profileResource.name",
      to: "profile.name",
    },
  })
  ```

这些 EffectOp 会交给 Runtime 注入的 MiddlewareStack 执行；例如可以在构建 Runtime 时挂上 DebugLogger：

```ts
import * as Logix from "@logix/core"
import * as Middleware from "@logix/core/middleware"

const runtime = Logix.Runtime.make(impl, {
  layer: appLayer,
  middleware: Middleware.applyDebug([]),
})
```

这样 Devtools / 日志系统就可以统一消费 EffectOp 时间线，而 StateTrait / Logic 只负责声明“要做什么”。

---

## 示例二：为 profileResource 声明 source + Resource / Query 接线

在示例一基础上，把 `profileResource` 变成真正的远程资源字段。

### 1. Module 图纸中的改动：给 profileResource 加 source Trait

仍然是 Module 图纸层的 DSL 改动：

```ts
export const CounterWithProfile = Logix.Module.make("CounterWithProfile", {
  state: StateSchema,
  actions: Actions,
  traits: StateTrait.from(StateSchema)({
    sum: StateTrait.computed((s: Readonly<State>) => s.a + s.b),

    // profileResource 代表 "user/profile" 资源
    profileResource: StateTrait.source({
      resource: "user/profile",
      key: (s: Readonly<State>) => ({
        userId: s.profile.id,
      }),
    }),

    "profile.name": StateTrait.link({
      from: "profileResource.name",
    }),
  }),
})
```

模块作者只声明两件事：

- resourceId：`"user/profile"`；  
- key 规则：如何从 State 里计算访问这个资源需要的 key。

### 2. Runtime 层：Resource / Query 命名空间（概念示例）

**资源访问逻辑不写在 Module 里**，而是通过 Runtime 层的 `Resource` / `Query` 命名空间完成 wiring。例如：

```ts
// packages/app-runtime/src/resources/user-profile.ts
import { Effect, Schema } from "effect"
import * as Logix from "@logix/core"
import { UserProfileService } from "./services/user-profile"

// 用 Schema 描述 key 的形状，类似强类型 queryKey
const UserProfileKey = Schema.Struct({
  userId: Schema.String,
})

// ResourceSpec：把 resourceId + key + load 实现收口到一处
export const UserProfileResource = Logix.Resource.make({
  id: "user/profile",
  keySchema: UserProfileKey,
  load: ({ userId }) =>
    // 这里假定 UserProfileService.fetchById 已经返回 Effect.Effect，
    // 如需从 Promise 适配，可以用 Effect.tryPromise 包一层。
    UserProfileService.fetchById(userId),
})
```

在应用 Runtime 中组合这些能力（查询引擎部分是可选的）：

```ts
// packages/app-runtime/src/runtime.ts
import * as Logix from "@logix/core"
import { Layer } from "effect"
import { Query } from "@logix/core/middleware/query"
import { UserProfileLive } from "./services/user-profile"
import { UserProfileResource } from "./resources/user-profile"

// 例如这里可以用任意实现创建 queryClient（TanStack Query 只是一个候选）
const queryClient = createQueryClient()

const runtimeLayer = Layer.mergeAll(
  UserProfileLive,
  Logix.Resource.layer([UserProfileResource]),
  Query.layer(queryClient),
  // 基于 EffectOp(kind="service") + resourceId + key 决定：
  // - 直接调用 ResourceSpec.load(key)；
  // - 还是交给 QueryClient(resourceId, key, load) 处理。
  Query.middleware({
    useQueryClientFor: (id) => id === "user/profile",
  })
)

export const runtime = Logix.Runtime.make(AppImpl, {
  layer: runtimeLayer,
})
```

在更细粒度的路由 / 子树中，可以通过 RuntimeProvider 叠加或移除 `Query.layer` + `Query.middleware`，从而做到“这一片都走查询引擎 / 这一片直接调用 Service Tag”，而不需要修改任何 Module / Trait 声明。

### 3. StateTrait.install 在 source 上会做什么（概念）

当 StateTraitPlan 中包含 source 步骤时，`StateTrait.install` 大致会：

1. 从 Plan 中取出 `resourceId = "user/profile"` 与 `key(state)` 规则，并为每个 source 字段生成一个标准的加载入口（例如在 Bound API 上挂载 `$.traits.source.refresh("profileResource")`），该入口在被调用时执行一次对应的 `source-refresh` 计划。  
2. 当 Logic / Action / Devtools 显式调用该入口时：
   - 构造一个 `EffectOp`，`meta.kind = "service"`, `meta.name = "user/profile"`；  
   - 将 key 一并挂到 `EffectOp.meta.key`（或 payload）上；  
   - 将这个 EffectOp 交给 Middleware 总线（重试/超时/日志等）执行；  
   - 由 Resource / Query 相关 Middleware 读取 `resourceId + key`，选择：
     - 直接调用 `UserProfileResource.load(key)`（不经过查询引擎），或  
     - 通过 QueryClient 以 key 作为 queryKey 发起/复用请求；  
   - 把结果写入 `state.profileResource`，触发后续 link/computed。

模块作者仍然不需要关心 EffectOp/Middleware 细节，只需要在 Module 图纸上看：

- `profileResource` 是 `user/profile` 资源；  
- `key` 是 `profile.id`；  
- `profile.name` 跟随 `profileResource.name`。

Devtools 则可以同时呈现：

- Graph：模块依赖了 `"user/profile"`，哪些字段直接/间接依赖这个资源；  
- Timeline：每次 `kind = "service"` 的 `user/profile` 调用，以及 Resource / Query / 其他中间件（重试/超时/日志等）的参与情况。  

这就是 StateTrait + Resource / Query + Middleware 整条链路在一个最小场景里的形态。实际实现时，Trait 内核与 Resource/Query 命名空间的具体 API 会按 `data-model.md` 中的模型补全，但模块作者的心智始终停留在 Module 图纸这一层。 

---

## 示例对应的测试入口

为了确保 Quickstart 示例与实际实现长期保持一致，本特性在 `@logix/core` 中提供了两组配套测试：

- `packages/logix-core/test/StateTrait.ComputedLink.test.ts`  
  验证在简单 State Schema 上使用 `StateTrait.from` + `computed/link` 时，类型与行为（基于 meta）符合预期。

- `packages/logix-core/test/StateTrait.QuickstartExample.test.ts`  
  直接导入 `examples/logix-react/src/modules/counter-with-profile.ts`，检查：
  - Module 图纸（id / state / actions / traits）结构正确；  
  - `CounterTraits` 中的 computed / link entry 与 Quickstart 示例描述一致（`sum` 为 `a + b`，`profile.name` 跟随 `profileResource.name`）。  

在后续演进中，如需调整示例代码或 StateTrait API 形状，应同步更新上述测试，确保 Quickstart 文档始终可运行、可验证。 

---

## 扩展预览：基于 Query 的语法糖（后续阶段）

> 本小节对应 spec 中的「User Story 8（P4）」：在主线能力稳定后，为常见的 source 场景提供纯语法糖级别的 Query 帮助函数。实现优先级低于前文示例。

在前两个示例中，模块作者始终直接使用的是：

```ts
profileResource: StateTrait.source({
  resource: "user/profile",
  key: (s: Readonly<State>) => ({ userId: s.profile.id }),
})
```

在未来的 Query 集成包中，我们可以提供一些**完全基于 StateTrait.source 的语法糖**，例如：

```ts
import { StateTrait } from "@logix/core"
import { Query } from "@logix/core/middleware/query"

export const CounterWithProfile = Logix.Module.make("CounterWithProfile", {
  state: StateSchema,
  actions: Actions,
  traits: StateTrait.from(StateSchema)({
    sum: StateTrait.computed((s: Readonly<State>) => s.a + s.b),

    // 语法糖：本质等价于上面的 StateTrait.source 写法
    profileResource: Query.source<State>({
      resource: "user/profile",
      key: (s) => ({ userId: s.profile.id }),
    }),

    "profile.name": StateTrait.link({
      from: "profileResource.name",
    }),
  }),
})
```

需要强调的约束：

- `Query.source` 只是对 `StateTrait.source` 的薄包装，不改变 StateTraitProgram / StateTraitGraph 的结构，也不引入新的 Trait kind；  
- 所有与缓存 / 重试 / queryClient 相关的行为仍然由 Runtime 侧的 `Query.layer` + `Query.middleware` 决定；  
- 即使完全移除 Query 相关 Layer/Middleware，这类语法糖也必须退化为普通的 StateTrait.source 行为，确保 Module 图纸与 Trait IR 保持稳定。

随着 Trait + Middleware 主线落地，后续可以在 Query 命名空间下继续探索更多语法糖（例如基于路径的 key 推导、带失效策略的 cachedSource 等），但它们都应遵守上述原则：**不修改 StateTrait 核心协议，只在 Query / Middleware 层叠加便利性。**

---

## Phase N 笔记：端到端验证与体验观察

> 本小节记录当前从「Module 图纸 → Runtime → Devtools」这条链路的实际跑通情况，作为后续 Polish 阶段的参考。

- **端到端验证现状**  
  - `packages/logix-core` 下的 `StateTrait.Build/Install/RuntimeIntegration/EffectOpIntegration` 等测试已经覆盖了 StateTraitProgram 构建、Plan 安装以及 EffectOp/Middleware 总线的关键路径；  
  - `StateTrait.QuickstartExample.test.ts` 直接导入本 Quickstart 中的 `CounterWithProfile` 模块，验证了 `CounterStateSchema` / `CounterTraits` 与文档示例一致，并对 computed/link 行为做了最小行为校验；  
  - Query / Resource 集成通过 `Resource.test.ts` 与 `ResourceQuery.Integration.test.ts` 做了基础回归。

- **Devtools 体验观察（当前阶段）**  
  - Devtools UI 仍处于 PoC/演进阶段，当前主要通过 StateTraitProgram / StateTraitGraph / EffectOp Timeline 的结构与日志来观测行为；  
  - 典型路径是：在示例应用中挂载 DebugObserver/DebugLogger 中间件 → 观察 `kind = "state" | "service"` 的 EffectOp 序列与字段更新，验证其与 Graph 中的节点/边对应关系。

- **后续改进建议（留给 Devtools / Studio 特性）**  
  - 在 Devtools 相关文档中补充以 `CounterWithProfile` 为例的「State Graph + EffectOp 时间线」截图，直接对应本 Quickstart 的示例代码；  
  - 在 apps/docs 文档站增加一篇面向 Logix 初学者的教程，从本 Quickstart 出发，完整走一遍“编写 Module 图纸 → 在 Runtime 中挂载 → 打开 Devtools 观察 Graph/Timeline”的路径；  
  - 随着 US5/US6/US7 完成后，再回收这些观察与截图，将本 Quickstart 升级为端到端“从 Traits 到 Devtools”的权威样板。
