---
title: Flow API
description: Flow 与 Fluent DSL 的底层 API 参考。
---

> **面向读者**：库作者、Pattern 作者、对 Fluent DSL (`$.onState/$.onAction`) 的底层实现感兴趣的同学。  
> 日常业务开发通常直接使用 `$` 上的 Fluent API 即可，无需显式调用本页中的底层函数。

在 Logix 中，Flow API 是 Fluent DSL 的“底层乐高块”：

- `$.onState(selector)` / `$.onAction(predicate)` 实际上会在内部调用 Flow API 构造 Stream 与执行策略；
- Pattern / 库代码可以直接操作 Flow API，以复用同一套并发与时间语义。

## 1. fromState / fromAction：获取源流

```ts
// 从当前 Module 的状态派生出一个流
const keyword$ = $.flow.fromState((s) => s.keyword)

// 从 Action 流中筛选出特定 Action
const submit$ = $.flow.fromAction(
  (a): a is { _tag: "submit" } => a._tag === "submit",
)
```

## 2. 流式算子：debounce / filter / map …

Flow API 暴露了一组与 `effect/Stream` 等价或近似的算子，以便在与 Bound API 解耦的场景下使用：

```ts
yield* keyword$.pipe(
  $.flow.debounce(300),
  $.flow.filter((kw) => kw.length > 2),
  $.flow.map((kw) => kw.trim()),
)
```

这些算子的错误与环境语义与 `Stream` 保持一致，具体以类型定义为准。

## 3. 执行策略：run / runParallel / runLatest / runExhaust

与 Fluent DSL 上的 `.run*` 一一对应：

```ts
yield* submit$.pipe(
  $.flow.run(handleSubmit),        // 串行
)

yield* keyword$.pipe(
  $.flow.debounce(300),
  $.flow.runLatest(searchEffect),  // 最新优先
)
```

- `run`：按到达顺序串行执行 handler；
- `runParallel`：为每次事件启动独立 Fiber，不做并发限制；
- `runLatest`：新事件到来时取消当前执行中的 Fiber，仅保留最新；
- `runExhaust`：当 handler 正在执行时，忽略新事件。

## 4. 与 Fluent DSL 的关系

从类型与语义上，Flow API 与 Fluent DSL 的关系可以概括为：

- `$.onState(selector).run(handler)` ≈ `$.flow.fromState(selector).pipe($.flow.run(handler))`；
- `$.onAction(predicate).debounce(300).runLatest(handler)` ≈ `$.flow.fromAction(predicate).pipe($.flow.debounce(300), $.flow.runLatest(handler))`。

在实现层面不要求逐条通过 Flow API 机械拼装 Fluent DSL，但**必须保证语义等价**，以便 DevTools/Intent Parser 能够在两层之间建立映射。

### See Also

- [Guide: Flows & Effects](../../guide/essentials/flows-and-effects)
- [Guide: 逻辑流 (Logic Flows)](../../guide/learn/adding-interactivity)
- [Guide: Error Handling](../../guide/advanced/error-handling)
