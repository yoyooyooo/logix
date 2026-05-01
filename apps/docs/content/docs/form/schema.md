---
title: Schema
description: Form uses schema for editable values and submit decode, then maps decode issues back into the same error model.
---

Form uses schema in two places:

- `values`, for the editable state shape
- `submit.decode`, for the payload that may leave the form boundary

## Values schema

```ts
Form.make(
  "InvoiceForm",
  {
    values: InvoiceDraft,
    initialValues,
  },
  (form) => {
    // ...
  },
)
```

`values` should match the shape the UI edits.

## Submit decode

```ts
Form.make(
  "InvoiceForm",
  {
    values: InvoiceDraft,
    initialValues,
  },
  (form) => {
    form.submit({
      decode: InvoicePayload,
    })
  },
)
```

`submit.decode` should match the payload shape accepted outside the form boundary.

## Mapping decode issues

Use lower-level schema bridge helpers in repo-local glue when decode issues need stable placement.

These helpers determine:

- which value path receives a decode issue
- which canonical error leaf should be written

If a decode issue cannot be mapped to a field path, it falls back to the submit slot instead of being left in an unmapped schema payload.

## See also

- [Quick start](/docs/form/quick-start)
- [Validation](/docs/form/validation)
- [Rules](/docs/form/rules)
