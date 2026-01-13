---
title: Observability
description: Evidence package protocol helpers for exporting, importing, and trial-run artifacts.
---

Observability provides helpers and protocol types for **evidence packages** — serializable bundles that can carry traces and artifacts across environments.

Typical uses include:

- exporting debug/evidence data from a running app,
- importing the package elsewhere for analysis,
- attaching artifacts produced by trial runs.

## Common entry points

- `Observability.protocolVersion`: protocol version string.
- `Observability.exportEvidencePackage(...)` / `Observability.importEvidencePackage(...)`
- Trial-run artifacts:
  - `registerTrialRunArtifactExporter(...)`

## See also

- [Guide: Debugging and DevTools](../../guide/advanced/debugging-and-devtools)
- [/api-reference](/api-reference)
