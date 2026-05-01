---
title: "Tutorial: Cancelable search"
description: Build a debounced search flow that keeps only the latest request.
---

This tutorial builds a minimal search slice with:

- one input field
- one async service
- debounce
- latest-only request handling

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
      return [`${keyword} Result A`, `${keyword} Result B`]
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
        draft.errorMessage = "Search failed"
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
      {isSearching && <div>Searching...</div>}
      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  )
}
```

## Notes

- `debounce(300)` reduces churn during typing
- `runLatestTask(...)` keeps only the latest request alive
- the component remains responsible only for rendering and dispatching intent

## Next

- [Complex list tutorial](./tutorial-complex-list)
- [Flows & Effects](../essentials/flows-and-effects)
