---
title: Tick / Flush
description: 理解事务提交与外部可观察快照之间的边界。
---

Tick 和 flush 描述的是这样一条边界：

- 模块内部事务工作
- 外部可观察快照的发布

## 最小时间线

```text
input -> state:update -> trace:tick -> subscriber notification -> render
```

## 为什么存在

这条边界提供：

- batching
- 多次读取之间的一致性
- 当预算超限时可解释的降级证据

## DevTools 读取

最重要的 `trace:tick` phase 有：

- `start`
- `settled`
- `budgetExceeded`

关键字段包括：

- `tickSeq`
- `result.stable`
- `result.degradeReason`
- `backlog.deferredPrimary`

## 常见建议

- 多次 dispatch 属于同一用户意图时，优先 batching
- `Runtime.batch(...)` 只作为同步边界使用
- 看到 `budgetExceeded` 时，先看证据，再调旋钮

## 相关页面

- [Performance & optimization](../advanced/performance-and-optimization)
- [Troubleshooting](../advanced/troubleshooting)
