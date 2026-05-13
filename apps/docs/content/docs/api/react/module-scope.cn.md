---
title: ModuleScope
description: 通过 Provider、use 和 useImported helper 把 host 实例组织成可复用 scope。
---

`ModuleScope` 用于把一个 host 实例组织成可复用的 scope。

它适合这样的高级场景：某个 route 或 page 需要拥有一个 host 实例，而深层子组件又需要在不透传 props 的情况下解析这个 host 或它的 imports。

## 用法

```ts
import { ModuleScope } from "@logixjs/react"
import { RouteHostProgram } from "./modules"

export const RouteHostScope = ModuleScope.make(RouteHostProgram, { gcTime: 0 })
```

```tsx
export function RoutePage({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Provider options={{ scopeId: routeKey }}>
      <PageBody />
    </RouteHostScope.Provider>
  )
}
```

子组件可以解析：

```ts
const host = RouteHostScope.use()
const modalA = RouteHostScope.useImported(ModalA.tag)
```

## Bridge

`Bridge` 用于在另一个 React root 中复用已经注册好的 scope：

```tsx
export function OverlayRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Bridge scopeId={routeKey}>
      <Overlay />
    </RouteHostScope.Bridge>
  )
}
```

## 说明

- `ModuleScope` 属于高级 scope helper
- 它不会创建第二条 host law
- provider 持有 scope 的生命周期
- provider 缺失时，`use()` 和 `useImported()` 会直接失败

## 相关页面

- [useImportedModule](./use-imported-module)
- [useModule](./use-module)
