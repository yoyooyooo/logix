# Visual Alignment Gap Analysis

**Date**: 2026-04-29
**Scope**: `packages/logix-playground` visible workbench UI and `examples/logix-react` five pressure routes.
**Status**: closed for Phase 11 executable pressure contract; retained as historical gap evidence

## Review Basis

This note records a post-implementation visual review against the 166 visual pressure assets and contracts:

- [ui-contract.md](../ui-contract.md)
- [assets/playground-variants/README.md](../assets/playground-variants/README.md)
- [visual-pressure-cases/01-action-dense.md](../visual-pressure-cases/01-action-dense.md)
- [visual-pressure-cases/02-state-large.md](../visual-pressure-cases/02-state-large.md)
- [visual-pressure-cases/03-trace-heavy.md](../visual-pressure-cases/03-trace-heavy.md)
- [visual-pressure-cases/04-diagnostics-dense.md](../visual-pressure-cases/04-diagnostics-dense.md)
- [visual-pressure-cases/05-scenario-driver-payload.md](../visual-pressure-cases/05-scenario-driver-payload.md)

Review inputs:

- original PNG mockups viewed at source resolution
- live `http://localhost:5173/playground/logix-react.pressure.*` routes at `1366x768`
- Playwright DOM measurements for shell regions and pressure route defaults
- current source implementation under `packages/logix-playground` and `examples/logix-react/src/playground/projects/pressure`

## Expected Target

The expected 166 desktop workbench remains the original contract:

```text
TopCommandBar
ResizableBody
  FilesPanel | SourceEditor | RuntimeInspector
BottomEvidenceDrawer
```

Concrete expectations:

- The workbench starts at the viewport top. The command bar is the single product header.
- At `1366x768`, the source editor remains the largest working region.
- The runtime inspector remains visible and changes emphasis by pressure case: State, Actions, Drivers, Result or Diagnostics.
- The bottom evidence drawer is bounded, resizable and defaults to the pressure case tab when the fixture declares one.
- Each pressure fixture materializes the data profile declared in its Markdown contract, not only metadata.
- Long data surfaces own local scroll and keep their sticky toolbar, summary or table header visible.
- UI density matches an engineering workbench: compact toolbar buttons, tab strips, lists and tables, with minimal nested cards.

## 2026-04-29 Phase 11 Closure Update

The gap table below records the implementation state that reopened Phase 11. The landed Phase 11 implementation closes the executable pressure contract for VG-001 through VG-010:

- the normal route now uses the workbench command bar as the single top header
- default desktop geometry is measured at `1366x768` with no page-level overflow
- pressure metadata selects the expected inspector tab and bottom tab
- action, state, trace, diagnostics, driver payload and scenario data profiles are visible
- pressure surfaces own local overflow and the direct Playwright contract requires real overflow for stressed lists and tables
- refreshed screenshots live under [current-screenshots/](./current-screenshots/)

Residual work, if pursued, is pixel-level polish against the generated PNG assets: exact iconography, spacing, borders, color tone and density tuning. The current executable contract covers the functional visual pressure requirements that previously drifted.

## Original Finding That Reopened Phase 11

The pre-Phase-11 implementation followed part of the structural contract: it exposed the five stable regions and prevented page-level vertical overflow in the direct Playwright contract.

It did not follow the visual pressure contract. The earlier closure accepted region presence, coarse non-overlap and overflow containment. It did not verify design proportions, pressure-specific active tabs, materialized pressure data, sticky regions, table/list shape, or the single top command bar requirement.

This explains the mismatch: the visual pressure cases were written, but the implemented tests narrowed them into selectors and scroll containment. The five source images and Markdown pressure cases stayed stronger than the executable acceptance gate.

## Gap Table

