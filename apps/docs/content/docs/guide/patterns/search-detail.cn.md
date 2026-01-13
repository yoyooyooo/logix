---
title: 搜索+详情联动
description: 使用 Logix 实现列表搜索与详情面板的联动模式。
---

典型的 Master-Detail 场景：左侧搜索列表，右侧详情面板，选中项变化时自动加载详情。

## 核心思路

1. **两个 Module**：`SearchModule`（列表）+ `DetailModule`（详情）
2. **联动方式**：通过 `$.use` 或 `Link.make` 实现跨模块通信
3. **竞态处理**：使用 `runLatest` 确保详情始终对应最新选中项

## 状态设计

```ts
// Search Module
const SearchDef = Logix.Module.make('Search', {
  state: Schema.Struct({
    keyword: Schema.String,
    results: Schema.Array(ItemSchema),
    selectedId: Schema.NullOr(Schema.String),
    isSearching: Schema.Boolean,
  }),
  actions: {
    setKeyword: Schema.String,
    select: Schema.String,
  },
})

// Detail Module
const DetailDef = Logix.Module.make('Detail', {
  state: Schema.Struct({
    data: Schema.NullOr(DetailSchema),
    isLoading: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
  }),
  actions: {
    load: Schema.String, // itemId
    clear: Schema.Void,
  },
})
```

## 搜索逻辑（防抖 + 取消旧请求）

```ts
const SearchLogic = SearchDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(SearchApi)

    // 搜索：防抖 300ms + 取消旧请求
    yield* $.onState((s) => s.keyword)
      .debounce(300)
      .runLatest((keyword) =>
        Effect.gen(function* () {
          if (!keyword.trim()) {
            yield* $.state.mutate((d) => {
              d.results = []
            })
            return
          }

          yield* $.state.mutate((d) => {
            d.isSearching = true
          })
          const results = yield* api.search(keyword)
          yield* $.state.mutate((d) => {
            d.results = results
            d.isSearching = false
          })
        }),
      )
  }),
)
```

## 详情联动（跨模块）

### 方式一：在 SearchLogic 中驱动

```ts
const SearchLogic = SearchDef.logic(($) =>
  Effect.gen(function* () {
    const Detail = yield* $.use(DetailModule)

    // 选中项变化时，驱动详情加载
    yield* $.onState((s) => s.selectedId)
      .filter((id): id is string => id !== null)
      .runLatest((id) => Detail.dispatch({ _tag: 'load', payload: id }))
  }),
)
```

### 方式二：使用 Link.make

```ts
const SyncSelectedToDetail = Logix.Link.make({ modules: [SearchDef, DetailDef] as const }, ($) =>
  $.Search.changes((s) => s.selectedId).pipe(
    Stream.filter((id): id is string => id !== null),
    Stream.runForEach((id) => $.Detail.actions.load(id)),
  ),
)

// 在 Root 中挂载
const RootModule = RootDef.implement({
  imports: [SearchImpl, DetailImpl],
  processes: [SyncSelectedToDetail],
})
```

## React 组件

```tsx
function MasterDetail() {
  return (
    <div className="master-detail">
      <SearchPanel />
      <DetailPanel />
    </div>
  )
}

function SearchPanel() {
  const search = useModule(SearchModule)
  const { keyword, results, selectedId } = useSelector(search, (s) => s)
  const dispatch = useDispatch(search)

  return (
    <div>
      <input value={keyword} onChange={(e) => dispatch({ _tag: 'setKeyword', payload: e.target.value })} />
      <ul>
        {results.map((item) => (
          <li
            key={item.id}
            className={item.id === selectedId ? 'selected' : ''}
            onClick={() => dispatch({ _tag: 'select', payload: item.id })}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## 相关模式

- [分页加载](./pagination)
- [跨模块通信](../learn/cross-module-communication)

## 可运行示例

- 索引：[可运行示例索引](../recipes/runnable-examples)
- 代码：
  - `examples/logix/src/scenarios/search-with-debounce-latest.ts`
  - `examples/logix/src/scenarios/cross-module-link.ts`
  - `examples/logix-react/src/modules/querySearchDemo.ts`
