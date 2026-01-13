---
title: Tutorial - Your first business flow (cancelable search)
description: Build a debounced, cancelable search box with dependency injection.
---

In this tutorial, you’ll build a small “cancelable search” app: as the user types, searches are **debounced**, and in-flight requests are **automatically canceled** so you always render the latest result.

> [!NOTE]
> This is a “single input + async query” scenario—plain `Logix.Module` is enough.
>
> If you’re building real forms (multiple fields, validations, dynamic arrays), don’t hand-roll form state here. Use `@logixjs/form` instead:
> - [When to use Form](../../form/when-to-use)
> - [Form Quick Start](../../form/quick-start)

### Who is this for?

- You finished the counter example in “Quick Start” and want a more real-world async interaction.
- You want a minimal reference for “move async complexity out of components”.

### Prerequisites

- Basic TypeScript and React
- A rough understanding of Module / Logic / Bound API (`$`)

### What you’ll get

- A reusable template for “input → debounce → search → cancel old requests → render latest result”
- An intuitive model of `$.onState(...).debounce(...).runLatest...`
- A practical example of Service Tag + Layer injection for IO dependencies

## 1. Define a Module (State + Actions)

Create `src/features/search/search.def.ts`:

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const SearchState = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
  isSearching: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const SearchActions = {
  setKeyword: Schema.String,
}

export const SearchDef = Logix.Module.make('Search', {
  state: SearchState,
  actions: SearchActions,
  immerReducers: {
    setKeyword: (draft, keyword) => {
      draft.keyword = keyword
    },
  },
})
```

The key idea: **reduce “input onChange” into a clear intent (Action)**, instead of scattering `useEffect` in components.

## 2. Define SearchApi (Service Tag + Layer)

Create `src/features/search/search.service.ts`:

```ts
import { Context, Data, Effect, Layer } from 'effect'

export class SearchError extends Data.TaggedError('SearchError')<{
  readonly message: string
}> {}

export interface SearchApi {
  readonly search: (keyword: string) => Effect.Effect<ReadonlyArray<string>, SearchError>
}

export class SearchApiTag extends Context.Tag('@svc/SearchApi')<SearchApiTag, SearchApi>() {}

export const SearchApiLive = Layer.succeed(SearchApiTag, {
  search: (keyword) =>
    Effect.gen(function* () {
      yield* Effect.sleep('200 millis')
      if (keyword === 'error') {
        return yield* Effect.fail(new SearchError({ message: 'Mock: server error' }))
      }
      return [`${keyword} Result A`, `${keyword} Result B`, `${keyword} Result C`]
    }),
})
```

This keeps Logic dependent on an abstraction (`SearchApiTag`), which makes testing and swapping implementations straightforward.

## 3. Write Logic (debounce + runLatest)

Create `src/features/search/search.logic.ts`:

```ts
import { Cause, Effect, Option } from 'effect'
import { SearchDef } from './search.def'
import { SearchApiTag } from './search.service'

export const SearchLogic = SearchDef.logic<SearchApiTag>(($) =>
  Effect.gen(function* () {
    yield* $.onState((s) => s.keyword).debounce(300).runLatestTask({
      pending: (keyword) =>
        $.state.mutate((draft) => {
          const trimmed = keyword.trim()
          draft.errorMessage = undefined

          if (trimmed.length === 0) {
            draft.isSearching = false
            draft.results = []
            return
          }

          draft.isSearching = true
        }),

      effect: (keyword) =>
        Effect.gen(function* () {
          const trimmed = keyword.trim()
          if (trimmed.length === 0) {
            return [] as ReadonlyArray<string>
          }

          const api = yield* $.use(SearchApiTag)
          return yield* api.search(trimmed)
        }),

      success: (results) =>
        $.state.mutate((draft) => {
          draft.isSearching = false
          draft.results = Array.from(results)
        }),

      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.isSearching = false

          const failure = Cause.failureOption(cause)
          draft.errorMessage =
            Option.isSome(failure) && typeof (failure.value as any)?.message === 'string'
              ? String((failure.value as any).message)
              : 'Search failed'
        }),
    })
  }),
)
```

Key points:

- `debounce(300)`: don’t fire a request for every keystroke
- `runLatestTask(...)`: keep only the latest search; old requests are automatically canceled

## 4. Assemble Module and Runtime

Create `src/features/search/search.module.ts`:

```ts
import * as Logix from '@logixjs/core'
import { SearchDef } from './search.def'
import { SearchLogic } from './search.logic'
import { SearchApiLive } from './search.service'

export const SearchModule = SearchDef.implement({
  initial: {
    keyword: '',
    results: [],
    isSearching: false,
    errorMessage: undefined,
  },
  logics: [SearchLogic],
})

export const AppRuntime = Logix.Runtime.make(SearchModule, {
  label: 'GetStartedSearch',
  devtools: true,
  layer: SearchApiLive,
})
```

## 5. Wire up UI (React)

Mount the runtime in your app entry:

```tsx
import { RuntimeProvider } from '@logixjs/react'
import { AppRuntime } from './features/search/search.module'
import { SearchView } from './features/search/SearchView'

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <SearchView />
    </RuntimeProvider>
  )
}
```

The component is now purely “render + dispatch intent”:

```tsx
import { useModule, useSelector } from '@logixjs/react'
import { SearchModule } from './search.module'

export function SearchView() {
  const search = useModule(SearchModule)
  const keyword = useSelector(search, (s) => s.keyword)
  const results = useSelector(search, (s) => s.results)
  const isSearching = useSelector(search, (s) => s.isSearching)
  const errorMessage = useSelector(search, (s) => s.errorMessage)

  return (
    <div>
      <input value={keyword} onChange={(e) => search.actions.setKeyword(e.target.value)} placeholder="Type keyword..." />

      {isSearching && <div>Searching...</div>}
      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}

      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
```

> [!TIP]
> Try typing `error` to see how failures are captured and written back into state by Logic.

## Next

- [Tutorial: Complex list query](./tutorial-complex-list) — merge multiple triggers into composable Flows
- (Forms) [Form Quick Start](../../form/quick-start) — use the domain package for real forms
