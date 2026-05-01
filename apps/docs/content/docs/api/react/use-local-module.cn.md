---
title: useLocalModule
description: 在 React 中创建组件局部模块实例。
---

`useLocalModule` 用于创建组件局部模块实例。

这是一条高级路线。
当一个组件实例应该拥有一个局部 runtime 实例，且不需要跨组件共享时，使用它。

## 用法

```tsx
import * as Logix from "@logixjs/core"
import { useDispatch, useLocalModule, useSelector } from "@logixjs/react"
import { Schema } from "effect"

const LocalForm = Logix.Module.make("LocalForm", {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
  reducers: {
    change: (state, action) => ({ ...state, text: action.payload }),
  },
})

export function LocalFormComponent() {
  const form = useLocalModule(LocalForm, { initial: { text: "" } })
  const text = useSelector(form, (s) => s.text)
  const dispatch = useDispatch(form)

  return <input value={text} onChange={(e) => dispatch({ _tag: "change", payload: e.target.value })} />
}
```

## 特性

- 同步创建
- 生命周期绑定组件
- 不跨组件共享

## Options

`useLocalModule(module, options)` 接受：

- `initial`
- `logics`
- `deps`
- `key`

`useLocalModule(factory, deps?)` 接受同步 factory 路线。

## 不适用场景

出现下面这些需求时，优先改用 `useModule(Program, options?)`：

- 需要异步初始化
- 需要 keyed reuse
- 需要跨组件共享同一实例

## 相关页面

- [useModule](./use-module)
- [useSelector](./use-selector)
