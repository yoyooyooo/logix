---
title: Selectors
description: Form reads through core field selectors and Form selector descriptors.
---

Form uses the same React host route as core modules.

## Values

```tsx
const name = useSelector(form, fieldValue("name"))
const [name, email] = useSelector(form, fieldValues(["name", "email"]))
```

## Meta

```tsx
const meta = useSelector(form, rawFormMeta())
```

## Errors

```tsx
const emailError = useSelector(form, Form.Error.field("email"))
```

## Companion

```tsx
const fieldCompanion = useSelector(form, Form.Companion.field("countryId"))
const rowCompanion = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

## Boundary

Do not add a Form-specific React read family. Form selectors are descriptors consumed by `useSelector`.
