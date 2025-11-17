---
title: Task Runner（长链路：pending → IO → writeback）
---

当你需要写“长链路交互”（例如：点击按钮 → 立刻进入 loading → 等待请求 → 成功/失败写回）时，推荐使用 `run*Task` 系列 API。

它的目标是：**保持代码写法线性**，同时把长链路自动拆成多段提交，让 UI 能看到 `pending`（loading）阶段。

## 1. 你会遇到的典型问题

如果你把 “loading=true → 等待 IO → loading=false + data” 全写进同一个 `run*` handler，UI 往往只能看到最后结果，而看不到中间的 loading。

原因不是 `runLatest` 不好用，而是**长链路需要拆分为多次提交**：pending 一次、结果写回一次。

## 2. run\*Task 的写法与语义

四个方法一一对应现有并发后缀：

- `runTask`：串行执行（每次触发都排队跑完）
- `runLatestTask`：最新优先（新触发会取消旧任务，只写回最新结果）
- `runExhaustTask`：防重（忙时忽略后续触发）
- `runParallelTask`：显式并行（每次触发独立执行）

每次“被接受并启动”的触发，会拆成三段：

1. `pending`：**立刻提交**（只做同步状态写入，例如 `loading=true`）
2. `effect`：执行真正的 IO（请求/异步任务）
3. `success` / `failure`：IO 完成后再次提交写回结果

## 3. 示例：搜索（runLatestTask）

```ts
yield* $.onAction("search").runLatestTask({
  pending: (a) =>
    $.state.update((s) => ({
      ...s,
      loading: true,
      keyword: a.payload,
      error: undefined,
    })),

  effect: (a) => api.search(a.payload),

  success: (result) =>
    $.state.update((s) => ({
      ...s,
      loading: false,
      items: result.items,
    })),

  failure: (cause) =>
    $.state.update((s) => ({
      ...s,
      loading: false,
      error: String(cause),
    })),
})
```

这段逻辑的效果是：

- 每次触发都会先进入 `loading=true`；
- 如果用户快速重复触发，旧请求会被取消，并且不会写回旧结果；
- 最终只写回最新一次成功/失败的结果。

## 4. 使用边界

- `run*Task` 只能用在 `$.onAction / $.onState / $.on` 这类 watcher 的链尾。
- 不要在 reducer / trait.run 这类“同步事务逻辑”里直接调用 `run*Task`。
