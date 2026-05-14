---
title: FAQ
description: Answers for the current Module → Program → Runtime model.
---

## How is Logix different from Redux or Zustand?

Redux and Zustand are mainly state containers. You can build async work, dependency wiring, and diagnostics around them, but those pieces are usually project conventions.

Logix treats a module as an executable unit: state, logic, services, readiness, diagnostics, and verification all run through the same Program and Runtime boundary.

```text
Module.logic(...)  declares what can run
Program.make(...)  assembles a business unit
Runtime.make(...)  owns execution, services, lifecycle, and evidence
```

React still renders UI. Logix owns the logic side.

## How is Logix different from XState?

XState is the right shape when the main problem is a finite state machine.

Logix is a better fit when the main problem is application logic: data state, async work, service dependencies, runtime lifecycle, and precise React reads. You can still encode state-machine-like decisions inside logic, but the public model is not built around a machine chart.

## How is Logix different from TanStack Query?

TanStack Query owns server-state caching and request coordination.

Logix owns executable application logic. Query-style resources can participate through source/resource boundaries, but Logix is not a query cache. A typical app can use both: Query for remote data behavior, Logix for module execution and cross-feature logic.

## What should I remember first?

Keep this spine stable:

```text
Module.logic -> Program.make -> Runtime.make -> RuntimeProvider -> useModule -> useSelector
```

Most pages in this site expand one part of that chain. If a helper cannot be reduced back to the chain, treat it as local application code or toolkit sugar, not as a second model.

## Why are old field internals absent from user docs?

Old field internals are not user-facing concepts in the current docs.

Field declarations may still exist inside `Module.logic(($) => { ... })` or a domain DSL such as Form, but compiler and runtime machinery sit behind `Program.make(...)` and `Runtime.make(...)`. User docs explain behavior and owner boundaries instead of internal implementation families.

## Why does `Program.make(...)` exist?

A module definition is reusable. A program is an assembled business unit.

`Program.make(...)` chooses initial state, imports child programs, installs logic declarations, and produces the unit a runtime can execute. Keeping assembly there prevents React, Form, Query, and verification docs from growing separate assembly rules.

## How do I read state in React?

Acquire the module instance, then select from it.

```tsx
const counter = useModule(CounterProgram)
const count = useSelector(counter, fieldValue("count"))
```

Use selectors for reads. Use the handle returned by `useModule(...)` for writes and commands.

## When should I use Form?

Use plain Logix when the page has ordinary module state and a small number of commands.

Use Form when the data is editable user input: field values, validation, errors, source-backed choices, companion facts, submit gating, or row identity. Form keeps those concerns in a domain DSL and still reads through the same React host route.

## How do I test a module?

For execution, use a runtime and run the effect you care about.

For diagnostics and dependency checks, use `Runtime.check(...)` or `Runtime.trial(...)`. Those APIs return structured reports and are better than inspecting incidental console output.

## How should production diagnostics be configured?

Keep diagnostics explicit. Use `off` or `light` for hot paths, enable heavier evidence only when you are investigating a problem, and keep Devtools out of production UI unless the application deliberately exposes an operator surface.

## What about SSR and RSC?

Server execution is possible through Runtime APIs, but the primary documented React route is client-side host projection: `RuntimeProvider`, `useModule`, and `useSelector`.
