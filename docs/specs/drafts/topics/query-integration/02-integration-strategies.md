---
title: Logix 接入 TanStack Query 的两级集成策略（草稿）
status: draft
version: 2025-11-30
value: extension
priority: next
---

## 0. 背景与问题陈述

在典型的前端项目里，TanStack Query（下称 RQ，原 react-query）已经成为事实上的“服务端状态（Server State）”标准组件：

- 负责缓存、失效策略、请求去重、重试等；
- 通常以 `useQuery` / `useInfiniteQuery` 等 Hook 的形式直接在组件里使用。

当前 intent-flow / runtime-logix 的目标之一，是让：

- 业务开发者在 UI 层只写 `useModule` / `useSelector` 等 Logix Hook，不再写 `useEffect` 和“Query + dispatch”的胶水；
- Logix 成为 UI 决策（loading / error / 展示）的唯一事实源；
- 架构师可以在 Logix 之上提供 `@logix/query` 之类的扩展包，对接 RQ，但对业务层暴露的 API 仍然保持统一形状（Module / Logic / Link），且类型安全。
- 从开发者视角，希望他始终只需要理解 `Module / Logic / Link` 这三个一等概念：  
  RQ 的集成细节（QueryClient / Observer / Adapter 等）尽量藏在扩展包与 platform 代码中。

本草稿尝试从“最低封装成本”出发，先理清：**如果我们完全不做 Adapter / Link Factory，只用 Effect API 在 Logic 里直接玩 TanStack Query 核心能力，能做到什么？有何利弊？** 然后再对比需要额外封装时可以引入哪些模式。

> 约束前提：
> - 一律使用 TanStack Query Core（`QueryClient` / `QueryObserver`），而不是 React Hook API；
> - 所有副作用都运行在 Logix Logic / Link 中，不在 React 组件里使用 `useEffect` 或 `useQuery`；
> - UI 侧只通过 Logix state/selector 读取数据与 loading/error 状态。

---

## 1. 零封装方案：在 Logic 内直接使用 Effect API 调 TanStack Query Core

### 1.1 环境与服务定义（Env Integration）

第一步，将 `QueryClient` 作为一个普通的 Effect Service 注入 Logix Runtime 环境：

```ts
// infra/QueryClientEnv.ts
import { Context, Effect } from "effect"
import { QueryClient } from "@tanstack/query-core"

export class QueryClientTag extends Context.Tag("QueryClient")<
  QueryClientTag,
  QueryClient
>() {}

// 在 AppRuntime 组合层：构造并注入一个共享的 QueryClient 实例
const queryClientLayer = Effect.gen(function* () {
  const client = new QueryClient({
    // 默认配置：staleTime / retry 等
  })
  return client
}).pipe(Effect.map((client) => Context.make(QueryClientTag, client)))
```

在 `Logix.app` 或运行时装配层，将 `queryClientLayer` 与其他 Infra Layer 合并，保证所有 Logic 都能通过 `yield* QueryClientTag` 获取同一个客户端实例。

### 1.2 同步式场景：直接 `fetchQuery` + 状态回填

对于“按需加载一次”的场景（例如详情页进入时加载一次用户信息），不用任何 Adapter/Link，也可以直接在 Logic 内调用 RQ 的 `fetchQuery` 并回填状态：

```ts
// features/user/UserModule.ts
export const UserModule = Logix.Module("User", {
  state: UserStateSchema,
  actions: {
    load: Schema.Struct({ id: Schema.String }),
    setData: UserDataSchema,
    setLoading: Schema.Boolean,
    setError: Schema.optional(Schema.String)
  }
})

// features/user/User.logic.ts
export const LoadUserLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // 监听 load 动作
    const load$ = $.flow.fromAction(
      (a): a is { _tag: "load"; payload: { id: string } } => a._tag === "load"
    )

    // 获取 QueryClient Service
    const queryClient = yield* QueryClientTag

    yield* load$.pipe(
      $.flow.runLatest(({ payload }) =>
        Effect.gen(function* () {
          // 1) 写入 loading 状态
          yield* $.actions.setLoading(true)

          // 2) 调用 RQ fetchQuery（包含缓存）
          const data = yield* Effect.tryPromise({
            try: () =>
              queryClient.fetchQuery({
                queryKey: ["user", payload.id],
                queryFn: () => UserApi.fetchUser(payload.id)
              }),
            catch: (e) => e as Error
          })

          // 3) 回填数据/错误
          if (data instanceof Error) {
            yield* $.actions.setError(data.message)
          } else {
            yield* $.actions.setData(data)
            yield* $.actions.setError(undefined)
          }

          yield* $.actions.setLoading(false)
        })
      )
    )
  })
)
```

