# Quickstart: Logix Router Bridge（最小用法）

**Date**: 2026-01-03  
**Spec**: `specs/071-logix-router-bridge/spec.md`

## 0) 五个关键词（≤5）

1. **binding**：把具体路由库绑定到 Router Contract 的实现（通过 `Router.layer(...)` 注入）
2. **layer**：注入点（runtime scope）
3. **snapshot**：路由快照（业务输入）
4. **intent**：导航意图（业务输出）
5. **trace**：可解释链路（谁发起 → 意图 → 结果快照）

## 1) 你需要掌握的最小心智（3 件事）

1. **Router 是可注入 Service（Tag + Layer），不是 Logix Module**：你在装配 Runtime 时注入一次；业务 logic 在 `.logic()` 内随用随取（不需要组件层手工“把路由当参数传进来”）。
2. **生产集成 = 选一个引擎并注入**：
   - React Router（Data Router）→ `Router.layer(Router.ReactRouter.make(dataRouter))`
   - TanStack Router（`@tanstack/react-router`）→ `Router.layer(Router.TanStackRouter.make(router))`
3. **测试/示例 = 用 Memory 夹具注入**：`Router.layer(Router.Memory.make({ initial }))`（不依赖浏览器 History/React 渲染也能跑通读/订阅/导航用例）。

## 2) 你将获得什么

- 在 `.logic()` 内读/订阅/导航，不再需要组件层把路由当作旁路状态手工注入（FR-001/FR-002/FR-003）。
- 切换路由引擎只替换 Router 实现注入层（`Router.layer(...)` 的参数），业务模块不改（FR-005/SC-002）。
- 可在纯单测里用 Memory 实现驱动 route change 并断言导航意图（SC-004）。

## 3) Runtime 装配（只做一次）

> 目标：把“具体路由库实例”适配成 `RouterService`，再用 `Router.layer(...)` 注入到 Logix Runtime 的 scope。

### 3.1 React Router（Data Router）

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import * as Router from '@logix/router'
import { createBrowserRouter } from 'react-router-dom'

const dataRouter = createBrowserRouter(/* routes */)

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(Router.layer(Router.ReactRouter.make(dataRouter))),
})
```

> React 渲染侧仍按 React Router 原生方式使用同一个 `dataRouter`（例如 `<RouterProvider router={dataRouter} />`）。

### 3.2 TanStack Router

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import * as Router from '@logix/router'
import { createRouter } from '@tanstack/react-router'

const router = createRouter(/* routeTree + history */)

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(Router.layer(Router.TanStackRouter.make(router))),
})
```

> React 渲染侧仍按 TanStack Router 原生方式使用同一个 `router`（例如 `<RouterProvider router={router} />`）。

### 3.3 Memory（测试/示例夹具）

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import * as Router from '@logix/router'

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Router.layer(Router.Memory.make({ initial: { pathname: '/', search: '', hash: '', params: {} } })),
  ),
})
```

## 4) Logic 侧用法（读 / 订阅 / 导航）

> 推荐入口：`Router.use($)`（它能在内部挂上“事务窗口禁航 + 诊断事件化”等统一约束，避免业务侧遗漏）。这里拿到的 `router` 可视为一种 `ServiceHandle`（参见 `apps/docs/content/docs/api/core/handle.md`）。

```ts
import { Effect } from 'effect'
import * as Router from '@logix/router'

export const Logic = AppModule.logic(($) =>
  Effect.gen(function* () {
    const router = yield* Router.use($)
    const snap = yield* router.getSnapshot // committed/resolved snapshot

    // Query Params（保持 search 为 raw string；用官方 utils 避免重复解析样板）
    const q = Router.SearchParams.get(snap.search, 'q')
    const tags = Router.SearchParams.getAll(snap.search, 'tags')

    // 订阅变化（示意）：route change -> 更新业务状态
    yield* $.on(router.changes).runFork((next) =>
      $.state.update((s) => ({ ...s, lastPathname: next.pathname })),
    )

    // 发起导航（返回 void，结果通过 changes/getSnapshot 观测）
    yield* router.controller.push('/next')
  }),
)
```

## 5) 关键语义（避免踩坑）

- `RouteSnapshot` 只暴露 **已提交/已解析** 的一致状态（不会把 pending 中间态以 snapshot 形式对外泄露）。
- `changes`：subscribe 时先 emit 一次 current snapshot（initial），随后按变更保序 emit，且不丢最后一次快照。
- `navigate/controller.*`：返回 `void`；不要期待“返回导航后的 snapshot”，结果统一通过 `getSnapshot/changes` 观测。
- `pathname`：对外为 router-local（不含 `basename/basepath`）；`search/hash` 保留 `?/#` 前缀或为空字符串。
- **事务窗口禁航**：在 sync transaction window 内调用导航必须结构化失败（把导航移到事务外的 Effect/异步边界）。
- `back()` 无历史可回：必须结构化失败（不得 silent no-op），以便业务逻辑可测试可诊断地处理该分支。

## 6) 如何验证（对应 spec 的验收场景）

- 读快照：注入初始快照 A，`getSnapshot` 读到 A（User Story 1）。
- 订阅变化：Memory 实现推送 B，logic 能收到一次变更并读到 B（User Story 1）。
- 导航意图：logic 调用 `navigate(push)`，实现捕获 intent 并产生最终快照（User Story 2）。
- 可替换：同一组用例替换 Router 实现仍通过（User Story 3 / SC-002）。
