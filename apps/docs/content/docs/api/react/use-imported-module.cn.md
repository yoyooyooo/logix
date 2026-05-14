---
title: useImportedModule
description: 从父实例 import scope 中解析子 Program。
---

`useImportedModule(parent, childTag)` 从父实例的 import scope 中解析子 module。

子模块必须在 assembly 阶段以 Program 形式提供：

```ts
const HostProgram = Logix.Program.make(Host, {
  initial,
  capabilities: {
    imports: [ChildProgram],
  },
})
```

React 使用：

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = useImportedModule(host, Child.tag)
const childValue = useSelector(child, (state) => state.value)
```

当 UI 必须读取或派发隶属于父实例 scope 的子实例时，使用这条路线。

## Boundaries

- 它不会跨不相关 runtime scopes 搜索。
- 它不会自己创建子 Program。
- 它不替代 `Program.make(..., { capabilities: { imports } })`。

## See also

- [Program](/cn/docs/api/core/program)
- [useModule](./use-module)
