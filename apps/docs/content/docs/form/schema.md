---
title: Schema validation and error mapping
description: Schema.decode on submit, writing into errors.$schema, and path mapping.
---

## 1) Where do Schema errors go?

Form writes “Schema decode/validation errors” into the `errors.$schema` branch, separating them from rule errors (`errors.*`) and manual errors (`errors.$manual.*`).

In UI, `useField` reads errors by priority:

1. `errors.$manual.<path>`
2. `errors.<path>` (rule errors)
3. `errors.$schema.<path>` (Schema errors)

## 2) Manually mapping Schema errors (optional)

If you need to “decode manually and write errors back” in some scenarios, use `Form.SchemaErrorMapping`:

```ts
const writes = Form.SchemaErrorMapping.toSchemaErrorWrites(schemaError, {
  // Optional: rename when schema field names differ from form field names
  rename: { amount: "amountText" },
  toLeaf: () => "Invalid field",
})

for (const w of writes) {
  dispatch({ _tag: "setValue", payload: { path: w.errorPath, value: w.error } })
}
```

This generates error paths aligned with the `$list/rows[]` convention (e.g. array indices are mapped into `rows`).
