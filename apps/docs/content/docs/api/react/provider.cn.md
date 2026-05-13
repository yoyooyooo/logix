---
title: RuntimeProvider
description: 向 React 子树提供 Logix runtime。
---

`RuntimeProvider` 用来向 React 子树提供 Logix runtime。

它是当前 canonical React host API 的前提：

- `useModule(...)`
- `useImportedModule(...)`
- `useSelector(...)`
- `useDispatch(...)`

## 用法

```tsx
import { RuntimeProvider } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { Layer } from "effect"
import { RootProgram } from "./root-program"

const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.empty,
})

export function Root() {
  return (
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  )
}
```

## Props

### `runtime`

必填。

这里可以传任意 `ManagedRuntime`。
在常见的应用或页面场景里，它通常来自 `Logix.Runtime.make(...)`。

### `layer`

可选。

向 React 子树附加一个闭合的 `Layer`。

### `fallback`

可选。

用于 provider 在等待异步启动路径时显示的 fallback。

### `policy`

可选。

控制 provider 的启动行为，例如 `sync`、`suspend` 或 `defer + preload`。

## 说明

- `RuntimeProvider` 定义这棵子树可见的 runtime scope。
- 它不负责选择 program。
- 它不定义第二条 control plane。
- `@logixjs/react` 的 hooks 都必须运行在 `RuntimeProvider` 子树内。

## 相关页面

- [useModule](./use-module)
- [useSelector](./use-selector)
- [useDispatch](./use-dispatch)
