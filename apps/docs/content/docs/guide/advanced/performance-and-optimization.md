---
title: Performance and optimization
description: Selector precision, transaction cost, diagnostics level, and evidence discipline.
---

Performance work starts with ownership and measurement. The runtime can optimize precise reads and sparse writes better than broad snapshots and ad-hoc effects.

## Read narrowly

```tsx
const name = useSelector(form, fieldValue("name"))
const [name, email] = useSelector(form, fieldValues(["name", "email"]))
```

Avoid deriving large objects in selectors unless an equality function makes the result stable.

## Write intentionally

Reducers and logic writes enter a transaction. Prefer a small number of clear actions over many incidental component-level writes.

## Diagnostics level

Runtime diagnostics are valuable, but heavy evidence should stay out of hot paths unless the environment needs it. Use diagnostics levels and perf evidence rather than assuming a change is faster.

## Evidence

A performance claim needs before/after data under the same profile, matrix, environment, and sampling policy. Quick runs are good for diagnosis; release claims need the stronger profile used by the project.
