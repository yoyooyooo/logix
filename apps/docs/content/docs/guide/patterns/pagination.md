---
title: 分页加载
description: 使用 Logix 实现分页/无限滚动加载模式。
---

# 分页加载模式

分页加载是列表类场景的基础模式，本文介绍 Cursor 和 Offset 两种实现。

## 核心思路

1. **状态结构**：`items[]` + `cursor/page` + `hasMore` + `isLoading`
2. **Action**：`loadMore` 触发加载
3. **Flow**：防止重复请求（`runExhaust`），加载完成后追加数据

## Cursor 分页实现

```ts
import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'

const ListDef = Logix.Module.make('List', {
  state: Schema.Struct({
    items: Schema.Array(Schema.Unknown),
    cursor: Schema.NullOr(Schema.String),
    hasMore: Schema.Boolean,
    isLoading: Schema.Boolean,
  }),
  actions: {
    loadMore: Schema.Void,
    reset: Schema.Void,
  },
})

const ListLogic = ListDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(ListApi)

    yield* Effect.all(
      [
        // 使用 runExhaust 防止重复请求
        $.onAction('loadMore').runExhaust(() =>
          Effect.gen(function* () {
            const state = yield* $.state.read
            if (!state.hasMore || state.isLoading) return

            yield* $.state.mutate((d) => {
              d.isLoading = true
            })

            const { items, nextCursor } = yield* api.fetch(state.cursor)

            yield* $.state.mutate((d) => {
              d.items = [...d.items, ...items]
              d.cursor = nextCursor
              d.hasMore = nextCursor !== null
              d.isLoading = false
            })
          }),
        ),

        // 重置列表
        $.onAction('reset').run(() =>
          $.state.update(() => ({
            items: [],
            cursor: null,
            hasMore: true,
            isLoading: false,
          })),
        ),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)
```

## Offset 分页变体

```ts
const state = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  page: Schema.Number, // 当前页码
  pageSize: Schema.Number, // 每页条数
  total: Schema.Number, // 总条数
  isLoading: Schema.Boolean,
})
```

## React 集成

```tsx
function ItemList() {
  const list = useModule(ListModule)
  const { items, hasMore, isLoading } = useSelector(list, (s) => s)
  const dispatch = useDispatch(list)

  return (
    <div>
      {items.map((item) => (
        <Item key={item.id} data={item} />
      ))}

      {hasMore && (
        <button onClick={() => dispatch({ _tag: 'loadMore' })} disabled={isLoading}>
          {isLoading ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  )
}
```

## 常见变体

- **下拉刷新**：`reset` 后立即 `loadMore`
- **无限滚动**：监听滚动事件自动触发 `loadMore`
- **预加载**：在接近底部时提前触发加载

## 相关模式

- [乐观更新](./optimistic-update)
- [搜索+详情联动](./search-detail)
