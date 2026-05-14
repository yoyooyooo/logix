---
title: Tick and flush
description: runtime commit、selector notification 与 React render 的关系。
---

一次用户交互以 action 或 state write 进入 runtime。runtime 把工作合并进 transaction window，提交 state，然后通知精确读取者。

## 时间线

```text
dispatch action
  -> reducer / logic write
  -> state transaction
  -> field/source convergence
  -> commit
  -> selector notification
  -> React render
```

内部 phase 可能因性能优化而变化，但公开契约稳定：写入是事务化的，React 通过 selector 订阅读取。

## Selector precision

`fieldValue(path)` 与 `fieldValues(paths)` 给 runtime 稳定的字段级读取。selector function 也允许，但宽 selector 可能需要更多工作才能证明 precision。

## Batch 路线

需要组合同步 host work 时使用 `Runtime.batch`。

```ts
Logix.Runtime.batch(() => {
  dispatch({ _tag: "a", payload: undefined })
  dispatch({ _tag: "b", payload: undefined })
})
```

runtime batching 不应滥用。持久状态变化优先建模为 action 与 reducer。
