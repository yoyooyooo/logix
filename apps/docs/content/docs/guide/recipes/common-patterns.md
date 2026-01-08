---
title: Common recipes
description: Practical Logix patterns you can reuse in real products.
---

This page collects common Logix recipes, covering field linkage, async validation, multi-field constraints, and more — ready to copy into production code.

### Who is this for?

- You already know the basics of Modules/Logic and want proven recipes for “field linkage / async validation / multi-field constraints”.
- You maintain shared snippets in your team’s internal component library or scaffolding.

### Prerequisites

- You’ve read [Flows & Effects](../essentials/flows-and-effects) and related Learn chapters.
- You can read combinations like `$.onState / $.flow.* / $.state.mutate`.

### How to use

- Copy the snippets and adapt them to your own State/Service types.
- Or extract them as team Patterns/Helpers for unified reuse.

## 1. Field linkage and reset

**Scenario**: when a field changes, reset a set of dependent fields (e.g. when country changes, reset province/city).

**Pattern**: watch the source field via `flow.fromState`, then update target fields via `state.mutate` inside `flow.run`.

```typescript
// Conceptually, `$Form` is a Bound API pre-bound to a FormShape.
const resetProvinceLogic = Effect.gen(function* () {
  const country$ = $Form.flow.fromState((s) => s.country)

  yield* country$.pipe(
    $Form.flow.run(
      $Form.state.mutate((draft) => {
        draft.province = ''
        draft.city = ''
      }),
    ),
  )
})
```

## 2. Async validation and error state

**Scenario**: field changes trigger async validation (e.g. username uniqueness). Write results into `errors.xxx`.

**Pattern**: `flow.fromState` + `debounce` + `filter`, then `runLatest` to execute an Effect that calls an API and automatically handles races.

```typescript
// Conceptually, `$Form` is a Bound API pre-bound to FormShape + UserApi.
const validateUsernameLogic = Effect.gen(function* () {
  const username$ = $Form.flow.fromState((s) => s.username)

  yield* username$.pipe(
    $Form.flow.debounce(500),
    $Form.flow.filter((username) => username.length >= 3),
    $Form.flow.runLatest(
      // Ensure only the latest input is processed
      Effect.gen(function* () {
        const api = yield* $Form.use(UserApi)
        const { username } = yield* $Form.state.read
        const isTaken = yield* api.checkUsername(username)
        yield* $Form.state.mutate((draft) => {
          draft.errors.username = isTaken ? 'Username already taken' : undefined
        })
      }),
    ),
  )
})
```

## 3. Multi-field constraints (e.g. start/end date)

**Scenario**: multiple fields have a constraint (start date must be before end date).

**Pattern**: `flow.fromState` over a tuple like `[s.startDate, s.endDate]`, then validate in `flow.run`.

```typescript
// Conceptually, `$Form` is a Bound API pre-bound to a FormShape.
const validateDateRangeLogic = Effect.gen(function* () {
  const datePair$ = $Form.flow.fromState((s) => [s.startDate, s.endDate] as const)

  yield* datePair$.pipe(
    $Form.flow.run(
      $Form.state.mutate((draft) => {
        if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
          draft.errors.dateRange = 'Start date must be before end date'
        } else {
          delete draft.errors.dateRange
        }
      }),
    ),
  )
})
```

## 4. Aggregate computation over arrays (inline list totals)

**Scenario**: in a cart/list, any row field change requires recomputing totals.

**Pattern**: watch the entire `items` array. In `flow.run`, compute derived state in one pass (row `total` and overall `summary`) to avoid multiple updates and redundant renders.

```typescript
// Conceptually, `$Cart` is a Bound API pre-bound to a CartShape.
const calculateTotalsLogic = Effect.gen(function* () {
  const items$ = $Cart.flow.fromState((s) => s.items)

  yield* items$.pipe(
    $Cart.flow.debounce(50), // light debounce for batch operations
    $Cart.flow.run(
      $Cart.state.mutate((draft) => {
        let totalAmount = 0
        draft.items.forEach((item) => {
          item.total = item.price * item.quantity
          if (item.checked) {
            totalAmount += item.total
          }
        })
        draft.summary.totalAmount = totalAmount
      }),
    ),
  )
})
```

