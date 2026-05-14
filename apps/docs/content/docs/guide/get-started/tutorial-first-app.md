---
title: Cancelable search
description: A complete search flow with state, services, cancellation, and React reads.
---

Search is a good first real flow: user input changes quickly, requests can overlap, and the UI needs stable loading and result state.

## State and actions

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

Keep the visible query in state. The async request is driven by logic, not by the component.

## Service

```ts
class SearchService extends Effect.Service<SearchService>()("SearchService", {
  effect: Effect.succeed({
    run: (query: string) => Effect.succeed([`Result for ${query}`]),
  }),
}) {}
```

Production code normally provides this service through a `Layer` in `Runtime.make` or `Program.make`.

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

`runLatest` keeps only the newest request active for this trigger. The component does not implement cancellation.

## Program and React

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

This uses a keyed local program instance. Use the module tag route when the search instance is provided by the root runtime.