特点：

- **缓存由 QueryClient 负责**：`fetchQuery` 会命中已有缓存，不会总是发网络请求；
- **状态由 Logix 承担**：只要 UI 只看 `UserModule` 的 `state`（data/loading/error），组件本身完全不用关心 RQ。

适用场景：

- 详情页 “进入时加载一次”；  
- 点击某个按钮触发“拉取最新配置一次”等。

### 1.3 响应式场景：手写状态驱动 + 缓存 + 失效

对于“由 Logix state 变化驱动请求，并希望复用 RQ 缓存”的场景（列表筛选、分页等），同样可以在 Logic 里直接用 RQ Core 实现：

```ts
// features/list/ListModule.ts
export const ListModule = Logix.Module("List", {
  state: ListStateSchema, // 包含 filters/pagination/list/meta 等
  actions: {
    setFilters: FiltersSchema,
    setPage: Schema.Number,
    setData: ListDataSchema,
    setLoading: Schema.Boolean,
    setError: Schema.optional(Schema.String)
  }
})

export const LoadListLogic = ListModule.logic(($) =>
  Effect.gen(function* () {
    const queryClient = yield* QueryClientTag

    // 当 filters 或 pagination 变化时重新加载
    const params$ = $.flow.fromState((s) => ({
      filters: s.filters,
      page: s.pagination.page,
      pageSize: s.pagination.pageSize
    }))

    yield* params$.pipe(
      $.flow.debounce(200),
      $.flow.runLatest(({ filters, page, pageSize }) =>
        Effect.gen(function* () {
          yield* $.actions.setLoading(true)

          const queryKey = ["list", { filters, page, pageSize }] as const

          const data = yield* Effect.tryPromise({
            try: () =>
              queryClient.fetchQuery({
                queryKey,
                queryFn: () =>
                  ListApi.search({
                    filters,
                    page,
                    pageSize
                  })
              }),
            catch: (e) => e as Error
          })

          if (data instanceof Error) {
            yield* $.actions.setError(data.message)
          } else {
            yield* $.actions.setData(data)
            yield* $.actions.setError(undefined)
          }

          yield* $.actions.setLoading(false)
        })
      )
    )
  })
)
```

特点：

- 业务逻辑（何时加载，filters/page 如何组合）完全由 Logix 控制；
- RQ 只负责缓存 + 请求控制；
- UI 仍然只关心一个 Module 的 state，组件内零 `useEffect`。

不足：

- 每个 Feature 都要手写“监听 state → 调 Query → 回填”的套路；
- 没有统一的错误处理/埋点/重试策略，难以平台化；
- 即使使用 `runLatest` 等 Flow 工具，对于防抖/幂等等策略，仍然需要每次显式编写。

### 1.4 手动订阅 Query 状态流（通过 Observer）

上面的例子使用 `fetchQuery` 是“拉”的模式。如果希望更贴近 “React Query 的观察者模式”，可以在 Logic 中直接使用 `QueryObserver`，并将其事件桥接为 Stream：

```ts
import { QueryObserver } from "@tanstack/query-core"
import { Stream, Effect } from "effect"

const observer = new QueryObserver(queryClient, {
  queryKey,
  queryFn,
  // ...
})

// 将 RQ 的订阅回调包装成 Effect Stream
const result$ = Stream.async<ObserverResult<any>>((emit) =>
  Effect.sync(() => {
    const unsubscribe = observer.subscribe((result) => {
      emit(Effect.succeed(result))
    })
    return Effect.sync(unsubscribe)
  })
)
```

然后在 Logic 中订阅 `result$`，并回填 Logix state。  
这种模式更接近“Runtime Adapter”，但纯从 API 看，仍然只是 Effect + Stream 的组合，并未引入 Adapter 概念。

### 1.5 结合 `$.lifecycle` 管理 RQ 资源的启示

在上述几种“零封装”写法中，尤其是基于 `QueryObserver` 的方案，本质上都会在模块生命周期内持有一坨长期存在的外部资源（Observer / 订阅函数等）。这类“活期资源”更适合挂在 `$.lifecycle` 上，而不是直接写在 Logic 顶层：

