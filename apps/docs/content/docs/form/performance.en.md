---
title: Performance and optimization
description: Key practices to keep large forms/lists responsive.
---

## 1) UI subscriptions: prefer `useFormState(form, selector)`

Avoid subscribing to the whole values/errors tree in React: small changes can amplify into wide re-renders.

Prefer subscribing only to the “view-state slice” you actually need:

```ts
const canSubmit = useFormState(form, (v) => v.canSubmit)
const submitCount = useFormState(form, (v) => v.submitCount)
```

## 2) Validation triggers: keep “every keystroke” incremental

A common strategy for complex forms:

- Before first submit: `validateOn=["onSubmit"]` (cheaper)
- After first submit: `reValidateOn=["onChange"]` (more immediate)

When you only want to validate a small path, prefer `controller.validatePaths(...)` for precise triggering.

> Tip: express “cross-field linkage triggers” via explicit `deps`, and express “when to auto-validate” via `validateOn/reValidateOn` (form-level) or per-rule `validateOn` (rule-level; only `onChange/onBlur`).

## 3) Field arrays: provide stable identity (trackBy)

For long lists, explicitly declaring list identity (prefer `trackBy`) usually pays off by:

- Stable React `key`, fewer re-renders on reorder/insert
- More stable row errors and UI state, less drift

## 4) Move heavy logic out of sync validation

Sync validation and sync derivation are best for lightweight work (pure, fast, predictable). When you need IO or heavy computation, prefer `source` or move heavy work into service calls so you don’t stretch the transaction window for every input.

> Practice: for cross-row rules, prefer list scope (one scan + write back `errors.<list>.$list/rows[]`) instead of repeating O(n) scans in item scope.

## 5) Write-back style: prefer field-level writes (`mutate`/controller) over full replacement

`useFormState(form, selector)` reduces React re-renders, but it can’t offset the cost of “full writes” that force broad derivation/validation.

In Logix, “full replacement” styles like `update/setState` often don’t provide precise change-path evidence, so runtime tends to degrade derivation/validation into full processing. The larger the form and the higher the input frequency, the more visible the difference becomes.

For high-frequency input and linkage, prefer:

- `field.onChange/onBlur`, `controller.setValue/setError/clearErrors/...` (keep field-level impact boundaries inside the form)
- `$.state.mutate(...)` in custom Logic (runtime can automatically collect change paths)
- `Logix.Module.Reducer.mutate(...)` / `Logix.Module.Reducer.mutateMap({...})` in `Module.make({ reducers })` (batch define draft-style reducers)

For small forms with low update frequency, `update` + selector often works fine. But when you care about performance ceilings, move high-frequency writes to `mutate`/controller first.
