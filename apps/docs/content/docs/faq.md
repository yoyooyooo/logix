---
title: FAQ
description: Common questions about choosing, using, and operating Logix.
---

## Choosing Logix

### How is Logix different from Redux or Zustand?

| Dimension | Redux / Zustand | Logix |
| --- | --- | --- |
| async | external middleware or conventions | built into Logic and Effect |
| concurrency | managed manually | explicit run policies such as `runLatest` and `runExhaust` |
| type safety | maintained by hand | derived from schema |
| observability | external tooling | built-in event pipeline |

### How is Logix different from XState?

XState is strongest when the problem is a strict state machine.
Logix is strongest when the problem is data-driven state plus explicit reactions.

### When should Form be used instead of a plain Module?

Use a plain module when:

- one or two inputs are enough
- submit semantics are not needed
- validation is simple

Use `@logixjs/form` when:

- multiple fields are involved
- validation and error placement matter
- dynamic arrays are involved
- submit gating matters

## Using Logix

### Why did a watcher not trigger?

Common causes:

1. the selected value did not change
2. the watcher was placed in the wrong phase
3. the logic was not assembled into the program

### How should an in-flight request be cancelled?

Use `runLatest` when only the newest request should survive.

### How can Action history be inspected?

Enable DevTools on the runtime and mount the DevTools component in the React app.

## Production and hosting

### What is the runtime overhead?

In most application scenarios the overhead is negligible.
For performance-sensitive paths, use the advanced performance and diagnostics guides.

### How is debug output reduced in production?

Use production-oriented runtime debug settings and disable DevTools in production builds.

### What about SSR or RSC?

- SSR can run through Runtime execution on the server
- RSC is not currently the primary execution route for modules; prefer client boundaries

## Further reading

- [Guide Overview](/docs/guide)
- [API Reference](/docs/api)
- [Form](/docs/form)
