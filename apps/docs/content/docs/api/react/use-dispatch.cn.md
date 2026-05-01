---
title: useDispatch
description: 为模块句柄返回类型安全的 dispatch 函数。
---

`useDispatch` 会为模块句柄返回一个类型安全的 dispatch 函数。

## 用法

```tsx
import { useDispatch, useModule, useSelector } from "@logixjs/react"
import { Counter } from "./modules/counter"

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "increment" })}>{count}</button>
}
```

## Helpers

返回的函数同时暴露：

- `dispatch.batch(actions)`
- `dispatch.lowPriority(action)`

## 相关页面

- [useModule](./use-module)
- [useSelector](./use-selector)
