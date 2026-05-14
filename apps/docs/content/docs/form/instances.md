---
title: Instances
description: Choose shared, local, and keyed Form instances without introducing a second host route.
---

`Form.make(...)` returns a Program-compatible form definition. Instance ownership is decided by Runtime and React.

## Shared route

If the runtime root is the form Program, read the hosted instance through its tag:

```ts
const runtime = Logix.Runtime.make(ContactForm)
```

```tsx
const form = useModule(ContactForm.tag)
```

## Local/keyed route

If a route or component needs its own form instance, pass the Program to `useModule`:

```tsx
const form = useModule(ContactForm, { key: `contact:${contactId}` })
```

Use `gcTime` to keep the instance alive briefly after unmount:

```tsx
const form = useModule(ContactForm, {
  key: `contact:${contactId}`,
  gcTime: 60_000,
})
```

## Do not add another hook family

Do not reintroduce `useForm`, `useField`, `useFieldArray`, or any Form-owned instance hook as the canonical route. Instance acquisition is `useModule(...)`; reads are `useSelector(...)`; writes are the Form handle.
