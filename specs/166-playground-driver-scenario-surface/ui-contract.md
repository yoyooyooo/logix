---
id: playground-ui-contract
spec: 166-playground-driver-scenario-surface
title: Professional Logic Playground UI Contract
status: planned
owner: packages/logix-playground
host: examples/logix-react
minimumViewport: "1366x768"
targetViewport: "1440x900"
sourceImages:
  - ./assets/playground-variants/01-action-dense.png
  - ./assets/playground-variants/02-state-large.png
  - ./assets/playground-variants/03-trace-heavy.png
  - ./assets/playground-variants/04-diagnostics-dense.png
  - ./assets/playground-variants/05-scenario-driver-payload.png
pressureCases:
  - ./visual-pressure-cases/01-action-dense.md
  - ./visual-pressure-cases/02-state-large.md
  - ./visual-pressure-cases/03-trace-heavy.md
  - ./visual-pressure-cases/04-diagnostics-dense.md
  - ./visual-pressure-cases/05-scenario-driver-payload.md
---

# Professional Logic Playground UI Contract

This document converts the five generated visual pressure mockups into implementation constraints for 166. The images define density, hierarchy, scroll ownership and resize behavior. Implementation may use local component primitives, but it must preserve these contracts.

## Authority

This contract governs `packages/logix-playground` visible workbench UI and `examples/logix-react` dogfood routes.

It does not define Runtime public API, Runtime Workbench Kernel truth inputs, Monaco type bundle shape, Driver/Scenario authoring API, preview adapter API or sandbox transport API.

## Visual Alignment Closure Notice

The five source images and Markdown pressure cases remain the acceptance authority for density, hierarchy, default tabs, scroll ownership and data-surface shape.

A 2026-04-29 review found that the earlier implementation satisfied only a weak executable subset: stable shell regions, coarse non-overlap and page overflow containment. That review is retained in [notes/visual-alignment-gap-analysis.md](./notes/visual-alignment-gap-analysis.md) as the Phase 11 reopening evidence.

Phase 11 closure now requires and verifies the visible pressure contract: single top workbench header, pressure-specific inspector and bottom defaults, materialized action/state/trace/diagnostic/driver/scenario data, strict local overflow owners, dark Monaco source surface and refreshed `1366x768` screenshots under [notes/current-screenshots/](./notes/current-screenshots/).

## Shell Contract

Required desktop shell:

```text
TopCommandBar
ResizableBody
  FilesPanel | SourceEditor | RuntimeInspector
BottomEvidenceDrawer
```

Desktop constraints:

| Region | Default | Min | Max | Resize | Scroll Owner |
| --- | ---: | ---: | ---: | --- | --- |
| TopCommandBar | 44px | 40px | 48px | fixed | none |
| FilesPanel | 220px | 160px | 320px | horizontal | `FilesPanel.FileTree` |
| SourceEditor | flex | 480px | flex | horizontal | Monaco editor model |
| RuntimeInspector | 380px | 320px | 520px | horizontal | selected inspector pane |
| BottomEvidenceDrawer | 240px | 44px | 45vh | vertical | selected bottom tab |

Resize implementation requirements:

- Files, Runtime inspector and Bottom evidence drawer resizing must be backed by actual interactive panel primitives, currently `react-resizable-panels` in `packages/logix-playground`.
- Resize handles must be accessible `separator` controls named `Resize files panel`, `Resize runtime inspector` and `Resize bottom drawer`.
- Dragging a handle must update `PlaygroundWorkbenchProgram.layout` through `resizeWorkbenchLayout`; visual-only CSS grid changes are insufficient.
- The executable browser contract must drag all three handles and verify the corresponding region size changes without page overflow or region overlap.

Viewport rules:

- At `1366x768`, the page body must not own vertical scrolling.
- Source editor remains the largest horizontal region by default.
- Runtime inspector remains visible at default desktop size.
- Bottom drawer can be minimized to a tab strip and restored without losing selected tab.
- Files panel can collapse to an icon rail or compact file switcher.
- Text must not overlap or resize the shell when badges, counters or long file names appear.

