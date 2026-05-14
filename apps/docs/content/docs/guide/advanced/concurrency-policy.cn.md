---
title: 并发策略
description: 明确选择 run、latest、exhaust、parallel 与 task lane。
---

并发是 logic 语义的一部分。选择能匹配用户意图的最小策略。

| 策略 | 用途 |
| --- | --- |
| `run` | 每个事件都必须按顺序处理 |
| `runLatest` | typeahead、refresh、可替换异步工作 |
| `runExhaust` | submit button、不可重入动作 |
| `runParallel` | 相互独立的 fan-out 工作 |
| `runTask` 系列 | 带 pending/error/writeback 证据的长操作 |

## Latest search

```ts
yield* $.onAction("queryChanged").debounce(200).runLatest(fetchAndWrite)
```

## Exhaust submit

```ts
yield* $.onAction("submitted").runExhaust(submitOnce)
```

## 边界

并发策略属于 logic，放在 trigger 附近。除非只是视觉状态，不要把并发策略编码进 React button state。
