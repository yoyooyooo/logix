---
title: Overview - the Form model
description: Build a clear mental model first, then start writing demos.
---

## 1) What is a Form?

`@logixjs/form` provides `Form.make(id, config)`, which returns a **Form Module** (a module definition object) that can be consumed directly by Runtime / React.

- **Runtime**: you can start it with `Logix.Runtime.make(FormModule, ...)` directly (no need to manually extract `FormModule.impl`).
- **React**: you can call `useForm(FormModule)` to get a form view and the default `controller` (e.g. `handleSubmit/validate/reset/...`).
- **Composition**: only when you need to mount the form as a child module inside a bigger Runtime do you use `imports: [FormModule.impl]`.

In other words: Form is not “local state attached to a React component”. It’s a module managed, composed, and debugged by the Runtime.

> [!TIP]
> Form’s derivation/linkage/validation capabilities are powered by traits (capability rules and convergence).
> If you want a more systematic mental model:
> - [Traits (capability rules and convergence)](../guide/essentials/traits)

## 2) What does Form state look like?

A Form state has four parts:

- **values**: business form values you care about (determined by the Schema in `config.values`)
- **errors**: an error tree (rule errors, manual errors, and Schema errors all go here)
- **ui**: interaction state (e.g. touched/dirty)
- **$form**: form meta (submitCount/isSubmitting/isDirty/errorCount, etc.)

`errorCount` enables O(1) `isValid/canSubmit` checks in UI, avoiding scanning the whole error tree.

## 3) Unified convention for array errors: `$list/rows[]`

Array field errors are written using a unified `rows` mapping:

- valuePath: `items.0.name`
- errorsPath: `errors.items.rows.0.name`

List-level and row-level errors also have stable locations:

- list-level: `errors.items.$list`
- row-level: `errors.items.rows.0.$item`

The goal: when you **insert/remove/reorder** array items, the error tree and UI tree can “move with rows” stably instead of drifting due to index changes.

## 4) Transaction semantics: at most one observable commit per interaction

In React you typically call:

- `useField(form, path).onChange(...)` (dispatches `setValue` internally)
- `useField(form, path).onBlur()` (dispatches `blur` internally)
- `useFieldArray(form, listPath).append/remove/swap/move(...)`

All of these go into the same Runtime transaction window. The runtime runs derivations/validation writes back and notifies subscribers with “at most one commit”.

## 5) Recommended entry points: `derived + rules`

For everyday product forms, a good default is to build your form with only two top-level concepts:

- `derived`: derivations/linkage (`computed/link/source`), writing only values/ui
- `rules`: validation (`field/list/root`), writing only errors

`traits` still exists, but is better suited for advanced capabilities or performance/diagnostic comparisons; it’s not recommended as the default entry.