| ID | Area | Expected | Current Observation | Likely Cause |
| --- | --- | --- | --- | --- |
| VG-001 | Top shell | A single `TopCommandBar` at viewport top with `Logix Playground`, project id, revision, session status and host commands | `PlaygroundPage` renders an outer product header of about 113px, then workbench starts around `y=125` | `Playground.tsx` kept a route-level title/header after the workbench command bar was introduced |
| VG-002 | Vertical proportions | Workbench consumes the full viewport; source and runtime body have the dominant vertical space | At `1366x768`, workbench is about `631px` high, body rows about `345px`, state/actions about `173px` each | Outer header plus fixed `bottomHeight=240` leaves too little space for main work |
| VG-003 | Runtime inspector model | Inspector has pressure-aware tabs or lanes for State, Actions, Drivers, Result and Diagnostics | Inspector is fixed as two equal vertical regions: State and Action workbench | `activeInspectorTab` exists in state but is not consumed by `RuntimeInspector` rendering |
| VG-004 | Pressure defaults | Each pressure route opens with its declared `activeInspectorTab` and `activeBottomTab` | All five reviewed routes opened on bottom `Console`; inspector stayed on the same State/Actions split | Pressure metadata is registered but does not initialize workbench UI state |
| VG-005 | Pressure data | Data profiles drive actual visible surfaces: 420 state nodes, 1200 trace rows, 64 diagnostics, drivers, payloads and scenario steps | Pressure projects mainly generate N `Schema.Void` actions and simple initial state; reviewed routes showed `null` session state until execution | `definePressureProject` materializes only action count and source text, while other profile fields remain metadata |
| VG-006 | Action dense | Actions lane has search, filters, group labels/chips, compact stable rows and visible state summary | Actions render as nested cards with fallback gap text at the top and `Dispatch` buttons per card; no search or grouping | `ActionManifestPanel` implemented functional MVP list, not the dense action workbench from the mockup |
| VG-007 | State large | State tree owns scroll with operation summary and actions summary sticky or always reachable | State region contains session and program cards, with a JSON pre block that shows `null` in the reviewed pressure route | Pressure state is not seeded or projected into a tree component; state summary and tree are not separated |
| VG-008 | Trace heavy | Bottom drawer defaults to Trace and shows a compact table with sticky header and horizontal plus vertical local scroll | Route opened on Console; Trace content is generic projection text when manually selected | Trace-heavy fixture metadata is not converted into trace rows or default tab state |
| VG-009 | Diagnostics dense | Runtime inspector shows diagnostic counters/status; bottom Diagnostics shows a detail table with severity, source, message, authority and evidence | Route opened on Console; current Diagnostics lane uses summary cards and report detail, not the dense table from the asset | Diagnostics pressure rows are not seeded; acceptance only checked drawer containment after clicking the tab |
| VG-010 | Scenario driver payload | Drivers lane includes selected driver summary, Monaco JSON payload editor and scenario step list | Reviewed route had no `drivers` or `scenario` section because the pressure project declares no drivers or scenarios | Scenario-driver pressure fixture records expected profile only as metadata |
| VG-011 | Visual hierarchy | Compact professional workbench with subtle separators, tabs, toolbar icons and bounded repeated rows | Current UI has a landing-like outer header, secondary pill labels, nested panels and many card borders | Component MVP leaned on generic card grouping instead of the mockup's workstation hierarchy |
| VG-012 | Acceptance strength | Browser contract asserts visual pressure intent, declared active tabs, data counts, sticky regions and surface shape | Direct Playwright contract covers shell regions, positive boxes, no page overflow and local scroll owner existence | T113-T116 were too coarse to preserve the source images as acceptance assets |

## Pressure Case Specific Expected Closure

### Action Dense

Expected:

- active inspector emphasis: Actions
- visible state summary stays above or beside actions
- actions toolbar includes search/filter/group controls and remains sticky
- first ten actions visible at default desktop size
- long names truncate without moving payload badges or run buttons

Current gap:

