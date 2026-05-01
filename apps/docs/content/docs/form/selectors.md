---
title: Selectors and support facts
description: Read Form state, companion bundles, and field explanations without adding a second read route.
---

Form reads stay on the core React host route.

Use `useSelector(handle, selector)` for values, helper descriptors, field explanations, and companion bundles. Form does not add `useForm*`, `useFieldValue`, or `useCompanion` as a canonical route.

## Default route

```tsx
const form = useModule(InventoryForm)

const warehouseId = useSelector(form, fieldValue("items.0.warehouseId"))
const warehouseSupport = useSelector(
  form,
  Form.Companion.field("items.warehouseId"),
)
const rowWarehouseSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
const warehouseExplain = useSelector(
  form,
  Form.Error.field("items.0.warehouseId"),
)
```

This keeps one read law:

| read target | selector |
| --- | --- |
| field value | `fieldValue(path)` |
| raw form metadata | `rawFormMeta()` |
| field explanation | `Form.Error.field(path)` |
| field companion bundle | `Form.Companion.field(path)` |
| row companion bundle | `Form.Companion.byRowId(listPath, rowId, fieldPath)` |

## Companion is a soft fact

`field(path).companion({ deps, lower })` derives local support facts for the same field lane.

```ts
const warehouseCarrier = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: "interactive" as const },
      candidates: { items: [{ id: "w1", label: "Warehouse A" }] },
    }
  },
})
```

Companion can shape availability and candidates.
It does not own final validity, submit blocking, remote IO, row identity, or report truth.
See [Companion](/docs/form/companion) for the full authoring route.

Use field, list, root, or submit rules for final truth:

```ts
$.field("items.warehouseId").rule(/* final field truth */)
$.list("items", /* final cross-row truth */)
$.submit()
```

## Returned carriers and exact typing

Returned carriers are a type-only metadata route.
They let `Form.Companion.field(...)` and `Form.Companion.byRowId(...)` infer the exact `lower` result without adding a runtime public metadata object.

```ts
export const InventoryForm = Form.make("InventoryForm", config, ($) => {
  const warehouseCarrier = $.field("items.warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [{ id: "w1", label: "Warehouse A" }] },
      }
    },
  })

  return [warehouseCarrier] as const
})
```

Imperative `void` callback authoring remains valid for runtime behavior:

```ts
Form.make("InventoryForm", config, ($) => {
  $.field("items.warehouseId").companion({
    deps: ["countryId"],
    lower(ctx) {
      return { availability: { kind: "interactive" as const } }
    },
  })
})
```

That route does not currently promise exact companion selector result typing.
Selectors should honestly degrade to `unknown` when the metadata chain is unavailable.

## Row reads and writes

Write row-owned values through the form handle:

```ts
yield* form.fieldArray("items").byRowId(rowId).update(nextRow)
```

Read row-owned companion bundles through the same host selector gate:

```tsx
const rowWarehouseSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Both routes use the same row owner law.
The write side stays on the form handle, and the read side stays on `useSelector`.
Form does not expose a public row owner token.

If a nested owner match is ambiguous, the selector should miss instead of choosing an arbitrary parent row.

## Field explanations

`Form.Error.field(path)` is a field explanation selector.
It can explain more than a canonical `FormErrorLeaf`.

The result may represent:

- current error
- pending work
- stale work
- cleanup / active-exit state
- no current explanation

Do not use this selector as a second validation truth.
Final validity still belongs to the rule / submit lane.

## Verification boundary

`runtime.trial(...)` and `runtime.compare` are runtime control-plane routes.
They can read the same evidence boundary, but they do not enter Form authoring and do not add a second report object or scenario authoring surface.

Use them to verify and compare behavior after the Form program is declared.
Performance comparison belongs to the runtime control plane, not the Form user authoring surface.

## What stays outside the canonical route

These shapes are not part of the current Form surface:

- public `Form.Path`
- schema path builders
- Form-owned React hook families
- `useCompanion` / `useFieldValue` wrappers
- public row owner tokens
- `Fact` / `SoftFact` namespaces
- public `FormProgram.metadata`
- using a returned carrier directly as a selector

## See also

- [Quick start](/docs/form/quick-start)
- [Sources](/docs/form/sources)
- [Companion](/docs/form/companion)
- [Derived](/docs/form/derived)
- [Field arrays](/docs/form/field-arrays)
- [Validation](/docs/form/validation)
