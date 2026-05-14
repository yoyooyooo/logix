---
title: Transaction lanes
description: Urgent and non-urgent runtime work without changing public authoring.
---

Transaction lanes are runtime scheduling controls for state work. They do not add a second state model.

## Default route

Most application code uses normal dispatch and logic writes. The runtime decides how to batch, commit, and notify.

## Low-priority work

Use low-priority dispatch or runtime policy when work should not block urgent interaction.

```ts
yield* runtime.dispatchLowPriority({ _tag: "refresh", payload: undefined })
```

## Policy boundary

Lane policy belongs to runtime/program configuration and advanced dispatch paths. It should not leak into reducers as conditional scheduling logic.
