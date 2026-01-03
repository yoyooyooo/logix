---
title: 管理状态 (Managing State)
description: 使用 $.state 与用例级 Action 管理单一事实源。
---

在 Logix 中，**状态是单一事实源 (Single Source of Truth)**：
每个 Module 持有一棵自己的 State 树，所有 UI 渲染、业务联动和副作用都围绕它展开。

本篇聚焦两件事：

1. 如何通过 `$.state` 安全地读取和更新状态；
2. 当“后一步逻辑需要依赖前一步的最新状态”时，推荐的写法是什么。

### 适合谁

- 已经会写简单的 Logic，希望在项目里设计更清晰的状态读写策略；
- 遇到过“连续 dispatch + sleep 才能拿到最新状态”的实现，想要更好的替代方案。

### 前置知识

- 熟悉 [Modules & State](../essentials/modules-and-state) 中的基本概念；
- 了解 Bound API 上的 `$.state.read / update / mutate`。

### 读完你将获得

- 一组在团队中可复用的“状态读写规范”；
- 知道如何在 Logic 内部顺序地完成“更新状态 + 执行业务”，而不是在调用方拼装时序；
- 对“用例级 Action”有直观认识，能够在自己的业务中识别出这类场景。

## 1. 用 $.state 读写状态

在 Logic 中，你通过 Bound API (`$`) 访问当前 Module 的状态：

- `$.state.read`：读取当前状态快照；
- `$.state.update(prev => next)`：使用纯函数更新整棵状态；
- `$.state.mutate(draft => { ... })`：使用可变 Draft 更新（推荐）；
- `$.state.ref(selector?)`：获取一个可订阅的 Ref，用于高级响应式场景。

典型用法：

```ts
// 读取当前状态
const state = yield* $.state.read

// 纯函数更新
yield*
  $.state.update((prev) => ({
    ...prev,
    count: prev.count + 1,
  }))

// Draft 更新（推荐）
yield*
  $.state.mutate((draft) => {
    draft.count += 1
    draft.meta.lastUpdatedAt = Date.now()
  })
```

在 Effect 语义下：

- `read` 始终返回当前最新快照；
- `update` / `mutate` 在当前 Logic 流程中按顺序执行，多次调用会按代码顺序依次生效；
- 无需在 Logic 内部使用 `setTimeout` / `sleep` 等手段“等待状态更新”。

## 2. 避免在调用方连续 dispatch + sleep

在很多业务中，你可能会遇到这样的需求：

> “先更新筛选条件，再基于更新后的条件加载列表。”

直觉写法往往是：

```ts
// 不推荐：在调用方连续 dispatch，并通过 sleep 等待
yield* runtime.dispatch({ _tag: 'setFilter', payload: newFilter })
// sleep(50) 或 Effect.sleep(...)
yield* runtime.dispatch({ _tag: 'reload', payload: undefined })
```

这类写法有几个问题：

- `dispatch` 在 Logix 中是“发消息”，具体 watcher 何时处理完是异步的；
- 不同环境下 `sleep` 时间难以把握，会引入不稳定的时序问题；
- 调用方需要了解内部实现细节（谁在监听、何时写回 state），违背“意图优先”的设计。

更推荐的做法是：**把这串逻辑收敛成一个“用例级 Action”**，并在 Logic 内部顺序完成“更新状态 + 执行下一步”。

## 3. 用例级 Action：在 Logic 内部顺序编排

### 3.1 定义用例级 Action

在 Module 中，为这类组合操作单独定义一个 Action，例如：

```ts
const Search = Logix.Module.make('Search', {
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
```

### 3.2 在 Logic 中顺序使用 $.state

在 Logic 中，通过 `$.state.mutate` 和 `$.state.read` 保证顺序：

```ts
const logic = Search.logic(($) =>
  $.onAction('applyFilterAndReload').run(({ payload }) =>
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

调用方只需要派发一次用例级 Action：

```ts
yield*
  runtime.dispatch({
    _tag: 'applyFilterAndReload',
    payload: { filter: newFilter },
  })
```

这样可以保证：

- 状态更新与后续副作用都在同一段 Logic 程序中顺序执行；
- 外层调用方只关注“发起一个业务用例”，不再关心内部是“一次还是多次更新”；
- 不需要任何 `sleep` 或魔法时间常数，就能自然获得“后一步看到的是前一步之后的状态”。

> 更完整的示例与其他常见场景（例如表单提交、批量更新）可以参考
> [「常用配方」中的“用例级 Action 替代连续 dispatch”](../recipes/common-patterns)。

## 4. 小结

- 状态的读写应尽量集中在 Logic 内部，通过 `$.state.read / update / mutate` 完成；
- 当后续步骤需要依赖“刚刚写入的最新状态”时，优先设计一个**用例级 Action**，在 Logic 里顺序编排，而不是在调用方拼多个 dispatch；
- UI 组件和外层调用方只负责派发“意图”，具体“先做什么再做什么”交给 Logic 管理。

## 下一步

- 深入了解模块生命周期：[生命周期与 Watcher](./lifecycle-and-watchers)
- 学习跨模块通信：[跨模块通信](./cross-module-communication)
- 查看运行时架构解析：[深度解析](./deep-dive)
