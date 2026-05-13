---
id: diagnostics-dense
title: Dense Check Trial Diagnostics
spec: 166-playground-driver-scenario-surface
sourceImage: ../assets/playground-variants/04-diagnostics-dense.png
viewport:
  min: "1366x768"
  target: "1440x900"
activeInspectorTab: Diagnostics
activeBottomTab: Diagnostics
dataProfile:
  realAuthorities: 2
  projectedReportFields: 5
  minimumRowsAfterCheckTrial: 2
scrollOwners:
  - BottomEvidenceDrawer.DiagnosticsTable
  - RuntimeInspector.DiagnosticsSummary
stickyRegions:
  - DiagnosticsSummary.Counters
  - DiagnosticsTable.Header
  - BottomEvidenceDrawer.TabStrip
requiredVisibleRegions:
  - TopCommandBar
  - SourceEditor
  - RuntimeInspector.DiagnosticsSummary
  - BottomEvidenceDrawer.DiagnosticsTable
  - RunCheckTrialStatus
forbiddenOverflow:
  - PageBody
  - SourceEditor
routeSuggestion: /playground/logix-react.pressure.diagnostics-dense
---

# Dense Check Trial Diagnostics

## Intent

Prove that many Check and Trial findings stay readable while command status, summary counters and source context remain visible.

The diagnostics surface must not fabricate Runtime-looking rows. Rows in the Runtime inspector and bottom Diagnostics tab come only from current `Runtime.check` and `Runtime.trial(mode="startup")` control-plane reports. Focused demo routes under `examples/logix-react/src/playground/projects/diagnostics/` cover different real failure classes.

## Required Layout

- Runtime inspector shows a compact Diagnostics summary with counters and latest command status.
- Bottom Diagnostics tab owns the detailed table.
- Diagnostics table supports severity, source path, message, authority and evidence columns sourced from real Check/Trial reports.
- Diagnostics header stays sticky in the table.
- Source editor remains visible for jump-to-source flows.

## Acceptance Assertions

- Running Check and Trial updates the summary without replacing Run result.
- Initial diagnostics-dense state may be empty, but it must show a bounded empty state instead of synthetic Runtime rows.
- After Check and Trial run on the pressure route, detail rows include `runtime.check/static` and `runtime.trial/startup`.
- Focused diagnostics demo routes show real Runtime codes such as `PROGRAM_IMPORT_INVALID`, `PROGRAM_IMPORT_DUPLICATE` and `MissingDependency`.
- Scrolling detail rows only scrolls `BottomEvidenceDrawer.DiagnosticsTable`.
- Severity counters remain visible when detail rows scroll.
- Long diagnostic messages clamp or wrap inside the table row without overlapping adjacent columns.
- Selecting a diagnostic can change active source location without collapsing the drawer.

## Failure Modes

- Diagnostics detail becomes an unbounded pre block.
- Check and Trial outputs are mixed into Run result.
- Synthetic codes such as `LC-0001` or `Pressure diagnostic` appear as Runtime authority.
- Summary counters disappear after scrolling details.
- Dense messages push SourceEditor or RuntimeInspector out of view.
