---
title: Watcher patterns and concurrency
description: 选择 sequential、latest、exhaust、parallel 与 forked watcher 行为。
---

在 `Module.logic(...)` 内，watchers 通常来自 `$.onAction(...)`、`$.onState(...)` 或 `$.on(...)`。

## 选择 concurrency model

| Helper | 含义 | 典型用途 |
| --- | --- | --- |
| `run` | sequential；下一个 trigger 等前一个完成 | 有序 workflows |
| `runLatest` | 取消前一个 in-flight work，只保留最新 | search-as-you-type |
| `runExhaust` | 当前 work 完成前忽略新 trigger | 防止重复 submit |
| `runParallel` | 显式允许 parallel work | 独立 fire-and-track jobs |
| `runFork` 及变体 | 把 long-lived watcher 挂到 module scope | background watchers |

## 常见模式

```ts
const SearchLogic = Search.logic("search-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("keywordChanged").runLatest(
      Effect.gen(function* () {
        const state = yield* $.state.read
        // service work
      }),
    )
  }),
)
```

## 多个 watchers

```ts
const CounterLogic = Counter.logic("counter-watchers", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").runFork(
      $.state.mutate((state) => {
        state.value += 1
      }),
    )

    yield* $.onAction("dec").runFork(
      $.state.mutate((state) => {
        state.value -= 1
      }),
    )
  }),
)
```

`runFork` 会挂载 watcher 并快速返回。只有需要手动 Fiber control 时，才使用 raw `Effect.forkScoped`。

## Scope rule

Watchers 位于 ModuleRuntime scope 下。托管 module 跟随 runtime 生命周期。local/keyed React Program instance 跟随 `useModule(Program, options)` 与它的 `gcTime`。
