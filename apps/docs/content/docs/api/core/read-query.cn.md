---
title: ReadQuery
description: 稳定、可诊断的 selector 契约，用于细粒度订阅/读优化，以及 declarative Link 的基础积木。
---

ReadQuery 是一个**稳定的 selector 契约**：

- 提供稳定的 `selectorId`，
- 声明它读取哪些字段（`reads`），
- 并提供 `select` 函数。

基于这个结构，Logix 可以：

- 构建细粒度订阅，
- 减少不必要的重渲染，
- 把 selector 作为 declarative 跨模块 Link 的受控输入。

## `ReadQuery.make(...)`

```ts
import * as Logix from '@logixjs/core'

const CountRead = Logix.ReadQuery.make({
  selectorId: 'rq_counter_count',
  reads: ['count'],
  select: (s: { readonly count: number }) => s.count,
  equalsKind: 'objectIs',
})
```

## 它会在哪些地方出现

- `useSelector(handle, selector)` 会在满足条件时把 selector 编译成 ReadQuery，以走更优化的订阅路径。
- `Link.makeDeclarative` 要求使用静态 ReadQuery（便于 Runtime 构造受控 IR 并提供强一致收敛）。

## 延伸阅读

- [API: Link](./link)
- [API: useSelector](../react/use-selector)
- [/api-reference](/api-reference)
