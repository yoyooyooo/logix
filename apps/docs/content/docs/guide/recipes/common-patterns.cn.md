---
title: 常用配方
description: 适用于联动、异步校验、聚合重算、初始化加载与外部事件接入的可复用模式。
---

下面收录常见应用问题的 Logix 配方。

## 字段联动与重置

当上游字段变化时，重置一组下游字段：

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

## 异步校验

执行 latest-only 异步校验，并把结果写回状态：

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

## 多字段约束

对依赖多个字段的约束进行校验：

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

## 聚合重算

在一轮里同时重算行级和摘要级派生状态：

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

## 初始化加载

在 logic 启动时加载初始数据：

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

## 外部事件接入

通过 service 消费外部事件源：

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

## 用例级动作

把“dispatch 一次，再等待，再 dispatch 一次”收成一个明确的 use-case action：

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

## 相关页面

- [React integration](./react-integration)
- [Unified API](./unified-api)
