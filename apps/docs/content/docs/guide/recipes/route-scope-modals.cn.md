---
title: '路由 Scope 下的弹框 Keepalive'
description: 用 Host(imports) 组织“限定 scope 的全局”：路由内弹框保状态，离开路由统一销毁。
---

这篇配方解决一个非常常见的业务体验问题：

> 同一个路由里，有很多大大小小的弹框；希望弹框反复打开/关闭时尽可能保留状态，但离开路由后，路由下所有弹框相关模块都要一起销毁，避免跨路由串状态。

为降低误用成本，本文会把用法分成两层：

- **甜点区（推荐默认）**：不需要理解 Env/Scope 细节，照抄即可稳定落地；
- **高级区（理解后再用）**：当你真的需要“Provider 级单例”或“嵌套 Provider 分区”时再启用。

## 甜点区：Host(imports) = 路由内的“限定 scope 全局”

一句话心智模型：

> **路由 Host 模块是“范围拥有者”**；弹框模块作为 `imports` 子模块，生命周期跟着 Host；组件只从 `host.imports.get(...)` 拿子模块句柄。

### 1) 定义弹框模块（各自独立）

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const ModalADef = Logix.Module.make('ModalA', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

export const ModalA = ModalADef.implement({
  initial: { text: '' },
  // logics: [...]
})
```

弹框 B/C 同理，各自 `Module.make(...)` + `implement(...)`。

### 2) 定义路由 Host 模块，并把弹框模块 imports 进去

```ts
export const RouteHostDef = Logix.Module.make('RouteHost', {
  state: Schema.Struct({}),
  actions: { noop: Schema.Void },
})

export const RouteHost = RouteHostDef.implement({
  initial: {},
  imports: [ModalA.impl /*, ModalB.impl, ...*/],
})
```

### 3) 路由组件创建 Host 实例（scope 锚点）

```tsx
import { useModule } from '@logixjs/react'

export function RoutePage() {
  const host = useModule(RouteHost.impl, {
    // 多实例/多 Tab 场景可提供稳定 scopeId（通过 `useModule` 的 `options.key`；例如 `route:${routeId}`），确保同一路由实例可被复用。
    gcTime: 0, // 路由卸载后立即释放（不保留默认短窗口）
  })

  // ...
}
```

> 提示：在大多数路由框架里，“离开路由”意味着路由组件卸载；此时 Host 的 scope 会结束，imports 下的子模块会一起销毁。

### 4) 弹框组件只从 host.imports 取子模块句柄

```tsx
import { useSelector } from '@logixjs/react'
import { ModalA } from './modules'

export function ModalAView({ host }: { host: any }) {
  // 这里的 host 就是 `const host = useModule(RouteHost.impl, ...)` 的返回值
  const modalA = host.imports.get(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  // ...
  return <div>{text}</div>
}
```

这样做的效果：

- **关闭弹框只是 UI 卸载**，`ModalA` 的模块实例仍然跟随 `host` 保留；
- **只要路由 Host 还在**（路由没卸载），弹框再次打开就会复用同一份状态；
- **离开路由**（Host 卸载）时，Host 以及其 imports 下所有弹框模块会一起销毁。

你可以把它理解成：

> `host.runtime` 内部有一份“最小 injector”（imports-scope：`ModuleTag -> ModuleRuntime` 映射）。  
> `host.imports.get(ModalA.tag)` 拿到的就是这份映射里的那一条，所以它天然“跟随 host”，不会因为弹框组件卸载而被回收。

### 4.1) 避免 props 透传：用路由内 Context 承载 host（推荐）

如果弹框组件离路由组件很远（中间有多层组件），推荐使用 `@logixjs/react` 提供的 `ModuleScope.make(...)`，把“创建 host 实例 + Context Provider + useHost()”打包成一个可复用的 Scope。

```tsx
import { ModuleScope } from '@logixjs/react'
import { RouteHost } from './modules'

export const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })
```

> 建议把 `RouteHostScope` 定义在模块顶层（不要在组件 render 里 make），确保 Context 身份稳定。
>
> 如果子组件调用 `RouteHostScope.use()` 但上层没有挂载 `RouteHostScope.Provider`，它会直接抛错提醒你缺少 Provider。

路由页用法：

```tsx
export function RoutePage() {
  return (
    <RouteHostScope.Provider>
      {/* page body */}
      {/* modals */}
    </RouteHostScope.Provider>
  )
}
```

弹框里直接拿到“属于该路由 host 实例”的子模块句柄：

```tsx
import { useSelector } from '@logixjs/react'
import { ModalA } from './modules'

export function ModalAView() {
  const modalA = RouteHostScope.useImported(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  return <div>{text}</div>
}
```

> 如果你需要同时访问多个子模块或 host 自身状态，可以先 `const host = RouteHostScope.use()` 再 `host.imports.get(...)`。
>
> 多实例/多 Tab 场景可以给 Provider 传 `options.scopeId`：`<RouteHostScope.Provider options={{ scopeId: routeKey }} />`。

### 常见坑（请直接避开）

1. 在弹框里写 `useModule(ModalA.impl)` / `useModule(ModalA)`：这会创建“独立实例”，弹框卸载后会按 gcTime 释放，无法做到“跟随 Host keepalive”。
2. 在弹框里写 `useModule(ModalA.tag)`：这表达的是“Provider 环境单例”，会把弹框挂到 Provider 级全局，容易跨路由串状态。

## 高级区：什么时候才用 useModule(ModuleTag)

当你真的需要“Provider 级单例”时，可以用 `useModule(ModuleDef)` 或 `useModule(ModuleTag)`：

- 典型场景：当前用户、全局配置、全局路由状态（在应用根部创建一次，全站共享）。
- 约束：它表达的是“当前最近 RuntimeProvider 环境里的单例”，不是 Host(imports) 的子模块实例。

如果你的目标是“路由 scope 的限定全局”，优先回到甜点区：**Host(imports) + host.imports.get(...)**。

## 下一步

- 回到总览：[可组合性地图](../advanced/composability)
- 深入理解 imports/作用域语义：[跨模块协作](../learn/cross-module-communication)
