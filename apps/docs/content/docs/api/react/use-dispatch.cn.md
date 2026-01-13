---
title: useDispatch
description: 获取类型安全的 dispatch 函数，并提供 batch/lowPriority 等常用调度助手。
---

`useDispatch` 会为某个模块返回一个类型安全的 dispatch 函数，并附带常用的调度助手。

## 基本用法

```tsx
import { useDispatch, useModule, useSelector } from '@logixjs/react'
import { CounterDef } from './modules/counter'

function Counter() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## API

`useDispatch(handle)` 返回一个函数对象：

- `dispatch(action)`
- `dispatch.batch(actions)`
- `dispatch.lowPriority(action)`（更温和的 UI 通知合并；不改变事务正确性）

## 延伸阅读

- [API: useModule](./use-module)
- [Guide: Tick / Flush](../../guide/essentials/tick-and-flush)