```ts
export const UserQueryLifecycleLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    const queryClient = yield* QueryClientTag

    // 通过 lifecycle 确保 Observer 的创建与销毁和 Module Scope 绑定
    yield* $.lifecycle.onInit(
      Effect.gen(function* () {
        const observer = new QueryObserver(queryClient, {
          queryKey: ["user", /* ... */],
          queryFn: ({ queryKey }) => UserApi.fetchUser(queryKey[1] as string)
        })

        const result$ = Stream.async<ObserverResult<any>>((emit) =>
          Effect.sync(() => {
            const unsubscribe = observer.subscribe((result) => {
              emit(Effect.succeed(result))
            })
            return Effect.sync(unsubscribe)
          })
        )

        // 在 Scope 内消费结果流并回填 state
        return Stream.runForEach(result$, (res) =>
          Effect.gen(function* () {
            if (res.status === "success") {
              yield* $.actions.setData(res.data)
            } else if (res.status === "error") {
              yield* $.actions.setError(String(res.error))
            }
            // 根据需要更新 loading 等
          })
        )
      })
    )
  })
)
```

这种模式带来的启示是：

- **长期存在的外部资源**（如 RQ Observer、WebSocket 连接），尽量通过 `$.lifecycle.onInit / onDestroy` 管理，而不是直接在 Logic 顶层创建；
- **事件驱动的业务逻辑**（如 filters/page 变化触发加载）仍通过 `$.flow` / `$.onState` / `$.onAction` 实现；
- 将来在 `@logix/query` 等扩展包中，可以以 `$.lifecycle` 作为主要挂载点：  
  由扩展包在 lifecycle 内创建并管理 RQ Observer，业务代码只需配置“Key / Params / Result → State/Action 的映射”，保持 Module/Logic 的统一形状。

### 1.6 Logic 拆分建议：用独立 Logic 收编原来的 `useQuery`

从“把旧代码迁到 Logix”角度，推荐的心智是：

> 原来组件里每一个 `useQuery(...)`，在 Logix 时代对应一段专门负责“请求 + 缓存 + 回填”的 Logic。

一个典型的迁移对比：

**旧写法（组件内 useQuery + 手动处理）**

```tsx
// UserProfile.tsx (旧)
const { data, isLoading, error } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => UserApi.fetchUser(userId),
})

if (isLoading) return <Skeleton />
if (error) return <ErrorBox msg={String(error)} />

return <UserView user={data} />
```

**新写法（Module + UserRQLogic + useModule）**

```ts
// UserModule.ts
export const UserModule = Logix.Module("User", {
  state: Schema.Struct({
    userId: Schema.String,
    data: UserSchema,
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String)
  }),
  actions: {
    setUserId: Schema.String,
    setData: UserSchema,
    setLoading: Schema.Boolean,
    setError: Schema.optional(Schema.String)
  }
})

// UserRQ.logic.ts —— 专门的 RQ 查询逻辑
export const UserRQLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    const queryClient = yield* QueryClientTag

    // 当 userId 变化时重新拉取
    const id$ = $.flow.fromState((s) => s.userId)

    yield* id$.pipe(
      $.flow.filter((id) => !!id),
      $.flow.runLatest((id) =>
        Effect.gen(function* () {
          yield* $.actions.setLoading(true)
          const data = yield* Effect.tryPromise({
            try: () =>
              queryClient.fetchQuery({
                queryKey: ["user", id],
                queryFn: () => UserApi.fetchUser(id)
              }),
            catch: (e) => e as Error
          })
          if (data instanceof Error) {
            yield* $.actions.setError(data.message)
          } else {
            yield* $.actions.setData(data)
            yield* $.actions.setError(undefined)
          }
          yield* $.actions.setLoading(false)
        })
      )
    )
  })
)

// runtime.ts —— 装配
export const UserLive = UserModule.live(initialState, UserRQLogic /*, 其它业务 Logic */)
```

```tsx
// UserProfile.tsx (新)
export const UserProfile = () => {
  const { state, actions } = useModule(UserModule)

  // 组件只关心 state，不再直接触碰 Query
  if (state.isLoading) return <Skeleton />
  if (state.error) return <ErrorBox msg={state.error} />

  return (
    <div>
      <UserView user={state.data} />
      <button onClick={() => actions.setUserId("next-id")}>Next User</button>
    </div>
  )
}
```

实践建议：

