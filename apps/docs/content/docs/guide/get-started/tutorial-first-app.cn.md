---
title: 可取消搜索
description: 包含状态、服务、取消语义和 React 读取的完整搜索 flow。
---

搜索适合作为第一个真实 flow：用户输入变化快，请求会重叠，UI 需要稳定的 loading 与结果状态。

## 状态和动作

```ts
const Search = Logix.Module.make("Search", {
  state: Schema.Struct({
    query: Schema.String,
    loading: Schema.Boolean,
    results: Schema.Array(Schema.String),
    error: Schema.NullOr(Schema.String),
  }),
  actions: {
    queryChanged: Schema.String,
  },
  reducers: {
    queryChanged: Logix.Module.Reducer.mutate((draft, action) => {
      draft.query = action.payload
    }),
  },
})
```

把可见 query 放进 state。异步请求由 logic 驱动，不由组件实现。

## 服务

```ts
class SearchService extends Effect.Service<SearchService>()("SearchService", {
  effect: Effect.succeed({
    run: (query: string) => Effect.succeed([`Result for ${query}`]),
  }),
}) {}
```

生产代码通常通过 `Runtime.make` 或 `Program.make` 的 `Layer` 提供这个服务。

## Logic

```ts
const SearchLogic = Search.logic("run-search", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("queryChanged")
      .debounce(200)
      .runLatest((action) =>
        Effect.gen(function* () {
          const service = yield* $.use(SearchService)
          yield* $.state.mutate((draft) => {
            draft.loading = true
            draft.error = null
          })

          const results = yield* service.run(action.payload).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* $.state.mutate((draft) => {
                  draft.error = String(error)
                })
                return [] as string[]
              }),
            ),
          )

          yield* $.state.mutate((draft) => {
            draft.loading = false
            draft.results = results
          })
        }),
      )
  }),
)
```

`runLatest` 只保留这个触发器下最新的请求。组件不实现取消逻辑。

## Program 与 React

```ts
const SearchProgram = Logix.Program.make(Search, {
  initial: { query: "", loading: false, results: [], error: null },
  logics: [SearchLogic],
})

function SearchBox() {
  const search = useModule(SearchProgram, { key: "search-page" })
  const query = useSelector(search, fieldValue("query"))
  const loading = useSelector(search, fieldValue("loading"))
  const results = useSelector(search, fieldValue("results"))
  const dispatch = useDispatch(search)

  return (
    <>
      <input value={query} onChange={(event) => dispatch({ _tag: "queryChanged", payload: event.target.value })} />
      {loading ? <span>Loading</span> : <pre>{JSON.stringify(results)}</pre>}
    </>
  )
}
```

这里使用带 key 的局部 program 实例。如果实例由 root runtime 提供，使用 module tag 路线。
