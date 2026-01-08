---
title: Derivations and linkage (derived / Trait)
description: Declare computed/link/source via Form.computed/link/source, with deps-as-args as a dependency contract.
---

## 1) Why `derived`

`derived` declares “extra fields / view state derived from values”, for example:

- Aggregations (totals, counts, helper flags like can-submit)
- Linked fields (one field change updates another field)
- Async resources (fetch options based on value deps and write a snapshot back into values)

`@logix/form` puts boundaries around derived: by default it only allows writing back to `values` / `ui`, so you don’t accidentally turn validation/errors into a “second source of truth”.

> [!TIP]
> If you want to understand how traits converge inside a transaction window and guarantee “at most one commit per window”, start here:
> - [Traits (capability rules and convergence)](../guide/essentials/traits)

## 2) `Form.computed`: deps-as-args

```ts
const $ = Form.from(Values)
const d = $.derived

const FormWithSummary = Form.make("FormWithSummary", {
  values: Values,
  initialValues: { items: [] } as any,
  derived: d({
    "ui.total": Form.computed({
      deps: ["items"],
      get: (items) => (Array.isArray(items) ? items.length : 0),
    }),
  }),
})
```

`get` receives only arguments from `deps` (no implicit state reads), which helps type inference and performance optimization.

## 3) `Form.link`: map one value to another value

Assume you have `const d = $.derived`:

```ts
derived: d({
  "shipping.contactEmail": Form.link({ from: "profile.email" }),
})
```

## 4) `Form.source`: write async resource snapshots into values

When you want “automatically fetch data based on some value fields, and write a snapshot back into values”, use `source`.

Assume you have `const d = $.derived`:

```ts
derived: d({
  "cityOptions": Form.source({
    resource: "demo/region/cities",
    deps: ["country", "province"],
    triggers: ["onValueChange"],
    concurrency: "switch",
    key: (state) => ({ country: state.country, province: state.province }),
  }),
})
```

> Tip: model source write-backs as a `ResourceSnapshot` (idle/loading/success/error) for clearer UI and debugging.

## 5) Arrays and “row-level” needs: which approach should you pick?

`deps` expresses a “structural trigger contract”. Don’t use numeric-index paths like `items.0.name` / `a.2.b`: insert/remove/reorder causes index drift and makes behavior hard to explain and reproduce.

When you “care about one row”, organize code around list identity (`trackBy`) first:

- **Render-only / linkage only**: in a row component, subscribe with ``useField(form, `items.${index}.name`)`` and compute instantly (no write-back to values/ui).
- **Reusable across components but not part of submit**: write derived results into `ui`, preferably as a dictionary `{ [id]: ... }` keyed by `trackBy`.
- **Needed only at submit**: compute once inside `controller.handleSubmit({ onValid })` to produce a submit payload from values.
- **Row-level async dependencies**: use `Form.traits(...)({ items: Form.list({ identityHint: { trackBy }, item: Form.node({ source: { ... } }) }) })`.
- **Row-level / cross-row validation**: use `rules: z.list("items", { identity, item, list })` (see “Field arrays”).