## 5. Init load

**Scenario**: automatically load data once when the Store is created (e.g. a detail page).

**Pattern**: in the main body of `Effect.gen` inside Logic, directly `yield*` a loading Effect. It runs only once on Logic initialization.

```typescript
// Conceptually, `$Page` is a Bound API pre-bound to PageShape + PageApi.
const initialLoadLogic = Effect.gen(function* () {
  const api = yield* $Page.use(PageApi)
  const pageId = (yield* $Page.state.read).pageId // assume pageId is in initial state

  // Execute load during Logic init
  yield* $Page.state.mutate((draft) => {
    draft.meta.isLoading = true
  })
  const data = yield* api.fetchPage(pageId)
  yield* $Page.state.mutate((draft) => {
    draft.data = data
    draft.meta.isLoading = false
  })

  // You can define more flow logic below...
})
```

## 6. External source integration (WebSocket / polling)

**Scenario**: subscribe to WebSocket messages or poll task status.

**Pattern**: inject the external source (WebSocket connection, timer) as an `Effect.Service` into Logic env. In Logic, read a `Stream` from the service and use `flow.run` to map events to state updates.

```typescript
// 1) Define a service
class Ticker extends Context.Tag("Ticker")<Ticker, { readonly ticks$: Stream.Stream<number> }>() {}

// 2) Consume it in Logic; `$Ticker` conceptually means a Bound API pre-bound to TickerShape + Ticker.
const tickerLogic = Effect.gen(function* () {
  const ticker = yield* $Ticker.use(Ticker)

  // Bridge external ticks$ into Logix
  yield* ticker.ticks$.pipe(
    $Ticker.flow.run((tick) =>
      $Ticker.state.mutate((draft) => {
        draft.lastTick = tick
      }),
    ),
  )
})
```

## 7. Use-case Actions instead of dispatch + sleep + dispatch

**Scenario**: you need “update state, then do the next step based on the updated state”. Many people instinctively dispatch twice from callers and insert `setTimeout` / `sleep` to “wait a bit”.

**Pattern**: collapse the sequence into one “use-case Action”, do “update state → read latest state → run follow-up effects” sequentially inside Logic. Callers dispatch only once.

```typescript
// 1) Define a Module with a use-case Action applyFilterAndReload
const Search = Logix.Module.make("Search", {
  state: Schema.Struct({
    filter: Schema.String,
    items: Schema.Array(Schema.String),
  }),
  actions: {
    setFilter: Schema.String,
    reload: Schema.Void,
    applyFilterAndReload: Schema.Struct({ filter: Schema.String }),
  },
})

// 2) Orchestrate “update filter + reload” sequentially inside Logic
const logic = Search.logic(($) =>
  $.onAction("applyFilterAndReload").run(({ payload }) =>
    Effect.gen(function* () {
      // Step 1: write the latest filter
      yield* $.state.update((s) => ({ ...s, filter: payload.filter }))

      // Optionally read the latest state
      const state = yield* $.state.read

      // Step 2: run follow-up work based on the latest filter (API call / dispatch other Actions / etc.)
      yield* runSearchWithFilter(state.filter)
      // Or: yield* $.actions.reload(undefined)
    }),
  ),
)
```

With this pattern:

- UI/callers dispatch only `applyFilterAndReload` once; they don’t need to reason about timing between “set then reload”.
- Ordering is owned by Logic; `$.state.update` / `$.state.read` naturally guarantees “the next step always sees the committed previous step”, avoiding sleep hacks and magic delays.

## Next

- Full React integration guide: [React integration](./react-integration)
- API reference: [API Reference](../../api/)
- More advanced patterns: [Unified API example](./unified-api)
