---
title: '教程：复杂列表查询'
description: 构建一个包含筛选、分页、加载状态和自动重置的复杂列表页面。
---

在后台管理系统中，查询列表是最常见的场景。本教程将带你构建一个生产级的列表页面，包含以下特性：

1.  **多源触发**：点击查询、切换分页、手动刷新均可触发加载。
2.  **竞态处理**：快速切换条件时，自动取消旧请求。
3.  **自动重置**：修改筛选条件时，自动重置页码到第一页。
4.  **状态管理**：完整管理 Loading、Error 和 Data 状态。

### 适合谁

- 已经熟悉基本 Module / Logic 写法，希望在真实业务中实践 Logix 的流式能力；
- 负责后台列表、报表等复杂筛选场景，希望得到一份“生产级”的参考实现。

### 前置知识

- 完成过前面的“可取消搜索”教程，或对 `$.onState / $.onAction` 有实战经验；
- 了解 Flow 的基本执行策略（`run / runLatest` 等），可参考 [Flows & Effects](../essentials/flows-and-effects)。

### 读完你将获得

- 一套支持多源触发、竞态处理和自动重置的列表页实现模板；
- 对“把复杂交互拆成多个 Flow，再用 Stream 合流”的模式有清晰认识；
- 能够在自己的业务中识别哪些逻辑适合做成单独 Flow，哪些适合合并。

## 1. 定义数据结构 (Schema)

首先，我们定义列表页的状态结构。

创建 `src/features/users/schema.ts`：

```typescript
import { Schema } from 'effect'
import * as Logix from '@logix/core'

// 1. 定义用户实体
const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  status: Schema.String,
})

// 2. 定义状态
export const UserListState = Schema.Struct({
  // 筛选条件
  filters: Schema.Struct({
    keyword: Schema.String,
    role: Schema.optional(Schema.String),
  }),
  // 分页信息
  pagination: Schema.Struct({
    page: Schema.Number,
    pageSize: Schema.Number,
    total: Schema.Number,
  }),
  // 列表数据
  list: Schema.Array(User),
  // 元数据
  meta: Schema.Struct({
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String),
  }),
})

// 3. 定义动作
export const UserListActions = {
  setFilter: Schema.Struct({ key: Schema.String, value: Schema.Any }),
  setPage: Schema.Number,
  refresh: Schema.Void,
}

// 4. 定义 ModuleDef
export const UserListDef = Logix.Module.make('UserList', {
  state: UserListState,
  actions: UserListActions,
})
```

## 2. 编写业务逻辑 (Logic)

这是本教程的核心。我们将使用 Logix 的流式编程能力，将复杂的交互逻辑简化为几条清晰的管道。

创建 `src/features/users/logic.ts`：