- 对于大多数场景，可以按“一个 useQuery → 一段 RQ Logic”的粒度来拆分；  
- 其他纯本地 Logic（比如字段联动、UI 状态）仍写在自己的 Logic 文件里，通过 state/action 与这段 RQ Logic 交互；  
- 如果发现多段查询逻辑天然绑在一起，再考虑合并成一个“场景级 RQ Logic”，而不是一开始就写成一坨“大 Logic”。 

---

## 2. 零封装方案的优点与局限

### 2.1 优点：极简心智 + 立即可用

- 对业务工程师：
  - 不需要理解 Adapter 或 Link，只需要在 Logic 中写 Effect 代码；
  - “我就是在自己的模块里调用一个 Service（QueryClient）再回填状态”，符合直觉。
- 对架构师：
  - 不需要一开始就设计 `@logix/query` 的完整 API；
  - 可以先在几个核心 Feature 里试水，探索最合适的缓存/并发/错误处理模式，再考虑抽象。

### 2.2 局限：模式重复 & 难以平台级统一

1. **重复的 glue 逻辑**  
   - 每个模块都要反复写：
     - “监听 filters/page 变化 → 调 RQ → 回填 data/loading/error”的套路；
     - 防抖、去抖、最新优先等模式靠工程师自觉；
   - 很容易出现 N 种略有差异的写法，增加维护成本。

2. **策略分散，难以统一升级**  
   - 如果想统一调整“所有列表查询的重试策略/错误提示/埋点行为”，必须去改散落在各个 Logic 里的代码；
   - 难以在平台层实现“全局开关”或“按场景插拔策略”。

3. **对 TypeScript 友好但对 DX 稍有门槛**  
   - 虽然所有调用都在单一语言（Effect + Schema）中进行，但：
     - QueryKey / Params / Result 类型需要在每个 Logic 中显式书写；
     - `fetchQuery` vs `QueryObserver` 的选择留给业务工程师，导致使用风格不统一。

4. **外部引擎被当作普通 Service，非“第一类 Module”**  
   - 从 runtime-logix 的“Everything is a Module” 视角看，RQ 被视为一个 Service，而不是可视化拓扑中的一个节点；
   - 对后续 Studio/Universe 视图而言，很难对这些“隐性集成”做解析和展示。

---

## 3. 与 Adapter/Link 模式的关系

本草稿故意不引入 Adapter/Link Factory，只关注“最低封装成本”的集成方式。  
然而，从长期平台视角看，Adapter/Link 模式仍然有明显优势：

- **统一 API 形状**：  
  - 将 RQ 投影为 `AdapterShape<I, O>`（输入/输出）或“虚拟模块”，使 Link 写法与模块间协作同构；
  - 架构师可以在 `@logix/query` 中封装一套 createQueryLink 工厂，业务只填 `mapParams` / `mapData` 等。

- **平台可观测性**：  
  - Link/Adapter 可以作为拓扑中的一等节点被记录和可视化；
  - Studio 可以基于这些 Link 进行“无代码重配”，而无需修改业务 Logic。

> 重要的是：即便未来引入 Adapter/Link 工厂，对业务开发者暴露的仍然是 `Module / Logic / Link` 这套 API 轮廓：  
> - 他看到的是“某个 Module 通过 Link 与 RQ 产生数据关系”；  
> - Adapter/Observer 只作为扩展包内部实现存在，不需要成为业务心智中的第四个核心概念。

因此，更合理的路线是：

1. 短期：允许并鼓励在 Logic 中直接使用 Effect API + RQ Core 集成 Query，尤其是在：
   - 场景较简单；
   - 暂时没有统一平台要求；
   - 团队更熟悉 RQ 的情况下。
2. 中期：在实践中沉淀出稳定模式后，将“监听 state → 调 Query → 回填”的套路抽象为：
   - Adapter（RQ→Stream/Effect 形状）；
   - Link 工厂（标准化防抖/并发/错误处理），封装到独立包（如 `@logix/query`）中；
   - 并在 core 规范中为这类扩展包提供清晰的类型与行为约束。

---

## 4. 待决问题 / 下一步工作

- 在 `core/03-logic-and-flow.md` 或 `core/06-platform-integration.md` 中：
  - 是否需要明确写入“TanStack Query 等外部引擎推荐先以 Service 形态接入”的指导；
  - 何时建议升级为 Adapter/Link 模式（例如多模块协作、平台可视化需求出现时）。
