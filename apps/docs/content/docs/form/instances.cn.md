---
title: Instances
description: shared、imported 与 local Form program instances。
---

Form program 遵循与所有 Logix program 相同的实例规则。

## Root form

```ts
const runtime = Logix.Runtime.make(ContactForm)
```

```tsx
const form = useModule(ContactForm)
```

## Imported form

```ts
const HostProgram = Logix.Program.make(Host, {
  initial,
  capabilities: { imports: [ContactForm] },
})
```

```tsx
const host = useModule(HostProgram, { key: "page" })
const form = useImportedModule(host, ContactForm.tag)
```

## Local form

```tsx
const form = useModule(ContactForm, { key: userId })
```

多个组件需要共享同一个 local form instance 时，使用稳定 key。
