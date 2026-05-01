---
id: state-large
title: Large Nested State Projection
spec: 166-playground-driver-scenario-surface
sourceImage: ../assets/playground-variants/02-state-large.png
viewport:
  min: "1366x768"
  target: "1440x900"
activeInspectorTab: State
activeBottomTab: Snapshot
dataProfile:
  stateNodes: 420
  maxDepth: 9
  expandedNodes: 120
  actions: 12
scrollOwners:
  - RuntimeInspector.StateTree
stickyRegions:
  - RuntimeInspector.OperationSummary
  - RuntimeInspector.ActionsSummary
  - BottomEvidenceDrawer.TabStrip
requiredVisibleRegions:
  - TopCommandBar
  - FilesPanel
  - SourceEditor
  - RuntimeInspector.OperationSummary
  - RuntimeInspector.StateTree
  - RuntimeInspector.ActionsSummary
  - BottomEvidenceDrawer
forbiddenOverflow:
  - PageBody
  - SourceEditor
routeSuggestion: /playground/logix-react.pressure.state-large
---

# Large Nested State Projection

## Intent

Prove that deep state inspection stays readable while action access and operation context remain visible.

## Required Layout

- Runtime inspector prioritizes operation summary, state summary and state tree.
- State tree owns vertical scroll and supports indentation without forcing page-level horizontal scroll.
- Actions summary remains visible as a compact command lane or collapsible section.
- Snapshot tab in the bottom drawer can show state diff or digest without duplicating the full state tree.

## Acceptance Assertions

- Expanding nested state nodes only scrolls `RuntimeInspector.StateTree`.
- Operation summary remains visible after scrolling to the deepest expanded node.
- Long object keys and values truncate or wrap inside the state tree lane without overlapping icons.
- Actions remain reachable through summary controls or a stable tab switch.
- Snapshot drawer content scrolls independently from State tree.

## Failure Modes

- Deep state pushes action controls out of the inspector.
- State indentation creates horizontal page overflow.
- Snapshot drawer duplicates unbounded state and makes the page scroll.
- Operation id disappears during state inspection.
