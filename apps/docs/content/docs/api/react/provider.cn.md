---
title: RuntimeProvider
description: 在 React 中提供 Logix Runtime 上下文
---

`RuntimeProvider` 是 React 侧唯一的“能力注入点”：把 Logix `ManagedRuntime` 注入到 React Context，让下层 hooks 能解析模块、订阅状态、派发动作。

## 先记住这张能力地图

- 解析句柄：`useModule` / `useLocalModule`
- 订阅渲染：`useSelector`
- 派发动作：`useDispatch`（以及 `handle.dispatch`）
- imports scope：`handle.imports.get` / `useImportedModule`
- 逃生口：`useRuntime`（需要直接跑 Effect/调试时）

> 所有 `@logixjs/react` hooks 都必须在 `RuntimeProvider` 子树内调用。

## 最小用法

```tsx
	import { RuntimeProvider } from '@logixjs/react'
	import * as Logix from '@logixjs/core'
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

### `<RuntimeProvider layer?>`（可选）

- `layer`: 额外注入到 React 子树的 Layer（例如额外的 Config/Logger），它必须是“闭合环境”的 Layer（`R = never`），避免在组件树里引入未满足的依赖。

### `<RuntimeProvider fallback?>`（强烈建议）

- `fallback`: Provider gating / Suspense 等待时显示的 fallback。推荐统一只用一个 `fallback`，避免多处 fallback 造成闪烁与心智分裂（详见 [React 集成（启动策略与冷启动优化）](../../guide/essentials/react-integration)）。

### `<RuntimeProvider policy?>`（可选）

- `policy`: Provider 的启动策略（`suspend` / `sync` / `defer + preload`），建议直接阅读 [React 集成（启动策略与冷启动优化）](../../guide/essentials/react-integration)。

## Context

`RuntimeProvider` 会通过 React Context 注入：

- **Runtime**: 全局 Effect 运行时。
- **Scope**: 根 Scope。
- **Store**: 全局状态存储。

所有下层组件（通过 `useModule` 等）都会自动连接到这个 Runtime。
