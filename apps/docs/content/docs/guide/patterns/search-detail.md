---
title: Search + detail linkage
description: Implement a master-detail pattern (search list + detail panel) with Logix.
---

A classic master-detail UI: a searchable list on the left, a detail panel on the right. When selection changes, detail loads automatically.

## Core idea

1. **Two modules**: `SearchModule` (list) + `DetailModule` (detail)
2. **Linkage**: cross-module communication via `Program.capabilities.imports` and `$.imports.get(...)`
3. **Race handling**: use `runLatest` so detail always corresponds to the latest selection

## State design

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

## Search logic (debounce + cancel old requests)

```ts
const SearchLogic = SearchDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(SearchApi)

    // Search: debounce 300ms + cancel old requests
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

## Detail linkage (cross-module)

### Option 1: drive it inside SearchLogic

```ts
const SearchLogic = SearchDef.logic(($) =>
  Effect.gen(function* () {
    const Detail = yield* $.imports.get(DetailDef.tag)

    // When selection changes, trigger detail loading
    yield* $.onState((s) => s.selectedId)
      .filter((id): id is string => id !== null)
      .runLatest((id) => Detail.dispatch({ _tag: 'load', payload: id }))
  }),
)
```

The host Program must import the detail Program:

```ts
const SearchProgram = Logix.Program.make(SearchDef, {
  initial: {
    keyword: "",
    results: [],
    selectedId: null,
    isSearching: false,
  },
  capabilities: {
    imports: [DetailProgram],
  },
  logics: [SearchLogic],
})
```

## React components

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
  const search = useModule(SearchDef.tag)
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

## Related patterns

- [Pagination loading](./pagination)
- [Cross-module communication](../learn/cross-module-communication)

## Example code

- `examples/logix/src/scenarios/search-with-debounce-latest.ts`
- `examples/logix-react/src/modules/querySearchDemo.ts`
