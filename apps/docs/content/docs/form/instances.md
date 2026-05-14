---
title: Instances
description: Shared, imported, and local Form program instances.
---

A Form program follows the same instance rules as any Logix program.

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

Use a stable key when multiple components should share the same local form instance.
