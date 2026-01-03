# Contract: `@logix/router` Public API（草案）

> 目标：让业务代码只依赖 Router Contract；切换路由引擎只需替换“Router 实现”的注入层（`Router.layer(...)` 的参数）。

## 1) 推荐 import 形状

```ts
import * as Router from '@logix/router'
```

## 2) MUST 暴露的对外能力

### 2.1 Router Contract（Tag）

- `Router.Tag`（命名可调整，但对外必须是单一 Tag 入口）：
  - 读取当前快照：`getSnapshot`
  - 订阅快照变化：`changes`
  - 发起导航：`navigate`

建议签名（概念）：

```ts
export interface RouterService {
  readonly getSnapshot: Effect.Effect<RouteSnapshot, RouterError>
  readonly changes: Stream.Stream<RouteSnapshot, RouterError>
  readonly navigate: (intent: NavigationIntent) => Effect.Effect<void, RouterError>

  // sugar: prefer controller.* in business code
  readonly controller: {
    readonly push: (to: string) => Effect.Effect<void, RouterError>
    readonly replace: (to: string) => Effect.Effect<void, RouterError>
    readonly back: () => Effect.Effect<void, RouterError>
  }
}
```

说明：`RouterService` 属于 “ServiceHandle（可注入 Service 的消费面）” 这一路线：通过 `Router.layer(...)` 注入、通过 `Router.use($)` 在 `.logic()` 内获取；推荐把命令面收口在 `controller.*`（参见 `apps/docs/content/docs/api/core/handle.md`）。

`NavigationIntent`（MUST，便于 Devtools/诊断反序列化识别）：

```ts
export type NavigationIntent =
  | { readonly _tag: 'push'; readonly to: string }
  | { readonly _tag: 'replace'; readonly to: string }
  | { readonly _tag: 'back' }
```

语义约束（MUST）：

- `getSnapshot` 返回 **已提交/已解析** 的一致快照；不得以 `RouteSnapshot` 形式对外泄露 pending 中间态。
- `changes` 在 subscribe 时先 emit 一次 current snapshot（initial），随后在快照变化后 emit；变更通知必须保序，且不得丢最后一次快照。
- `navigate` 不返回“导航后的快照”；导航结果通过 `getSnapshot/changes` 观测。
- `RouteSnapshot.pathname` 为 router-local pathname（不包含 `basename/basepath`）。
- `RouteSnapshot.search/hash` 保留 `?/#` 前缀或为空字符串；`params` 为 `Record<string, string>` 且“键缺失=不存在”；Query Params 保持在 `search`，并通过 `Router.SearchParams` 获取（支持 `getAll` 多值）。

### 2.2 注入入口（Layer）

- `Router.layer(service)`：在 runtime scope 内注入 Router 实现（per instance）。
- `service` 的类型就是 `RouterService`（也即 `Router.Tag` 的 service 形状），由各路由库的 builder 产出。

```ts
export const layer: (service: RouterService) => Layer.Layer<RouterTag, never, never>
```

### 2.3 路由库集成（builder）

builder 是唯一与具体路由库耦合的边界；业务模块/logic 只依赖 `Router.Tag`。

```ts
// React Router (Data Router): createBrowserRouter(...) / <RouterProvider router={router} />
export const ReactRouter: {
  readonly make: (router: unknown, options?: unknown) => RouterService
}

// TanStack Router: createRouter(...)
export const TanStackRouter: {
  readonly make: (router: unknown, options?: unknown) => RouterService
}
```

## 3) SHOULD/MAY（按需）

- `Router.Memory`：纯内存实现（测试夹具）
  - 支持手动 `setSnapshot` 驱动变更
  - 记录 intents，便于断言
  - 支持最小 history stack（push/replace/back），用于覆盖 `back()` 语义测试
- `Router.use($)`：面向 `.logic()` 的推荐入口（绑定 `BoundApi`）
  - 返回值：`RouterService`
  - 语义：在 `navigate/controller.*` 内统一做“事务窗口禁航”的显式防御与诊断事件化（包含 moduleId/instanceId），避免业务侧遗漏
- `Router.SearchParams`：官方 Query Params utils（不把 Query Params 塞进 `params`）
  - 约束：输入为 `RouteSnapshot.search`（包含 `?` 前缀或空串）；输出/访问方式必须支持多值语义（例如 `getAll`）

```ts
export const SearchParams: {
  readonly get: (search: string, key: string) => string | undefined
  readonly getAll: (search: string, key: string) => ReadonlyArray<string>
}
```
- `Router.helpers`：面向 logic 的 helper（不扩展 `$`）
  - 例如 `Router.read($)` / `Router.changes($)` / `Router.navigate($, intent)`

## 4) 禁止事项（MUST NOT）

- 不在 `@logix/core` 增加第二套对外 Router 入口（避免双协议）。
- 不让 **Router Contract（`Router.Tag`/`RouteSnapshot`/`NavigationIntent`）** 依赖具体路由库类型；路由库的集成通过 `Router.ReactRouter` / `Router.TanStackRouter` 的 builder 收口。
- 不导出名为 `RouterAdapter` 的对外类型（作为内部实现概念即可）。
- 不依赖 process-global 单例（history/global router registry）。
