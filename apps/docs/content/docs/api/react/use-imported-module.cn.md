---
title: useImportedModule
description: 从 parent handle 读取 child program handle。
---

`useImportedModule(parentHandle, childTag)` 是 program imports 的 React helper。

```tsx
const parent = useModule(ParentProgram, { key: "page" })
const child = useImportedModule(parent, Child.tag)
```

child 必须存在于 parent program 的 `Program.capabilities.imports` 中。

```ts
const ParentProgram = Logix.Program.make(Parent, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

当 child instance 属于 parent 装配出的业务单元时使用这条路线。当 React 应拥有一个独立 local child instance 时，使用 `useModule(ChildProgram, { key })`。