- 在 lifecycle 相关规范中（`core/02-module-and-logic-api.md` / `core/03-logic-and-flow.md`）：
  - 补充示例与建议：像 RQ 这样的长期外部资源，推荐通过 `$.lifecycle.onInit / onDestroy` 管理其创建与清理；
  - 将“长期资源用 lifecycle 管、事件驱动逻辑用 Flow/Logic 写”的边界写入规范，方便扩展包沿用这一约定。
- 在 PoC 层：
  - 可以先在一个真实列表场景中采用“Logic + RQ.fetchQuery”方式完整跑通；
  - 对比“直接用 useQuery + useEffect”的 DX 与维护体验，再决定哪部分值得抽象。
- 在规范层：
  - 后续若引入 Adapter 模式，需要与本草稿保持兼容：保留“零封装集成”作为合法路径，而不是强制所有 Query 访问都走 Adapter。

### 4.1 团队内扩展包 `@logix/query` 的规划定位（本仓内优先实现）

在 intent-flow / runtime-logix 当前的发展阶段，Logix 首先是为内部团队服务的运行时与规范集。基于本草稿的分析，可以给 `@logix/query` 在规划上一个清晰定位：

- **目标**：
  - 为业务项目提供一套“把原有 `useQuery` 行为收编到 Logix Logic 中”的标准模式；
  - 将 RQ Core 的细节（QueryClient / Observer / 缓存策略）封装在扩展包内部，对业务只暴露类型安全、形状统一的 Logic/Link 工厂；
  - 默认使用项目中已有的 `QueryClient` 单例，通过 `QueryClientTag` + Layer 注入 Logix Runtime。
- **职责边界**：
  - `@logix/query` 作为团队内扩展包存在，不进入 `@logix/core`；  
  - 向业务暴露的只是一小撮工厂函数：
    - `rqLogic<Sh>(config): ModuleLogic<Sh>` —— 一类查询 → 一段 Logic，可直接挂到 `Module.live`；
    - `rqLink(config): Effect.Effect<void, E, R>` —— 适合跨模块 / 跨系统协作的查询场景，挂到 `Logix.app` 的 processes；
  - 所有对 `QueryClientTag`、`$.lifecycle`、`QueryObserver` 的操作，都留在扩展实现内部，不要求业务工程师掌握。
- **实现顺序建议**：
  1. 先在一两个典型页面（详情 + 列表）里用“手写 Logic + RQ Core”的方式跑通，确认状态设计与触发模式合理；
  2. 在本仓实现最小版 `@logix/query`：
     - 提供 `QueryClientTag` 与基础 Layer；
     - 提供 `rqLogic` 工厂（优先覆盖 80% 的简单查询场景）；
  3. 后续按需要扩展 `rqLink`、更丰富的配置选项，以及与 Link/Adapter 模式的对齐。

### 4.2 多查询隔离与 Module 组织的最佳实践（per-query Logic / 子模块）

在真实业务中，一个 Module 内往往会有多条查询（原来是多个 `useQuery`），需要在 Logix 状态层面对 loading/error 等进行隔离。本草稿建议：

- **默认模式（推荐）：同一 Module 内为每个查询设计独立的 QuerySlice + rqLogic**  
  - 如 `UserModule` 中同时有 `detail` 和 `orders` 两块状态，各自包含 `data/isLoading/error` 字段；  
  - 对应有 `UserDetailRQLogic` / `UserOrdersRQLogic` 两段独立 Logic，只修改各自的 slice；  
  - UI 自然通过 `state.detail.isLoading` / `state.orders.isLoading` 等字段做细粒度展示。
- **进阶模式：提升为子模块（利用 Logix 自由度，不引入新抽象）**  
  - 当某个查询逻辑足够复杂或需要跨场景复用时，可以提升为单独的 Query Module（例如 `UserDetailQueryModule`）；  
  - Domain Module 通过 `$.use(子模块)` 聚合多个子模块的状态，无需新 API：  
    - 这种做法利用了 Logix Module 的组合能力，本质上是 Layer 的组合；
    - 页面是否“一页一 Module”是约定而非强制，业务可以从单 Module 起步，随着需求隔离性提升再渐进引入子模块。

总体上，现有 Logix API（Module / Logic / Link + lifecycle + useLocalModule）已经足够支撑 RQ 集成和多查询隔离；  
后续更重要的是在本仓内固化上述最佳实践，并通过 `@logix/query` 等扩展包把常见模式“代写”好，降低业务开发上手成本。 
