---
title: Debug
description: Structured debug events, sinks, and DevTools snapshot export.
---

Logix Debug is a structured event pipeline for observing runtime behavior:

- module lifecycle (`module:init` / `module:destroy`)
- Action dispatch (`action:dispatch`)
- state updates (`state:update`)
- runtime errors (`lifecycle:error`)
- diagnostics hints (`diagnostic`)

In typical frontend development, you’ll mostly inspect these events via DevTools. In non-UI environments (Node scripts, tests, services), you can route events into your logger/monitoring system via Debug layers.

## Common entry points

- `Debug.layer(...)`: enable a built-in sink preset (dev/prod/off).
- `Debug.replace(...)` / `Debug.appendSinks(...)`: provide custom sinks.
- `Debug.record(event)`: emit an event to the current fiber’s sinks.
- DevTools snapshots:
  - `Debug.getDevtoolsSnapshot()` / `Debug.subscribeDevtoolsSnapshot(...)`
  - `Debug.exportEvidencePackage(...)` (export a serializable evidence package for sharing/replay tooling)

## See also

- [Guide: Debugging and DevTools](../../guide/advanced/debugging-and-devtools)
- [API: Observability](./observability)
- [/api-reference](/api-reference)
