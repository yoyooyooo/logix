---
title: useImportedModule
description: 从父实例的 imports scope 中解析子模块实例。
---

`useImportedModule(parent, childTag)` 用来从父实例的 imports scope 中解析子模块。

它等价于：

```ts
parent.imports.get(childTag)
```

## 用法

```tsx
import { useImportedModule, useModule, useSelector } from "@logixjs/react"
import { HostProgram, ChildModule } from "./modules"

function Page() {
  const host = useModule(HostProgram, { key: "session-a" })
  const child = useImportedModule(host, ChildModule.tag)
  const value = useSelector(child, (s) => s.value)

  return <div>{value}</div>
}
```

## 适用场景

当 UI 必须直接读取或派发一个隶属于父实例 scope 的子模块时，使用 `useImportedModule(...)`。

如果 UI 只需要编排逻辑，优先在 host logic 内完成对子模块的解析或协调。

## 说明

- `parent` 应该是带实例 scope 语义的句柄。
- `useImportedModule(...)` 不会跨 runtime scope 搜索。
- `parent.imports.get(childTag)` 是非 Hook 形态，很多场景已经足够。
- Logic 中同一条 parent-scope child resolution 路线固定写作 `$.imports.get(childTag)`。

## 相关页面

- [useModule](./use-module)
- [ModuleScope](./module-scope)
- [跨模块协作](../../guide/learn/cross-module-communication)
