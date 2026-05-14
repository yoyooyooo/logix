---
title: Schema
description: Values schema, submit decode schema, and form state shape.
---

Form uses Effect Schema in two places: editable values and submit decode.

## Values schema

```ts
const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})
```

`values` defines editable fields and their type-level paths.

## Submit decode

```ts
const Submit = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

$.submit({ decode: Submit })
```

Submit decode is final boundary validation. Field rules can guide interaction; decode decides what may leave the form.

## State shape

Form state contains values plus domain-owned support state: `errors`, `ui`, and `$form`. Read those through Form/core selectors instead of assuming a raw object contract.
