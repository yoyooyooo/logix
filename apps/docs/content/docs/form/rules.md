---
title: Rules DSL (z)
description: Two styles of $.rules - Decl DSL (field/list/root) and Node DSL (schema + object/array).
---

`rules` is the recommended entry for form validation. Start by deriving `z` from the values Schema:

```ts
const $ = Form.from(ValuesSchema)
const z = $.rules
```

Remember one thing: the `rules` you pass to `Form.make({ rules })` must be a **RulesSpec** (i.e. the return value of `z(...)` or `z.schema(...)`). `z.field/z.list/z.root` produces “decls” (declarations) and cannot be passed to `Form.make` directly.

## 1) Decl DSL: `rules: z(z.field / z.list / z.root)`

Decl DSL is great when you “attach rules to a few explicit paths”. Types narrow with the values Schema (paths, deps, validate arguments are type-assisted).

### 1.1 Field: `z.field(valuePath, rule)`

```ts
rules: z(
  z.field("contact.email", { required: "Email is required" }),
  z.field("contact.phone", {
    deps: ["preferredChannel"],
    validate: (phone, ctx) => {
      const state = (ctx as any).state as any
      if (state.contact?.preferredChannel !== "phone") return undefined
      return String(phone ?? "").trim() ? undefined : "Phone is required when preferred channel is phone"
    },
  }),
)
```

For object-level cross-field validation, if you want errors to be written to `errors.<path>.$self`, use `errorTarget: "$self"`:

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

### 1.2 Field arrays: `z.list(listPath, { identity, item, list })`

```ts
rules: z(
  z.list("items", {
    identity: { mode: "trackBy", trackBy: "id" },
    item: {
      deps: ["name", "quantity", "price"],
      validate: (row) => {
        const errors: Record<string, unknown> = {}
        if (!String((row as any)?.name ?? "").trim()) errors.name = "Name is required"
        if (!((row as any)?.quantity > 0)) errors.quantity = "Quantity must be > 0"
        if (!((row as any)?.price >= 0)) errors.price = "Price must be ≥ 0"
        return Object.keys(errors).length ? errors : undefined
      },
    },
    list: {
      validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: "At least one row" }),
    },
  }),
)
```

- `item`: item-level validation (current row only) → written to `errors.<list>.rows[i].* / .$item`
- `list`: list-level / cross-row validation (scan rows once) → written to `errors.<list>.$list / .rows[i]`

### 1.3 Root rule: `z.root(rule)`

When you need to validate “the whole values tree”, use `z.root(...)`:

```ts
rules: z(
  z.root({
    validate: (values) => (values ? undefined : "Form is invalid"),
  }),
)
```

> Tip: root rules are usually for “global consistency constraints / pre-submit safety nets”. For fine-grained triggers, prefer field/list rules with explicit `deps`.

### 1.4 Composing rules (recommended convention)

`z(...)` accepts both a single decl and arrays of decls (one-level flatten). To avoid “too much freedom leading to inconsistency”, a good team convention is:

- In product code, stick to one form: `rules: z(...)` (Decl DSL). Avoid mixing `z(...)` and `z.schema(...)` in the same form.
- For reuse, make “rule fragment functions” return **arrays of decls**, then merge once with `z(partA, partB, ...)`.
- Don’t declare the same path twice (it fails deterministically). If you need “stacked validation”, merge multiple checks inside one `validate`.

## 2) Node DSL: `z.object / z.array / z.field(...)` + `z.schema(node)`

Node DSL is closer to zod: describe a nested structure with `z.object/z.array`, then compile the whole thing into rules via `z.schema(...)`.

### 2.1 `z.at(prefix)`: write Node DSL under a prefix

There isn’t a `z.at(...)` example in `examples/` yet, but it’s handy in Node DSL to avoid repeating long prefixes:

```ts
const zc = z.at("contact")

const rules = zc.schema(
  zc.object({
    email: zc.field({ required: "Email is required" }),
    phone: zc.field({}),
  }),
)
```

> For Decl DSL, `z.at(...)` expects “relative paths” (like `"email"`), but TS types currently don’t constrain `"email"` to the set of relative paths. If you want strong type-assisted paths, prefer full paths like `z.field("contact.email", ...)`.

```ts
const rules = z.schema(
  z.object({
    contact: z.object({
      email: z.field({ required: "Email is required" }),
      preferredChannel: z.field({}),
      phone: z.field({
        deps: ["preferredChannel"],
        validate: (phone, ctx) => {
          const state = (ctx as any).state as any
          if (state.contact?.preferredChannel !== "phone") return undefined
          return String(phone ?? "").trim() ? undefined : "Phone is required when preferred channel is phone"
        },
      }),
    }),
    items: z
      .array(
        z.object({
          id: z.field({}),
          name: z.field({ required: "Required" }),
          quantity: z.field({ min: { min: 1, message: "Quantity must be > 0" } }),
        }),
        { identity: { mode: "trackBy", trackBy: "id" } },
      )
      .refine({
        validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: "At least one row" }),
      }),
  }),
)

Form.make("MyForm", { values: ValuesSchema, initialValues, rules })
```

## 3) Consistency recommendation: pick one DSL per form

- **Decl DSL**: great for “attach rules at path points”, with direct type hints.
- **Node DSL**: great for “describe the whole structure” and compile via `z.schema`.
- `Form.Rule.make/merge` are lower-level organization/reuse tools; introduce them only when you truly need composition, to avoid mixing too many concepts with `z.*`.

## 4) CanonicalPath vs ValuePath: why numeric segments are disallowed in rules

- **UI / reading/writing a concrete row**: uses valuePath (runtime strings), allows `items.0.name` (e.g. `useField(form, "items.0.name")` / `setValue({ path: "items.0.name" })`).
- **rules / dependency graph (deps)**: uses canonical paths (type-restricted), disallows numeric segments. Arrays “pierce through items”, for example:
  - `items.name` means “name of any row” (equivalent semantics: `items.${number}.name`)
  - `items.allocations.amount` means “amount of allocations items for any row”
- **Row-level / cross-row validation**: do not write `z.field("items.name", ...)`. Use `z.list("items", { item/list })` to express array semantics; `item.deps` uses relative fields like `"name"`, and `list.validate(rows)` gets the full rows slice for one-pass scanning.
- **Why this design**:
  - array indices drift under insert/remove/reorder; `deps: ["items.0.name"]` is not stable (easy to “depend on the wrong row”).
  - deps expresses a structural trigger contract; “which row is which” is runtime identity (`trackBy/rowId`) — the two must be layered for replay/explainability.
  - the dependency graph grows with schema shape, not with row counts, protecting incremental-validation performance boundaries.