```typescript tab="Logic DSL"
	import { Effect, Stream } from 'effect'
	import { UserListDef } from './schema'
	import { UserApi } from '../../services/UserApi'

	export const UserListLogic = UserListDef.logic(($) => {
  // --- setup-only：注册生命周期 ---
  const loadEffect = Effect.gen(function* () {
    // ... (省略加载逻辑，与之前相同) ...
    const { filters, pagination } = yield* $.state.read
    yield* $.state.mutate((d) => {
      d.meta.isLoading = true
      d.meta.error = undefined
    })
    const api = yield* $.use(UserApi)
    const result = yield* Effect.tryPromise(() =>
      api.fetchUsers({ ...filters, page: pagination.page, size: pagination.pageSize }),
    ).pipe(Effect.either)
    yield* $.state.mutate((d) => {
      d.meta.isLoading = false
      if (result._tag === 'Left') d.meta.error = '加载失败'
      else {
        d.list = result.right.items
        d.pagination.total = result.right.total
      }
    })
  })

  $.lifecycle.onInit(loadEffect)

  // --- run 段：挂载 Watcher/Flow ---
  return Effect.gen(function* () {
    // --- 1. 定义触发源 ---
    // 使用 .toStream() 将 DSL 对象转换为 Stream 以便合并
    const filters$ = $.onState((s) => s.filters).toStream()
    const pagination$ = $.onState((s) => s.pagination).toStream()
    const refresh$ = $.onAction('refresh').toStream()

    // --- 3. 汇聚加载信号 ---
    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: 'unbounded' })

    yield* Effect.all(
      [
        // --- 2. 自动重置页码 ---
        $.onState((s) => s.filters).run(() =>
          $.state.mutate((d) => {
            d.pagination.page = 1
          }),
        ),

        // --- 4. 执行加载逻辑 ---
        // 使用 $.on(...) 将合并后的 Stream 重新包装回 DSL
        $.on(loadTrigger$).debounce(50).runLatest(loadEffect),
      ],
      { concurrency: 'unbounded' },
    )
  })
})
```

    ```typescript tab="Flow API"
    import { Effect, Stream } from 'effect'
    import { UserListDef } from './schema'

    export const UserListLogic = UserListDef.logic(($) =>
      Effect.gen(function* () {
    // --- 1. 使用底层 API 获取 Stream ---
    const filters$ = $.flow.fromState((s) => s.filters)
    const pagination$ = $.flow.fromState((s) => s.pagination)
    const refresh$ = $.flow.fromAction((a): a is { _tag: 'refresh' } => (a as any)._tag === 'refresh')

    // --- 2. 自动重置页码 ---
    yield* filters$.pipe(
      $.flow.run(() =>
        $.state.mutate((d) => {
          d.pagination.page = 1
        }),
      ),
    )

    // --- 3. 汇聚加载信号 ---
    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: 'unbounded' })

    // --- 4. 执行加载逻辑 ---
    // 直接使用 Stream 操作符
    yield* loadTrigger$.pipe(
      $.flow.debounce(50),
      $.flow.runLatest(loadEffect), // loadEffect 定义同上
    )

    // ...

}),
)

````

## 3. 组装 Module

```typescript
	import { UserListDef } from './schema'
	import { UserListLogic } from './logic'

	export const UserListModule = UserListDef.implement({
	  initial: {
	    filters: { keyword: '' },
	    pagination: { page: 1, pageSize: 10, total: 0 },
	    list: [],
	    meta: { isLoading: false },
	  },
	  logics: [UserListLogic],
	})
````

## 4. UI 实现

UI 层变得非常简单，只需要负责渲染和触发简单的状态变更。

```tsx
	import { useModule, useSelector } from '@logix/react'
	import { UserListModule } from './module'

	export function UserListPage() {
	  const list = useModule(UserListModule)
	  const state = useSelector(list, (s) => s)
	  const actions = list.actions

  return (
    <div>
      {/* 筛选区 */}
      <div className="filters">
        <input
          placeholder="搜索用户..."
          value={state.filters.keyword}
          onChange={(e) => actions.setFilter({ key: 'keyword', value: e.target.value })}
        />
        <button onClick={() => actions.refresh()}>刷新</button>
      </div>

      {/* 列表区 */}
      {state.meta.isLoading && <div>加载中...</div>}
      {state.meta.error && <div className="error">{state.meta.error}</div>}

      <ul>
        {state.list.map((user) => (
          <li key={user.id}>
            {user.name} - {user.role}
          </li>
        ))}
      </ul>

      {/* 分页区 */}
      <div className="pagination">
        <span>共 {state.pagination.total} 条</span>
        <button disabled={state.pagination.page === 1} onClick={() => actions.setPage(state.pagination.page - 1)}>
          上一页
        </button>
        <span>第 {state.pagination.page} 页</span>
        <button onClick={() => actions.setPage(state.pagination.page + 1)}>下一页</button>
      </div>
    </div>
  )
}
```

## 关键点回顾

1.  **声明式流**: 我们没有在 `useEffect` 中手动检查依赖，而是声明了 `filters$` 和 `pagination$` 流。
2.  **自动竞态处理**: `runLatest` 确保了如果用户快速点击下一页，旧的请求会被自动取消，永远只展示最新的结果。
3.  **逻辑内聚**: 所有的加载逻辑、重置逻辑都封装在 `Logic` 中，UI 组件完全解耦。
