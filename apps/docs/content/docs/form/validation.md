---
title: Validation and errors
description: validateOn / reValidateOn, rules, default controller actions, and the error tree conventions.
---

## 1) Two-phase auto validation: `validateOn` / `reValidateOn`

Form splits auto validation into two phases by default:

- **Before first submit**: `validateOn` controls whether validation runs on `onChange/onBlur` (default: validate only on submit)
- **After first submit**: `reValidateOn` controls whether incremental validation runs on `onChange/onBlur` (default: `onChange`)

This avoids “heavy validation on every keystroke” for large forms/lists, while still giving immediate feedback after the user’s first submit attempt.

## 2) Rules: treat deps as a contract

Prefer writing validation in `rules` (field/list/root rules). `deps` is the contract for “linkage-triggered validation”: only when you explicitly declare dependencies will changes in related fields trigger this rule’s incremental validation.

> See [Rules DSL (z)](./rules) for the `rules` DSL (`const z = $.rules`).

```ts
const $ = Form.from(Values)
const z = $.rules

const ProfileForm = Form.make("ProfileForm", {
  values: Values,
  initialValues: { name: "" },
  rules: z(
    z.field("name", {
      // deps defaults to []: declare only when you need cross-field linkage triggers
      required: "Required",
      minLength: 2,
    }),
  ),
})
```

When a rule needs to read other fields inside the same object and you want “other field changes also trigger this field’s validation”, add deps (e.g. `deps: ["preferredChannel"]`).

### 2.1) `$self`: object-level refine (don’t overwrite subtree)

For object-level cross-field validation, prefer writing errors to `errors.<path>.$self` (instead of overwriting the whole `errors.<path>` subtree):

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

### 2.2) List validation: list/item scopes

- Item-level (item): return `{ field: error }` or `{ $item: error }`, written to `errors.<list>.rows[i].*`
- List-level (list): return `{ $list: error }` or `{ rows: [...] }`, written to `errors.<list>.$list` / `errors.<list>.rows[i]`

## 3) `Form.Rule.*`: organizing rules and reuse

- `z.field/z.list/z.root`: recommended declarative entry points (types narrow by values schema)
- `Form.Rule.make(...)`: low-level normalization utility (expand config into a rule set attachable to `check`)
- `Form.Rule.merge(...)`: low-level merge utility (duplicate ruleName fails deterministically)
- Built-in validators: `required/minLength/maxLength/min/max/pattern`

## 4) Default controller actions (triggerable outside components)

The controller returned by `useForm(formBlueprint)` is consistent across React and Logic. You can trigger form actions outside components:

- `controller.validate()`: root validate (includes Schema writes)
- `controller.validatePaths(paths)`: precise validation by valuePath (field or list)
- `controller.setError(path, error)` / `controller.clearErrors(paths?)`: write/clear manual errors
- `controller.reset(values?)`: reset values/errors/ui/$form
- `controller.handleSubmit({ onValid, onInvalid? })`: submit flow (increment submitCount, validate, branch by errorCount)

Also: if you dispatch the `submit` action directly (or call `form.submit()`), it only triggers Rules root validation. Schema validation only runs in `controller.validate()` / `controller.handleSubmit(...)`.

> Tip: if UI wants to validate only a small path (e.g. one row in a field array), prefer `validatePaths` to avoid pulling the whole form into one validation transaction.

## 5) traits: kept as an advanced entry

You can still use `traits` to express lower-level `StateTrait` structures, but it’s recommended to keep “regular validation” in `rules` and reserve `traits` for:

- computed / link / source (derivations, linkage, async resources)
- a small number of advanced cases that require direct node/list manipulation (paired with performance/diagnostic comparisons)

> [!TIP]
> For a broader mental model and the semantic boundaries around “transaction windows / convergence”:
> - [Traits (capability rules and convergence)](../guide/essentials/traits)
