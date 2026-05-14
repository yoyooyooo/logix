---
title: Derived values
description: Keep derivation in selectors, submit decode, rules, or runtime logic.
---

Form does not expose a separate public `derived` family.

Use the right owner:

| Need | Route |
| --- | --- |
| view-only derivation | `useSelector(form, selector)` |
| typed payload derivation | `submit({ decode })` |
| final validation derivation | `Form.Rule.make(...)` |
| local UX support fact | `field(path).companion(...)` |
| remote fact | `field(path).source(...)` |

```tsx
const canSubmit = useSelector(
  form,
  (state) => state.$form.errorCount === 0 && !state.$form.isSubmitting,
)
```

Do not add a Form-specific derived hook or public derived namespace unless it can reduce to the existing owners without creating a second read law.
