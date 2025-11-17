---
title: Migration guide (traits -> rules)
description: Move regular validation from traits.check to rules, and keep traits as an advanced entry.
---

## 1) Goal

Recommended: converge form validation into `rules`:

- Product code defaults to `derived + rules`
- Keep `traits` for more advanced capabilities (computed/source/link or low-level comparisons)

## 2) Field validation: `traits.<path>.check` -> `rules: z(z.field(...))`

Before (traits):

```ts
traits: Form.traits(Values)({
  name: {
    check: Form.Rule.make({ required: "Required" }),
  },
})
```

After (rules):

```ts
const $ = Form.from(Values)
const z = $.rules

rules: z(
  z.field("name", { required: "Required" }),
)
```

## 3) Object-level refine: write to `$self` to avoid overwriting child errors

When a rule validates an object across fields, prefer writing to `errors.<path>.$self`:

```ts
rules: z(
  z.field(
    "profile.security",
    {
      deps: ["password", "confirmPassword"],
      validate: (security: any) =>
        security?.password === security?.confirmPassword ? undefined : "Passwords do not match",
    },
    { errorTarget: "$self" },
  ),
)
```

## 4) List validation: declare identity + item/list scopes explicitly

```ts
rules: z(
  z.list("items", {
    identity: { mode: "trackBy", trackBy: "id" },
    item: {
      deps: ["name", "quantity"],
      validate: (row: any) => (String(row?.name ?? "").trim() ? undefined : { name: "Required" }),
    },
    list: {
      validate: (rows) => ({ $list: Array.isArray(rows) && rows.length > 0 ? undefined : "At least one row" }),
    },
  }),
)
```

## 5) Common pitfalls

- Forgot `deps`: cross-field / cross-row dependencies won’t trigger incremental validation (looks like “the rule doesn’t work”).
- Forgot list identity: dynamic arrays degrade to unstable identity (more drift under reorder).
- Still writing lots of `check` in `traits`: migrate to `rules` and reserve `traits` for derivations/resources or necessary advanced declarations.
