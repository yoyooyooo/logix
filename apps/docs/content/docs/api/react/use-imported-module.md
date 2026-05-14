---
title: useImportedModule
description: Read a child program handle from a parent handle.
---

`useImportedModule(parentHandle, childTag)` is the React helper for program imports.

```tsx
const parent = useModule(ParentProgram, { key: "page" })
const child = useImportedModule(parent, Child.tag)
```

The child must be present in `Program.capabilities.imports` for the parent program.

```ts
const ParentProgram = Logix.Program.make(Parent, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

Use this when the child instance is part of the parent's assembled business unit. Use `useModule(ChildProgram, { key })` when React should own a separate local child instance.
