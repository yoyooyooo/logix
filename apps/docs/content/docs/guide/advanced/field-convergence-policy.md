---
title: Field convergence policy
description: How derived fields and source fields converge after runtime writes.
---

Field convergence is the runtime work that brings derived/source-backed fields back into a consistent state after a write.

## Public control

Most users do not tune convergence directly. Use the domain DSL or `$.fields` declarations and let `Program.make` compile them.

## Runtime knobs

Runtime and program options can tune convergence mode, budgets, diagnostics, and time slicing. These knobs are performance controls, not authoring alternatives.

```ts
const runtime = Logix.Runtime.make(Program, {
  stateTransaction: {
    fieldConvergeMode: "auto",
    fieldConvergeBudgetMs: 8,
  },
})
```

## Boundary

If a field is business truth, model it as state or Form final truth. If it is a deterministic projection, model it as a field declaration. If it is IO, use source/service routes.
