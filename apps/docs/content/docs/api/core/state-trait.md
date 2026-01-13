---
title: StateTrait
description: Field-level capability rules (computed/link/source/externalStore/check) that the Runtime can converge and explain.
---

StateTrait is Logix’s **capability rules** layer. It lets you attach derivation, linkage, validation, and external writeback rules to a Module as a diffable declaration, so the Runtime can:

- build an explicit dependency graph (for incremental recomputation),
- converge rules consistently inside transaction windows,
- emit diagnostics that explain “which rule touched which field, and why”.

## Where traits live

You can attach traits in two common places:

1. **Module-level `traits`** on `Logix.Module.make(...)` (common for domain packages like Form/Query).
2. **Logic setup** via `$.traits.declare(...)` when a reusable Logic bundle needs to “carry rules along”.

General rule: treat trait specs as **pure data** — deterministic, no randomness, no time dependency, no IO.

## Minimal example (computed)

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const State = Schema.Struct({
  keyword: Schema.String,
  normalized: Schema.String,
})

export const SearchDef = Logix.Module.make('Search', {
  state: State,
  actions: {},
  traits: Logix.StateTrait.from(State)({
    normalized: Logix.StateTrait.computed({
      deps: ['keyword'],
      get: (keyword) => keyword.trim().toLowerCase(),
    }),
  }),
})
```

## When to use StateTrait directly

Most app code should use higher-level packages (e.g. Form) instead of writing traits by hand. Reach for StateTrait when:

- you’re building a reusable capability layer that should travel with Logic,
- you need explainable, incremental derivation/validation at scale,
- you need to wire an external push source via `StateTrait.externalStore`.

## See also

- [Guide: Traits](../../guide/essentials/traits)
- [Recipe: ExternalStore](../../guide/recipes/external-store)
- [API: ExternalStore](./external-store)
- [/api-reference](/api-reference) (full signatures and exports)
