---
title: Logic and effects
description: Logix logic 如何使用 Effect、service、watcher 与运行策略。
---

`Module.logic` 是绑定到一个 module 的 Effect 程序。它注册声明，并返回随 module instance 生命周期运行的工作。

## Builder 形状

```ts
const logic = Module.logic("logic-id", ($) =>
  Effect.gen(function* () {
    yield* $.readyAfter(loadInitialConfig, { id: "initial-config" })

    yield* $.onAction("submitted").runLatest((action) =>
      Effect.gen(function* () {
        const api = yield* $.use(ApiService)
        const saved = yield* api.save(action.payload)
        yield* $.state.mutate((draft) => { draft.saved = saved })
      }),
    )
  }),
)
```

builder 是单一 authoring surface。公开路线里没有第二个 setup object。

## Watchers

`$.onAction(tag)` 与 `$.onState(selector)` 创建事件流。builder 方法决定每个事件怎样执行。

| 方法 | 语义 |
| --- | --- |
| `run` | 按顺序处理每个事件。 |
| `runLatest` | 这个触发器只保留最新事件。 |
| `runExhaust` | 当前事件运行期间忽略新事件。 |
| `runParallel` | 允许并发执行。 |
| `runTask` 系列 | 带 pending/error/writeback 结构的长任务路线。 |

## Services

用 `$.use(ServiceTag)` 从 runtime 环境读取服务。实现通过 `Layer` 提供，可以放在 `Program.make`、`Runtime.make` 或 `RuntimeProvider` 边界。

## Readiness

`$.readyAfter(effect, { id })` 会让 module readiness 等到该 effect 成功。返回的 run effect 可以在 ready 后继续运行；除非显式注册为 readiness requirement，否则不会阻塞实例获取。