## Region Contracts

### TopCommandBar

Visible content:

- product label: `Logix Playground`
- project id
- active file path or program entry
- source revision
- session status
- host commands: `Run`, `Check`, `Trial`, `Reset`

Rules:

- Host commands must show running, disabled or failed state.
- Disabled commands must expose a visible reason through tooltip, inline status or status lane.
- Top bar must stay fixed while inner regions scroll.
- Top bar must never contain business Driver/Scenario controls.

### FilesPanel

Visible content:

- virtual project files
- selected active file
- file role groups for program, logic, service, fixture and preview
- dirty indicator when current source differs from registry source

Rules:

- File tree owns its own vertical scroll.
- Long paths truncate in the middle or end and keep tooltip/title access.
- Driver and Scenario metadata do not appear as runtime source files by default.

### SourceEditor

Visible content:

- Monaco editor
- line numbers
- active model path
- editable/read-only status
- editor language-service status when degraded

Rules:

- Monaco owns source scrolling.
- Monaco models are keyed by `ProjectSnapshot.files` virtual paths.
- Editor fallback may appear only with bounded status.
- Source editing must not create page-level overflow.

### RuntimeInspector

Default sections:

- State summary and tree
- Actions or Drivers
- Last operation
- Run result
- Diagnostics summary

Rules:

- State and interaction controls must be comparable in the same inspector lane or adjacent inspector panes.
- State summary remains visible when State tree scrolls.
- Actions toolbar remains visible when long action lists scroll.
- Driver and Scenario controls may appear as inspector tabs or inspector sections, but their execution evidence still flows through state/result/log/trace/diagnostics.
- Raw dispatch is advanced-only and collapsed by default.

### BottomEvidenceDrawer

Tabs:

- Console
- Diagnostics
- Trace
- Snapshot
- Scenario, when scenario playback is active

Rules:

- Selected tab state must be observable in DOM and visual style.
- Drawer tab strip remains visible when tab content scrolls.
- Trace and Diagnostics tables own their own horizontal and vertical scroll.
- Drawer minimization must preserve pending error badges and tab counts.

## Scroll Ownership Matrix

| Pressure | Required Scroll Owner | Sticky Regions | Forbidden Overflow |
| --- | --- | --- | --- |
| 70+ reflected actions | `RuntimeInspector.ActionsList` | `RuntimeInspector.StateSummary`, `RuntimeInspector.ActionsToolbar` | `PageBody`, `BottomEvidenceDrawer` |
| deeply nested state | `RuntimeInspector.StateTree` | `RuntimeInspector.OperationSummary`, `RuntimeInspector.ActionsSummary` | `PageBody`, `SourceEditor` |
| 1200+ trace events | `BottomEvidenceDrawer.TraceTable` | `BottomEvidenceDrawer.TabStrip`, `TraceTable.Header` | `PageBody`, `RuntimeInspector` |
| real Check/Trial diagnostics | `BottomEvidenceDrawer.DiagnosticsTable` | `DiagnosticsSummary`, `DiagnosticsTable.Header` | `PageBody`, `SourceEditor` |
| large driver payload | `RuntimeInspector.DriverPayloadEditor` | `DriverToolbar`, `ScenarioStepList.Header` | `PageBody`, `SourceEditor` |
| many scenario steps | `RuntimeInspector.ScenarioStepList` or `BottomEvidenceDrawer.ScenarioStepList` | active scenario header | `PageBody`, `SourceEditor` |
| long file tree | `FilesPanel.FileTree` | Files header and search | `PageBody`, `SourceEditor` |

## Component Selectors For Acceptance

Implementations should expose stable test selectors or equivalent semantic roles:

