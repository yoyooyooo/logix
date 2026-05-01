---
id: action-dense
title: Action Dense Program
spec: 166-playground-driver-scenario-surface
sourceImage: ../assets/playground-variants/01-action-dense.png
viewport:
  min: "1366x768"
  target: "1440x900"
activeInspectorTab: Actions
activeBottomTab: Console
dataProfile:
  actions: 74
  actionGroups: 9
  stateNodes: 18
  consoleRows: 24
scrollOwners:
  - RuntimeInspector.ActionsList
stickyRegions:
  - RuntimeInspector.StateSummary
  - RuntimeInspector.ActionsToolbar
  - BottomEvidenceDrawer.TabStrip
requiredVisibleRegions:
  - TopCommandBar
  - FilesPanel
  - SourceEditor
  - RuntimeInspector.StateSummary
  - RuntimeInspector.ActionsList
  - BottomEvidenceDrawer
forbiddenOverflow:
  - PageBody
  - BottomEvidenceDrawer
routeSuggestion: /playground/logix-react.pressure.action-dense
---

# Action Dense Program

## Intent

Prove that a large reflected action manifest stays usable without hiding current state or pushing logs off screen.

## Required Layout

- Runtime inspector shows a compact State summary above or beside the Actions lane.
- Actions lane has search/filter, group labels and operation status near the top.
- Action rows are compact and stable height.
- State summary and Actions toolbar stay visible while `RuntimeInspector.ActionsList` scrolls.
- Bottom Console remains bounded and does not resize when action count changes.

## Acceptance Assertions

- At default desktop size, at least the current state summary and first ten actions are visible.
- Scrolling actions does not move TopCommandBar, State summary or Bottom tab strip.
- Dispatching one visible action updates Last operation and Console without changing layout dimensions.
- Long action names truncate without overlapping payload badges or dispatch buttons.
- Raw dispatch remains collapsed in advanced UI.

## Failure Modes

- Whole page scrolls because the action list is unbounded.
- State becomes hidden behind a small nested scroll area.
- Action rows wrap unpredictably and shift neighboring rows.
- Bottom drawer height changes when action logs append.
