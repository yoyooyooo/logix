---
title: 教程：可取消搜索
description: 构建一个带防抖和 latest-only 请求处理的搜索流。
---

这个教程构建一个最小搜索切片，包含：

- 一个输入字段
- 一个异步服务
- debounce
- latest-only 请求处理

## Module

```ts
export const SearchDef = Logix.Module.make("Search", {
  state: SearchState,
  actions: {
    setKeyword: Schema.String,
  },
  immerReducers: {
    setKeyword: (draft, keyword) => {
      draft.keyword = keyword
    },
  },
})
```

## Service

```ts
export class SearchApiTag extends Context.Tag("@svc/SearchApi")<SearchApiTag, SearchApi>() {}

export const SearchApiLive = Layer.succeed(SearchApiTag, {
  search: (keyword) =>
    Effect.gen(function* () {
      yield* Effect.sleep("200 millis")
      return [`${keyword} 结果 A`, `${keyword} 结果 B`]
    }),
})
```

## Logic

```ts
export const SearchLogic = SearchDef.logic<SearchApiTag>("search-logic", ($) =>
  $.onState((s) => s.keyword).debounce(300).runLatestTask({
    pending: (keyword) =>
      $.state.mutate((draft) => {
        const trimmed = keyword.trim()
        draft.errorMessage = undefined
        draft.isSearching = trimmed.length > 0
        if (trimmed.length === 0) {
          draft.results = []
        }
      }),

    effect: (keyword) =>
      Effect.gen(function* () {
        const trimmed = keyword.trim()
        if (trimmed.length === 0) return [] as ReadonlyArray<string>
        const api = yield* $.use(SearchApiTag)
        return yield* api.search(trimmed)
      }),

    success: (results) =>
      $.state.mutate((draft) => {
        draft.isSearching = false
        draft.results = Array.from(results)
      }),

    failure: () =>
      $.state.mutate((draft) => {
        draft.isSearching = false
        draft.errorMessage = "搜索失败"
      }),
  }),
)
```

## Runtime

```ts
export const SearchProgram = Logix.Program.make(SearchDef, {
  initial: {
    keyword: "",
    results: [],
    isSearching: false,
    errorMessage: undefined,
  },
  logics: [SearchLogic],
})

export const runtime = Logix.Runtime.make(SearchProgram, {
  layer: SearchApiLive,
})
```

## React

```tsx
function SearchView() {
  const search = useModule(SearchDef.tag)
  const keyword = useSelector(search, (s) => s.keyword)
  const results = useSelector(search, (s) => s.results)
  const isSearching = useSelector(search, (s) => s.isSearching)

  return (
    <div>
      <input value={keyword} onChange={(e) => search.actions.setKeyword(e.target.value)} />
      {isSearching && <div>搜索中...</div>}
      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  )
}
```

## 说明

- `debounce(300)` 用于降低输入过程中的 churn
- `runLatestTask(...)` 只保留最新请求
- 组件继续只负责渲染和派发意图

## 下一步

- [复杂列表教程](./tutorial-complex-list)
- [Flows & Effects](../essentials/flows-and-effects)