```text
data-playground-region="top-command-bar"
data-playground-region="files-panel"
data-playground-region="source-editor"
data-playground-region="runtime-inspector"
data-playground-region="bottom-evidence-drawer"
data-playground-section="state"
data-playground-section="actions"
data-playground-section="drivers"
data-playground-section="scenario"
data-playground-section="run-result"
data-playground-section="diagnostics-summary"
data-playground-tab="console"
data-playground-tab="diagnostics"
data-playground-tab="trace"
data-playground-tab="snapshot"
```

The selector names are product-test contracts, not public API.

Selector scoping rules:

- Tests must scope repeated labels to their owning region before clicking or asserting. For example, bottom `Diagnostics` must be queried within `Workbench bottom console`, while inspector `Diagnostics` must be queried within `Runtime inspector`.
- `Advanced` raw dispatch controls live under the inspector `Action workbench`; tests must first select the inspector `Actions` tab, then query within that region.
- Global `getByRole` is allowed only when the accessible label is unique across the current rendered surface.
- When semantic roles are ambiguous, prefer the stable `data-playground-region`, `data-playground-section` and `data-playground-tab` contracts listed above.

## Pressure Case Index

| Case | Source | Primary Risk | Contract |
| --- | --- | --- | --- |
| Action Dense | [image](./assets/playground-variants/01-action-dense.png) | long reflected action manifest collapses state visibility | [01-action-dense.md](./visual-pressure-cases/01-action-dense.md) |
| State Large | [image](./assets/playground-variants/02-state-large.png) | deep state tree consumes inspector | [02-state-large.md](./visual-pressure-cases/02-state-large.md) |
| Trace Heavy | [image](./assets/playground-variants/03-trace-heavy.png) | trace evidence causes page overflow | [03-trace-heavy.md](./visual-pressure-cases/03-trace-heavy.md) |
| Diagnostics Dense | [image](./assets/playground-variants/04-diagnostics-dense.png) | Check/Trial details hide source and summary | [04-diagnostics-dense.md](./visual-pressure-cases/04-diagnostics-dense.md) |
| Scenario Driver Payload | [image](./assets/playground-variants/05-scenario-driver-payload.png) | no-UI demo controls compete with payload editing | [05-scenario-driver-payload.md](./visual-pressure-cases/05-scenario-driver-payload.md) |

## Browser Acceptance Contract

The dogfood host should provide deterministic pressure fixtures through project ids, query fixtures or dev-only registry entries. Suggested routes:

```text
/playground/logix-react.pressure.action-dense
/playground/logix-react.pressure.state-large
/playground/logix-react.pressure.trace-heavy
/playground/logix-react.pressure.diagnostics-dense
/playground/logix-react.pressure.scenario-driver-payload
```

Acceptance assertions:

- At `1366x768`, `document.scrollingElement.scrollHeight <= window.innerHeight + 1`.
- The five required regions are visible and non-overlapping.
- The three resize handles are visible semantic separators and dragging them changes Files width, Runtime inspector width and Bottom drawer height.
- The declared scroll owner has overflow when the pressure data exceeds the viewport.
- Diagnostics rows labeled `runtime.check/*` or `runtime.trial/*` must come from real control-plane reports. Empty state is valid before Check/Trial run; synthetic Runtime-looking rows are forbidden.
- Forbidden overflow regions do not scroll.
- Sticky regions remain visible after scrolling their owner.
- Bottom tabs change selected state and visible content.
- No text overlaps command buttons, status badges, file names, counters or tab labels.

## Mobile Contract

Mobile can collapse the shell into view tabs:

```text
TopCommandBar
Tabs: Source | Result | Diagnostics | Console
```

Rules:

- Host commands remain reachable.
- Source remains the first reading path.
- Runtime feedback remains available without preview.
- Bottom evidence content moves behind tabs or drawer affordance.
- Pressure cases may require reduced density, but they must not create horizontal page overflow.

## Implementation Boundary

The UI contract can drive layout components, CSS constraints, test fixtures and browser assertions. It must not add new Runtime roots, new sandbox product API, new core reflection schema or docs-only fake runtime output.
