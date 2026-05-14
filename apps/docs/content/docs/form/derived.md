---
title: Derived values
description: Where derived form state belongs.
---

Derived form values fall into three lanes.

| Lane | Use for |
| --- | --- |
| React selector | cheap view-only derivation. |
| Companion | local soft facts such as availability and candidates. |
| Rule/source/Form state | business truth that affects validation, submit, or persistence. |

## View-only derivation

```tsx
const displayName = useSelector(form, (state) => `${state.firstName} ${state.lastName}`.trim())
```

## Companion derivation

Use companion when the derived value should be reusable, row-scoped, or consumed as a domain fact.

## Boundary

Do not store every derived UI value in form state. Store durable truth; derive presentation at the read edge.
