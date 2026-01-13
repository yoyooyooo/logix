---
title: When should you use @logixjs/form?
description: Decide whether you need @logixjs/form or a plain Module.
---

`@logixjs/form` is a domain package designed specifically for forms. But not every “input” scenario needs it.

## A plain Module is enough

For these cases, managing state with `Logix.Module` is sufficient:

- **Single-field input**: search box, toggle, simple filters
- **No validation needs**: no field-level error messages
- **Simple state**: a few independent values without complex linkage

```ts
// A simple search box can be a plain Module
const SearchModule = Logix.Module.make('Search', {
  state: Schema.Struct({ keyword: Schema.String }),
  actions: { setKeyword: Schema.String },
})
```

## Prefer @logixjs/form

When your form has these characteristics, `@logixjs/form` tends to make life easier:

| Characteristic                       | Plain Module              | @logixjs/form                         |
| ----------------------------------- | ------------------------- | ----------------------------------- |
| **Multiple fields** (3+ fields)     | manual state merging      | built-in management                 |
| **Field-level validation**          | hand-written validation   | Rules DSL + built-in error tree     |
| **Dynamic arrays** (insert/delete/reorder) | manual key/index handling | stable identity + optimized rendering |
| **Cross-field linkage/derivations** | hand-written watchers     | declarative trait rules             |
| **Submit state**                    | manual loading/disabled   | built-in meta                       |

## Typical scenarios

### ✅ Use @logixjs/form

- Registration form (name/email/password + validation)
- Product edit form (many fields + image list)
- Dynamic questionnaire (add/remove question list)
- Approval-flow configuration (multi-step + field linkage)

### ⚠️ Maybe not needed

- Search box + simple filters (use a plain Module)
- Toggle/Tab switching (use plain state)
- Read-only data display (not a form)

## Mixed usage

You can mix both in one app:

- **Plain Modules**: page/route/global state
- **@logixjs/form**: form areas

```ts
// PageModule manages page state
const PageModule = Logix.Module.make('OrderPage', {
  state: Schema.Struct({ activeTab: Schema.String }),
  // ...
})

// Form.make manages the form
const OrderForm = Form.make({
  /* ... */
})
```

Both run in the same Runtime and share debugging, transaction semantics, and DevTools capabilities.

## Next

- [Form quick start](./quick-start)
- [Rules DSL](./rules)
- [Field arrays](./field-arrays)
