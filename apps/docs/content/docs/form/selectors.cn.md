---
title: Selectors
description: Form 通过 core field selectors 与 Form selector descriptors 读取。
---

Form 使用与 core modules 相同的 React host route。

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

## 边界

不要添加 Form-specific React read family。Form selectors 是由 `useSelector` 消费的 descriptor。
