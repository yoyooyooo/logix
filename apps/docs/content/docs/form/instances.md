---
title: Instances
description: Choose shared, local, and keyed Form instances in React.
---

Form instance lifetime is owned by the React host.
`Form.make(...)` declares a form program; `RuntimeProvider` and `useModule(...)` decide which runtime instance the component receives.

## Default choice

| Need | Code | Lifetime |
| --- | --- | --- |
| One shared form for an app or route | `useModule(UserForm.tag)` | hosted by the current `RuntimeProvider` |
| One independent copy per component | `useModule(UserForm)` | private to the current component |
| Reuse one local copy across components | `useModule(UserForm, { key })` | reused under the same provider scope and key |
| Restore shortly after unmount | `useModule(UserForm, { key, gcTime })` | kept alive for `gcTime` after the last holder unmounts |

## Shared instance

Use a shared instance for route-level or app-level forms, such as one editor session for the page.

```tsx
const runtime = Logix.Runtime.make(UserForm)

function Page() {
  const form = useModule(UserForm.tag)
  const email = useSelector(form, (s) => s.email)
}
```

`useModule(UserForm.tag)` looks up an instance already hosted in the current runtime scope.
It does not create a new Form runtime.

## Component-private instance

Use the program route when a page renders multiple independent copies of the same form.

```tsx
function EditorCard() {
  const form = useModule(UserForm)
  const email = useSelector(form, (s) => s.email)
}
```

Without a `key`, each component call owns its own instance.
Two components using the same `FormProgram` are not merged into one instance by the default suspend behavior.

## Keyed instance

Pass an explicit `key` when one form instance should be reused across components, tabs, or route segments.

```tsx
function UserEditor({ userId }: { userId: string }) {
  const form = useModule(UserForm, { key: `user:${userId}` })
  const email = useSelector(form, (s) => s.email)
}
```

The same `Program`, provider runtime scope, and `key` reuse the same instance.
Different provider runtime scopes or different `Program` values produce different instances even when the key string matches.

## Restore after route changes

Use `gcTime` when users may leave a route and come back shortly after.

```tsx
const form = useModule(CheckoutForm, {
  key: `checkout:${cartId}`,
  gcTime: 60_000,
})
```

After the last holder unmounts, the instance stays alive for the `gcTime` window.
Remounting within the window restores the existing instance; remounting after the window creates a new one.

Restore performance mostly depends on:

- form state size
- number of subscribed slices
- row count and row identity mode
- whether sources need to load remote data again

Keep reads narrow:

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)
const visibleRows = useSelector(form, (s) => s.items)
```

## When not to share

Do not use a shared instance for copies that should be independent.
If two components edit the same `FormProgram` but users expect isolated state, use `useModule(FormProgram)` or different keyed instances.

## See also

- [Quick start](/docs/form/quick-start)
- [Performance](/docs/form/performance)
- [useModule](/docs/api/react/use-module)
- [RuntimeProvider](/docs/api/react/provider)
