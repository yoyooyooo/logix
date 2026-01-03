---
title: '常用配方'
description: 常见 Logix 写法配方，可直接复用于实际业务。
---

本指南汇集了常见的 Logix 写法配方，涵盖字段联动、异步校验、多字段约束等场景，可直接复用于实际业务。

### 适合谁

- 已经掌握基本 Module/Logic 写法，希望直接套用成熟的“字段联动/异步校验/多字段约束”等模式；
- 在团队中负责沉淀常用片段到内部组件库/脚手架的同学。

### 前置知识

- 读过 [Flows & Effects](../essentials/flows-and-effects) 与相关 Learn 章节；
- 能够看懂 `$.onState / $.flow.* / $.state.mutate` 的组合。

### 使用方式

- 可以直接复制本页代码片段，替换成自己的 State/Service 类型；
- 也可以将这些模式提炼成团队内部的 Pattern / Helper，统一复用。

## 1. 字段联动与重置

**场景**: 选中某个字段时，重置一批相关字段（如国家变化时重置省份/城市）。

**模式**: 使用 `flow.fromState` 监听源字段，在 `flow.run` 中通过 `state.mutate` 更新目标字段。

```typescript
// 概念上，这里的 `$Form` 表示针对 FormShape 预绑定的 Bound API。
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

## 2. 异步校验与错误状态

**场景**: 字段变化触发异步校验（用户名重名检查），结果写回 `errors.xxx`。

**模式**: 使用 `flow.fromState` 监听，链式调用 `debounce` 和 `filter`，最后用 `runLatest` 执行包含 API 调用的 Effect，自动处理竞态。

```typescript
// 概念上，这里的 `$Form` 表示针对 FormShape + UserApi 预绑定的 Bound API。
const validateUsernameLogic = Effect.gen(function* () {
  const username$ = $Form.flow.fromState((s) => s.username)

  yield* username$.pipe(
    $Form.flow.debounce(500),
    $Form.flow.filter((username) => username.length >= 3),
    $Form.flow.runLatest(
      // 确保只处理最后一次输入
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

## 3. 多字段约束（如开始/结束时间）

**场景**: 多个字段之间存在约束（开始时间必须早于结束时间）。

**模式**: 使用 `flow.fromState` 监听一个包含多个字段的元组 `[s.startDate, s.endDate]`，然后在 `flow.run` 中执行校验逻辑。

```typescript
// 概念上，这里的 `$Form` 表示针对 FormShape 预绑定的 Bound API。
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

## 4. 数组聚合计算（列表行内计算）

**场景**: 商品列表中，任何行内字段变化时，都需要重新计算总价。

**模式**: 监听整个数组 `items` 的变化。在 `flow.run` 中，一次性完成所有派生状态（行内 `total` 和整体 `summary`）的计算，避免多次更新和重复渲染。

```typescript
// 概念上，这里的 `$Cart` 表示针对 CartShape 预绑定的 Bound API。
const calculateTotalsLogic = Effect.gen(function* () {
  const items$ = $Cart.flow.fromState((s) => s.items)

  yield* items$.pipe(
    $Cart.flow.debounce(50), // 轻微防抖，应对批量操作
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

## 5. 初始化加载 (Init Load)

**场景**: Store 创建时自动加载一次数据（如详情页）。

**模式**: 在 Logic 程序的 `Effect.gen` 主体中，直接 `yield*` 一个加载数据的 Effect。这个 Effect 只会在 Logic 初始化时执行一次。

```typescript
// 概念上，这里的 `$Page` 表示针对 PageShape + PageApi 预绑定的 Bound API。
const initialLoadLogic = Effect.gen(function* () {
  const api = yield* $Page.use(PageApi)
  const pageId = (yield* $Page.state.read).pageId // 假设 pageId 已在初始状态中

  // Logic 初始化时直接执行加载
  yield* $Page.state.mutate((draft) => {
    draft.meta.isLoading = true
  })
  const data = yield* api.fetchPage(pageId)
  yield* $Page.state.mutate((draft) => {
    draft.data = data
    draft.meta.isLoading = false
  })

  // 此处可以继续定义其他流式逻辑...
})
```

## 6. 外部源集成 (WebSocket / 轮询)

**场景**: 订阅 WebSocket 消息或轮询任务状态。

**模式**: 将外部源（WebSocket 连接、定时器）作为 `Effect.Service` 注入到 `Logic` 的环境中。在 Logic 程序中，从服务中获取 `Stream`，并使用 `flow.run` 将其事件映射到状态更新。

```typescript
// 1. 定义服务
class Ticker extends Context.Tag("Ticker")<Ticker, { readonly ticks$: Stream.Stream<number> }>() {}

// 2. 在 Logic 中消费；`$Ticker` 概念上表示针对 TickerShape + Ticker 预绑定的 Bound API。
const tickerLogic = Effect.gen(function* () {
  const ticker = yield* $Ticker.use(Ticker)

  // 将外部 ticks$ 流接入 Logix
  yield* ticker.ticks$.pipe(
    $Ticker.flow.run((tick) =>
      $Ticker.state.mutate((draft) => {
        draft.lastTick = tick
      }),
    ),
  )
})
```

## 7. 用例级 Action 替代连续 dispatch

**场景**: 需要“先更新某个状态，再基于更新后的状态执行下一步”，很多人直觉会在调用方连续触发两次 dispatch，并通过 `setTimeout` / `sleep` 等方式“等一等再调第二次”。

**模式**: 将这两个步骤收敛为一个“用例级 Action”，在 Logic 内部顺序执行：先更新状态，再读取最新状态并执行后续副作用，调用方只需要 dispatch 一次。

```typescript
// 1. 定义 Module，增加一个用例级动作 applyFilterAndReload
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

// 2. 在 Logic 中顺序完成“更新 filter + 触发加载”
const logic = Search.logic(($) =>
  $.onAction("applyFilterAndReload").run(({ payload }) =>
    Effect.gen(function* () {
      // 第一步：写入最新的筛选条件
      yield* $.state.mutate((draft) => {
        draft.filter = payload.filter
      })

      // 如有需要，可以读取一次最新状态
      const state = yield* $.state.read

      // 第二步：基于最新 filter 执行后续逻辑（调用接口 / 触发其他 Action 等）
      yield* runSearchWithFilter(state.filter)
      // 或者：yield* $.dispatchers.reload()
    }),
  ),
)
```

在这一模式下：

- UI / 调用方只需触发一次 `applyFilterAndReload`，不需要自己关心“先 set 再 reload”以及中间的等待时机；
- 顺序与依赖关系全部收敛在 Logic 内部，通过 `$.state.mutate` / `$.state.read` 自然保证“后一步总是看到前一步已经落地的状态”，避免在业务代码中堆叠 sleep 或魔法时间常数。

## 下一步

- 了解 React 集成的完整指南：[React 集成](./react-integration)
- 查看 API 参考文档：[API 参考](../../api/)
- 探索更多高级模式：[Unified API 示例](./unified-api)