- no search/filter/group toolbar
- action rows are card-like and vertically expensive
- fallback evidence gap consumes prime action area
- state summary and actions each get only half of the already reduced inspector height

### State Large

Expected:

- active inspector emphasis: State
- operation summary remains visible during deep state scrolling
- state tree owns local scroll and supports deep indentation without page overflow
- actions stay reachable through compact summary controls
- bottom Snapshot defaults active and scrolls independently

Current gap:

- no state tree surface
- no pressure state profile materialization
- Snapshot is not selected by default
- operation context is mixed into session/program cards

### Trace Heavy

Expected:

- bottom drawer defaults active on Trace
- trace table contains many rows and owns horizontal plus vertical scroll
- trace table header stays sticky
- source editor and runtime inspector remain visible while trace is expanded

Current gap:

- Console opens by default
- no materialized 1200-row trace table
- current Trace lane is generic evidence text, not a tabular evidence surface

### Diagnostics Dense

Expected:

- active inspector emphasis: Diagnostics
- command status and severity counters stay visible
- bottom Diagnostics detail is a dense table with stable columns
- long messages clamp or wrap inside cells

Current gap:

- Console opens by default
- no seeded diagnostic rows
- diagnostics summary/detail uses cards and report snippets rather than the dense table contract

### Scenario Driver Payload

Expected:

- active inspector emphasis: Drivers
- bottom drawer defaults active on Scenario
- driver list, selected driver details and Monaco JSON payload editor are visible
- scenario step list shows status and owns scroll
- raw dispatch stays collapsed

Current gap:

- pressure route has no driver metadata and no scenario metadata
- no selected driver payload editor
- no scenario step list
- route falls back to ordinary Action workbench

## Why The Previous Implementation Could Pass

The previous task closure treated pressure fixtures as route availability plus metadata and treated browser acceptance as layout containment:

- T108 through T112 added five deterministic pressure project ids and profile metadata.
- T113 through T115 tested stable regions, forbidden page overflow and coarse local scroll ownership.
- The direct Playwright contract did not assert source-image proportions, default tabs, pressure profile counts, sticky headers, table columns, or driver/scenario payload surfaces.
- `assertScrollable` accepted `scrollHeight >= clientHeight`, which allows equality and does not prove real overflow.
- The tests did not fail when `activeBottomTab` metadata was ignored.
- The tests did not fail when non-action pressure profiles stayed metadata-only.

The result is an implementation that satisfies the weakest executable subset while missing the visible behavior documented in the five pressure cases.

## Required Follow-up Acceptance

The next visual alignment slice should not close until all items below pass:

- No outer route header exists on normal Playground routes; the workbench command bar is the first visible header.
- At `1366x768`, Playwright asserts approximate region geometry: top command bar around `44px`, source editor largest horizontal region, runtime inspector visible, bottom drawer bounded.
- Pressure fixture metadata initializes default inspector tab and bottom tab.
- Each pressure route materializes its declared data profile into the visible UI.
- Action Dense asserts search/filter/group toolbar, compact action rows and at least ten visible action rows.
- State Large asserts state tree data, sticky operation summary and independent Snapshot scroll.
- Trace Heavy asserts Trace tab active by default, table rows present, sticky table header and horizontal local scroll.
- Diagnostics Dense asserts Diagnostics tab active by default, severity counters and diagnostic table rows.
- Scenario Driver Payload asserts drivers, Monaco JSON payload editor and scenario step rows.
- Browser contract asserts sticky regions after scrolling their declared owner.
- Screenshot or DOM-geometry checks compare against the visual pressure assets at `1366x768` and optionally `1440x900`.

## Boundary

This is a Playground product UI gap. It does not require adding new Runtime roots, new public Driver/Scenario authoring APIs, new sandbox product APIs or fake runtime output. Pressure fixture data may be deterministic product/test fixture data, but it must be visibly represented in the workbench surfaces it is meant to stress.
