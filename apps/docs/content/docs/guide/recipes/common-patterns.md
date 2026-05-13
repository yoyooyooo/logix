---
title: Common recipes
description: Reusable patterns for linkage, async validation, aggregate recomputation, initialization, and external events.
---

The sections below collect reusable Logix recipes for common application problems.

## Field linkage and reset

Reset dependent fields when an upstream field changes:

```ts
const resetProvinceLogic = Effect.gen(function* () {
  const country$ = $Form.flow.fromState((s) => s.country)

  yield* country$.pipe(
    $Form.flow.run(
      $Form.state.mutate((draft) => {
        draft.province = ""
        draft.city = ""
      }),
    ),
  )
})
```

## Async validation

Run latest-only async validation and write the verdict back to state:

```ts
const validateUsernameLogic = Effect.gen(function* () {
  const username$ = $Form.flow.fromState((s) => s.username)

  yield* username$.pipe(
    $Form.flow.debounce(500),
    $Form.flow.filter((username) => username.length >= 3),
    $Form.flow.runLatest(
      Effect.gen(function* () {
        const api = yield* $Form.use(UserApi)
        const { username } = yield* $Form.state.read
        const isTaken = yield* api.checkUsername(username)

        yield* $Form.state.mutate((draft) => {
          draft.errors.username = isTaken ? "Username already taken" : undefined
        })
      }),
    ),
  )
})
```

## Multi-field constraints

Validate constraints that depend on more than one field:

```ts
const validateDateRangeLogic = Effect.gen(function* () {
  const datePair$ = $Form.flow.fromState((s) => [s.startDate, s.endDate] as const)

  yield* datePair$.pipe(
    $Form.flow.run(
      $Form.state.mutate((draft) => {
        if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
          draft.errors.dateRange = "Start date must be before end date"
        } else {
          delete draft.errors.dateRange
        }
      }),
    ),
  )
})
```

## Aggregate recomputation

Recompute row-level and summary-level derived state in one pass:

```ts
const calculateTotalsLogic = Effect.gen(function* () {
  const items$ = $Cart.flow.fromState((s) => s.items)

  yield* items$.pipe(
    $Cart.flow.debounce(50),
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

## Initialization load

Load initial data during logic startup:

```ts
const initialLoadLogic = Effect.gen(function* () {
  const api = yield* $Page.use(PageApi)
  const pageId = (yield* $Page.state.read).pageId

  yield* $Page.state.mutate((draft) => {
    draft.meta.isLoading = true
  })

  const data = yield* api.fetchPage(pageId)

  yield* $Page.state.mutate((draft) => {
    draft.data = data
    draft.meta.isLoading = false
  })
})
```

## External event integration

Consume an external event source through a service:

```ts
class Ticker extends Context.Tag("Ticker")<Ticker, { readonly ticks$: Stream.Stream<number> }>() {}

const tickerLogic = Effect.gen(function* () {
  const ticker = yield* $Ticker.use(Ticker)

  yield* ticker.ticks$.pipe(
    $Ticker.flow.run((tick) =>
      $Ticker.state.mutate((draft) => {
        draft.lastTick = tick
      }),
    ),
  )
})
```

## Use-case actions

Collapse “dispatch, wait, dispatch again” into one explicit use-case action:

```ts
const logic = Search.logic("search-logic", ($) =>
  $.onAction("applyFilterAndReload").run(({ payload }) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        draft.filter = payload.filter
      })

      const state = yield* $.state.read
      yield* runSearchWithFilter(state.filter)
    }),
  ),
)
```

## See also

- [React integration](./react-integration)
- [Unified API](./unified-api)
