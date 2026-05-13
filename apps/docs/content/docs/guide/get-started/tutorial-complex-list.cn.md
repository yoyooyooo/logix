---
title: 教程：复杂列表查询
description: 构建一个包含筛选、分页、刷新和 latest-only 加载的列表切片。
---

这个教程构建一个列表查询切片，包含：

- 筛选条件变化
- 分页
- 手动刷新
- 页码自动重置
- latest-only 加载

## 状态与动作

```ts
export const UserListState = Schema.Struct({
  filters: Schema.Struct({
    keyword: Schema.String,
    role: Schema.optional(Schema.String),
  }),
  pagination: Schema.Struct({
    page: Schema.Number,
    pageSize: Schema.Number,
    total: Schema.Number,
  }),
  list: Schema.Array(User),
  meta: Schema.Struct({
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String),
  }),
})

export const UserListActions = {
  setFilter: Schema.Struct({ key: Schema.String, value: Schema.Any }),
  setPage: Schema.Number,
  refresh: Schema.Void,
}
```

## Logic

列表 logic 通常包含两条 flow：

1. 筛选变化时重置页码
2. 汇聚多个加载触发源，只执行最新一次加载

```ts
export const UserListLogic = UserListDef.logic("user-list-logic", ($) =>
  Effect.gen(function* () {
    const loadEffect = Effect.gen(function* () {
      const { filters, pagination } = yield* $.state.read

      yield* $.state.mutate((draft) => {
        draft.meta.isLoading = true
        draft.meta.error = undefined
      })

      const api = yield* $.use(UserApi)
      const result = yield* Effect.tryPromise(() =>
        api.fetchUsers({ ...filters, page: pagination.page, size: pagination.pageSize }),
      ).pipe(Effect.either)

      yield* $.state.mutate((draft) => {
        draft.meta.isLoading = false
        if (result._tag === "Left") {
          draft.meta.error = "加载失败"
        } else {
          draft.list = result.right.items
          draft.pagination.total = result.right.total
        }
      })
    })

    $.lifecycle.onInitRequired(loadEffect)

    const filters$ = $.onState((s) => s.filters).toStream()
    const pagination$ = $.onState((s) => s.pagination).toStream()
    const refresh$ = $.onAction("refresh").toStream()

    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: "unbounded" })

    yield* Effect.all(
      [
        $.onState((s) => s.filters).run(() =>
          $.state.mutate((draft) => {
            draft.pagination.page = 1
          }),
        ),
        $.on(loadTrigger$).debounce(50).runLatest(loadEffect),
      ],
      { concurrency: "unbounded" },
    )
  }),
)
```

## React

React 侧继续保持简单：

- 读取 filters、pagination、list 和 loading state
- 派发筛选和分页动作
- 不把编排逻辑搬回组件

## 说明

- 筛选变化与刷新不需要由组件分别持有加载编排
- 页码重置继续留在 logic 中，而不是 UI 胶水
- 加载 flow 继续保持显式、latest-only

## 下一步

- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
- [React integration recipe](../recipes/react-integration)
