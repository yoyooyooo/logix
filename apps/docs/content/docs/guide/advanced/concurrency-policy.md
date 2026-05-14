---
title: Concurrency policy
description: Choose run, latest, exhaust, parallel, and task lanes deliberately.
---

Concurrency is part of logic semantics. Pick the smallest policy that matches the user intent.

| Policy | Use for |
| --- | --- |
| `run` | every event must be handled in order |
| `runLatest` | typeahead, refresh, replaceable async work |
| `runExhaust` | submit buttons, non-reentrant actions |
| `runParallel` | independent fan-out work |
| `runTask` variants | long operations with pending/error/writeback evidence |

## Latest search

```ts
yield* $.onAction("queryChanged").debounce(200).runLatest(fetchAndWrite)
```

## Exhaust submit

```ts
yield* $.onAction("submitted").runExhaust(submitOnce)
```

## Boundary

Concurrency policy belongs in logic, close to the trigger. Do not encode it in React button state unless the button state is purely visual.
