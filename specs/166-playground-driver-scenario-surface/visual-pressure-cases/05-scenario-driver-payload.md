---
id: scenario-driver-payload
title: Scenario Driver Payload Workbench
spec: 166-playground-driver-scenario-surface
sourceImage: ../assets/playground-variants/05-scenario-driver-payload.png
viewport:
  min: "1366x768"
  target: "1440x900"
activeInspectorTab: Drivers
activeBottomTab: Scenario
dataProfile:
  drivers: 18
  scenarioSteps: 24
  payloadBytes: 8500
  payloadExamples: 6
scrollOwners:
  - RuntimeInspector.DriverList
  - RuntimeInspector.DriverPayloadEditor
  - BottomEvidenceDrawer.ScenarioStepList
stickyRegions:
  - DriverToolbar
  - DriverPayloadHeader
  - ScenarioStepList.Header
  - BottomEvidenceDrawer.TabStrip
requiredVisibleRegions:
  - TopCommandBar
  - SourceEditor
  - RuntimeInspector.DriverList
  - RuntimeInspector.DriverPayloadEditor
  - BottomEvidenceDrawer.ScenarioStepList
  - RuntimeInspector.StateSummary
forbiddenOverflow:
  - PageBody
  - SourceEditor
routeSuggestion: /playground/logix-react.pressure.scenario-driver-payload
---

# Scenario Driver Payload Workbench

## Intent

Prove that no-UI demos can expose curated business interactions, editable payloads and scenario playback without relying on preview rendering.

## Required Layout

- Runtime inspector has a Driver lane with driver list, selected driver summary and payload editor.
- Payload editor uses Monaco JSON mode and owns its own scroll.
- Scenario step list is visible in the bottom drawer or inspector lane and owns step scrolling.
- State summary remains visible so users can compare payload execution with runtime result.
- Raw dispatch remains collapsed advanced UI.

## Acceptance Assertions

- Selecting a driver changes payload editor content without changing SourceEditor active model.
- Large payload scrolls inside `RuntimeInspector.DriverPayloadEditor`.
- Running a driver updates state/result/log/trace through the same Program session.
- Running a scenario step updates per-step status without hiding driver controls.
- Scenario failure appears as product failure and does not rewrite Check/Trial verdict.

## Failure Modes

- Payload editor consumes the entire inspector and hides state.
- Scenario step list causes the page to scroll.
- Driver controls appear in TopCommandBar as host commands.
- Raw dispatch becomes the default path for docs readers.
