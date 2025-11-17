---
title: LogixProvider
description: API Reference for LogixProvider
---

# LogixProvider (RuntimeProvider)

`LogixProvider` (也称为 `RuntimeProvider`) 是 Logix 应用的根组件，用于向下层组件提供 Runtime 上下文。

## Usage

```tsx
import { RuntimeProvider } from '@logix/react'
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import { RootImpl } from './root-module'

// 推荐：使用 Root ModuleImpl + Logix.Runtime.make 构造应用级 Runtime
const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.empty, // 这里也可以合并 HttpClient / Config 等服务 Layer
})

function Root() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <App />
    </RuntimeProvider>
  )
}
```

## API

### `<RuntimeProvider runtime>`

- `runtime`: 任意 `ManagedRuntime` 实例（来自 `effect`），在典型的应用/页面场景下，通常是 `Logix.Runtime.make(root, { layer })` 的返回值（`root` 可为 program module 或其 `.impl`）。
  - 推荐：使用 Root ModuleImpl + `Logix.Runtime.make` 定义应用级 Runtime，再传入 `RuntimeProvider`。
  - 例外：若你的项目已经在其他地方创建了通用的 `ManagedRuntime`（例如只作为 Effect 宿主，不关心模块树），也可以直接传入。

> 关于如何选择 `Logix.Runtime.make` 与裸 `ManagedRuntime.make`，可参考「Runtime 与 ManagedRuntime」文档。

## Context

`RuntimeProvider` 会通过 React Context 注入：

- **Runtime**: 全局 Effect 运行时。
- **Scope**: 根 Scope。
- **Store**: 全局状态存储。

所有下层组件（通过 `useModule` 等）都会自动连接到这个 Runtime。
