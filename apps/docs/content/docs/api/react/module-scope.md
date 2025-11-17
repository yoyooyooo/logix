---
title: ModuleScope
description: 把 Host 实例变成可复用的 Scope（Provider + use + useImported）
---

# ModuleScope

`ModuleScope` 用来把“创建 Host 模块实例 + Context Provider + useHost()”打包成一个可复用的 Scope。

它主要解决两件事：

1. **避免 props 透传**：深层弹框/子组件可以直接拿到“属于当前路由/页面 scope”的 Host 句柄。
2. **固定生命周期 owner**：模块实例的存活由路由/页面边界的 Provider 决定，而不是跟随某个弹框组件的卸载。

## Usage

```ts
import { ModuleScope } from '@logix/react'
import { RouteHost } from './modules'

export const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })
```

路由/页面边界挂 Provider：

```tsx
export function RoutePage({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Provider options={{ scopeId: routeKey }}>
      {/* page body */}
      {/* modals */}
    </RouteHostScope.Provider>
  )
}
```

子组件拿 Host（需要访问 host 自身或多个子模块时）：

```ts
const host = RouteHostScope.use()
```

更常见：直接拿 imports 子模块句柄（语法糖）：

```ts
const modalA = RouteHostScope.useImported(ModalA.tag)
```

## Bridge（高级）

当你的组件不在路由/页面的 React 树里（例如全局浮层使用独立的 `createRoot`），但你仍希望它复用同一个“路由 scope（Host 实例）”时，可以使用 `Bridge`：

```tsx
export function OverlayRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Bridge scopeId={routeKey}>
      {/* 这里可以继续 use()/useImported() */}
    </RouteHostScope.Bridge>
  )
}
```

前提条件：

- 路由/页面边界存在对应的 `<RouteHostScope.Provider options={{ scopeId }}>`（Bridge 只“取回并复用”，不负责创建）。
- Bridge 所在的 root 与 Provider 所在的 root 必须共享同一个 app runtime（同一个 runtime tree）。
- 运行时必须包含 Bridge 依赖的基础设施：使用 `Logix.Runtime.make(...)` 创建 runtime 时默认满足；若你是手动拼装 runtime，请参考高级区文档（避免在这里展开细节）。

失败语义：

- 若 `scopeId` 未注册或已被释放（owner Provider 已卸载/切换 scopeId），`Bridge` 会抛出可读错误（避免静默串用或拿到错误实例）。

## Notes

- `Provider.options` 会透传给内部的 `useModule(HostImpl, options)`（其中 `options.scopeId` 会被映射为内部的 `options.key`）；`scopeId` 用来区分/复用同一个 scope（同 scopeId 复用、换 scopeId 新建）。
- `use()` / `useImported()` 在缺少 Provider 时会直接抛错（不会静默兜底到“全局单例”）。
