---
title: When to use
description: Choose Form when you need structured input state plus a submit gate.
---

Use Form when all of these matter:

- user-editable input state
- path-addressable mutations
- validation that must explain itself
- a blocking submit gate
- array locality and cleanup semantics

Reach for simpler core modules when you only need:

- local UI state without submit semantics
- read-only projections
- background state that has no form boundary

Form is strongest when the problem is an input domain, not a generic state container.

## See also

- [Introduction](/docs/form/introduction)
- [Quick start](/docs/form/quick-start)
- [Instances](/docs/form/instances)
