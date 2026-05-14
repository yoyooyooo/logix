---
title: Introduction
description: What Logix is and where it fits.
---

Logix is a runtime for application logic. It gives you a small object model for state, effects, services, React projection, and evidence.

```text
React handles UI / host / render.
Logix handles declaration / composition / execution / evidence.
```

The default route is:

1. Define a `Module`.
2. Add behavior with `Module.logic(id, ...)`.
3. Assemble a `Program`.
4. Create a `Runtime`.
5. Project it into React with `RuntimeProvider`.
6. Read with `useSelector(...)` and write with dispatch or domain handles.

## Why use it

Use Logix when a feature has business state and effects that need stable execution, testability, and diagnostics. Use React state directly for short-lived view-only UI state.

## First concepts

| Concept | Meaning |
| --- | --- |
| Module | Definition object: state schema, action map, reducers, logic builder. |
| Logic | Effect-based behavior attached to a Module. |
| Program | Assembled business unit with initial state, logics, services, and imports. |
| Runtime | Execution container. |
| React host | Provider + hooks that expose runtime instances to components. |
| Evidence | Structured reports from check/trial/compare. |

## Next

- [Quick Start](./quick-start)
- [Canonical spine](/docs/guide/essentials/canonical-spine)
