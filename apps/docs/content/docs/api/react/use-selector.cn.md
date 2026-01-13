---
title: useSelector
description: 订阅模块状态（或切片），支持自定义 equality，并在满足条件时启用 ReadQuery 订阅优化。
---

`useSelector` 是 React 中读取 Logix 模块状态的主力 Hook：

- 订阅模块状态（或选取一个切片），
- 只有当选中值发生变化时才触发重渲染。

## 基本用法

```tsx
import { useModule, useSelector } from '@logixjs/react'
import { CounterDef } from './modules/counter'

function Counter() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.count)

  return <div>{count}</div>
}
```

## API

### 1) `useSelector(handle)`（读取完整 state）

返回模块的完整状态。

### 2) `useSelector(handle, selector, equalityFn?)`（读取切片）

- `selector`：`(state) => slice`
- `equalityFn`：可选的相等判断函数，用于控制“何时触发重渲染”

在满足条件时，Logix 会把 selector 编译成 `ReadQuery`，以启用更优化的订阅路径。

## 延伸阅读

- [API: useModule](./use-module)
- [API: useDispatch](./use-dispatch)
- [API: ReadQuery](../core/read-query)
