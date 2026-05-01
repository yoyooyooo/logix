---
id: trace-heavy
title: Trace Heavy Evidence Drawer
spec: 166-playground-driver-scenario-surface
sourceImage: ../assets/playground-variants/03-trace-heavy.png
viewport:
  min: "1366x768"
  target: "1440x900"
activeInspectorTab: State
activeBottomTab: Trace
dataProfile:
  traceEvents: 1200
  traceColumns: 9
  actions: 16
  stateNodes: 60
scrollOwners:
  - BottomEvidenceDrawer.TraceTable
stickyRegions:
  - BottomEvidenceDrawer.TabStrip
  - TraceTable.Header
  - RuntimeInspector.StateSummary
requiredVisibleRegions:
  - TopCommandBar
  - FilesPanel
  - SourceEditor
  - RuntimeInspector
  - BottomEvidenceDrawer.TraceTable
forbiddenOverflow:
  - PageBody
  - RuntimeInspector
routeSuggestion: /playground/logix-react.pressure.trace-heavy
---

# Trace Heavy Evidence Drawer

## Intent

Prove that large trace evidence can be inspected without stealing the primary source and runtime feedback loop.

## Required Layout

- Bottom drawer defaults larger for Trace-heavy state, within the `45vh` max.
- Trace table owns vertical and horizontal scroll.
- Trace header stays sticky inside the Trace table.
- Runtime inspector remains readable while Trace is expanded.
- Trace rows use compact timestamp, operation id, phase, event kind and summary cells.

## Acceptance Assertions

- Scrolling through 1200 trace rows only scrolls `BottomEvidenceDrawer.TraceTable`.
- TopCommandBar, SourceEditor and RuntimeInspector remain visible.
- Horizontal trace table scrolling does not create page-level horizontal scroll.
- Tab strip remains visible after scrolling trace rows.
- New dispatch appends trace rows without jumping the active SourceEditor scroll position.

## Failure Modes

- Trace table increases page height.
- Trace column width creates document-level horizontal overflow.
- Bottom drawer covers the entire workbench at default desktop size.
- Runtime inspector becomes unreadable while Trace is active.
