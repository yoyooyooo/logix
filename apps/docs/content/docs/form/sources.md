---
title: Sources
description: Remote facts for form fields, with resource ownership outside Form.
---

A source connects a field to a remote fact. Form owns the field receipt and submit impact; the resource owner stays outside Form.

## Declaration

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
  triggers: ["onMount", "onKeyChange"],
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

## Inactive key

Returning `undefined` from `key` makes the source inactive. Use this for dependent fields.

## Submit impact

- `block`: pending/stale source work can block submit.
- `observe`: source state is visible but does not block submit by itself.

## Boundary

A source is not an options API. It does not own final errors, candidates, or UI availability. Use rules for errors and companion for local soft facts.
